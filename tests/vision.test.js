"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { Readable } = require("node:stream");
const test = require("node:test");

const vision = require("../skills/agent-vision/scripts/vision.js");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-vision-test-"));
const smallDataUrl = `data:image/png;base64,${Buffer.from("tiny image").toString("base64")}`;

test.after(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

function response(text) {
  return { choices: [{ message: { content: text } }] };
}

function outputCapture() {
  let value = "";
  return {
    stream: { write(chunk) { value += String(chunk); } },
    get text() { return value; },
  };
}

test("normal and --json modes build the same request", async () => {
  const payloads = [];
  const requestFn = async (payload) => {
    payloads.push(structuredClone(payload));
    return response("visible text");
  };
  const plainOut = outputCapture();
  const plainErr = outputCapture();
  const jsonOut = outputCapture();
  const jsonErr = outputCapture();

  assert.equal(await vision.run([smallDataUrl, "same question"], {
    stdout: plainOut.stream,
    stderr: plainErr.stream,
    requestFn,
    sleepFn: async () => {},
  }), 0);
  assert.equal(await vision.run(["--json", smallDataUrl, "same question"], {
    stdout: jsonOut.stream,
    stderr: jsonErr.stream,
    requestFn,
    sleepFn: async () => {},
  }), 0);

  assert.deepEqual(payloads[0], payloads[1]);
  assert.equal(plainOut.text, "visible text\n");
  assert.deepEqual(JSON.parse(jsonOut.text), {
    ok: true,
    source: "data:image/png;base64,[redacted]",
    model: vision.MODEL,
    text: "visible text",
  });
  assert.equal(plainErr.text, "");
  assert.equal(jsonErr.text, "");
});

test("resolves local paths, HTTP URLs, data URLs, and stdin data URLs", async () => {
  const localPath = path.join(tempDir, "sample.PNG");
  fs.writeFileSync(localPath, Buffer.from("not a real image, but a bounded fixture"));

  const local = await vision.resolveImage(localPath);
  assert.match(local.imageUrl, /^data:image\/png;base64,/);
  assert.equal(local.displaySource, localPath);

  const remote = await vision.resolveImage("https://example.com/image.png");
  assert.equal(remote.imageUrl, "https://example.com/image.png");

  const direct = await vision.resolveImage(smallDataUrl);
  assert.equal(direct.displaySource, "data:image/png;base64,[redacted]");
  assert.ok(!direct.displaySource.includes("dGlue"));

  const fromStdin = await vision.resolveImage("-", {
    stdin: Readable.from([smallDataUrl]),
  });
  assert.equal(fromStdin.imageUrl, direct.imageUrl);
});

test("rejects invalid data URLs, empty input, unsupported MIME, and oversized data", async () => {
  await assert.rejects(
    vision.resolveImage("data:text/plain;base64,aGVsbG8="),
    (error) => error.code === "UNSUPPORTED_IMAGE_TYPE"
  );
  await assert.rejects(
    vision.resolveImage("data:image/png;base64,not-valid!"),
    (error) => error.code === "INVALID_BASE64"
  );
  await assert.rejects(
    vision.resolveImage("data:image/png;base64,"),
    (error) => error.code === "INVALID_BASE64"
  );
  await assert.rejects(
    vision.resolveImage("-", { stdin: Readable.from([""]) }),
    (error) => error.code === "EMPTY_STDIN"
  );

  const oversized = `data:image/png;base64,${Buffer.alloc(vision.MAX_IMAGE_BYTES + 1, 1).toString("base64")}`;
  await assert.rejects(
    vision.resolveImage(oversized),
    (error) => error.code === "IMAGE_TOO_LARGE"
  );
});

test("empty responses retry after 2 and 5 seconds, then succeed", async () => {
  let calls = 0;
  const waits = [];
  const notices = [];
  const text = await vision.requestText(vision.buildPayload(smallDataUrl, "question"), {
    requestFn: async () => {
      calls += 1;
      return calls < 3 ? response("  ") : response("success");
    },
    sleepFn: async (delay) => waits.push(delay),
    onRetry: (notice) => notices.push(notice),
  });

  assert.equal(text, "success");
  assert.equal(calls, 3);
  assert.deepEqual(waits, [2_000, 5_000]);
  assert.deepEqual(notices.map((notice) => notice.attempt), [0, 1]);
});

test("continuous empty responses fail with a temporary-service message", async () => {
  let calls = 0;
  await assert.rejects(
    vision.requestText(vision.buildPayload(smallDataUrl, "question"), {
      requestFn: async () => {
        calls += 1;
        return response("");
      },
      sleepFn: async () => {},
      onRetry: () => {},
    }),
    (error) => {
      assert.equal(error.code, "EMPTY_MODEL_RESPONSE");
      assert.match(vision.describeError(error), /暂时不稳定/);
      assert.doesNotMatch(vision.describeError(error), /shorter prompt/i);
      return true;
    }
  );
  assert.equal(calls, 3);
});

test("retries 5xx, temporary network errors, and invalid JSON", async () => {
  const waits = [];
  let calls = 0;
  const text = await vision.requestText(vision.buildPayload(smallDataUrl, "question"), {
    requestFn: async () => {
      calls += 1;
      if (calls === 1) {
        throw new vision.VisionError("server unavailable", { statusCode: 503 });
      }
      if (calls === 2) {
        throw new vision.VisionError("bad response", { code: "INVALID_JSON", retryable: true });
      }
      return response("recovered");
    },
    sleepFn: async (delay) => waits.push(delay),
    onRetry: () => {},
  });

  assert.equal(text, "recovered");
  assert.deepEqual(waits, [2_000, 5_000]);

  let networkCalls = 0;
  const networkText = await vision.requestText(vision.buildPayload(smallDataUrl, "question"), {
    requestFn: async () => {
      networkCalls += 1;
      if (networkCalls === 1) {
        throw new vision.VisionError("connection reset", {
          code: "ECONNRESET",
          retryable: true,
        });
      }
      return response("network recovered");
    },
    sleepFn: async () => {},
    onRetry: () => {},
  });
  assert.equal(networkText, "network recovered");
  assert.equal(networkCalls, 2);
});

test("ordinary 4xx responses are not retried", async () => {
  let calls = 0;
  await assert.rejects(
    vision.requestText(vision.buildPayload(smallDataUrl, "question"), {
      requestFn: async () => {
        calls += 1;
        throw new vision.VisionError("bad request", { statusCode: 400 });
      },
      sleepFn: async () => assert.fail("unexpected retry"),
      onRetry: () => assert.fail("unexpected retry notice"),
    }),
    (error) => error.statusCode === 400
  );
  assert.equal(calls, 1);
});

test("429 retries only with a short Retry-After and otherwise gives a friendly error", async () => {
  let calls = 0;
  const waits = [];
  const text = await vision.requestText(vision.buildPayload(smallDataUrl, "question"), {
    requestFn: async () => {
      calls += 1;
      if (calls === 1) {
        throw new vision.VisionError("rate limited", {
          code: "RATE_LIMITED",
          statusCode: 429,
          retryAfterMs: 1_000,
        });
      }
      return response("after rate limit");
    },
    sleepFn: async (delay) => waits.push(delay),
    onRetry: () => {},
  });
  assert.equal(text, "after rate limit");
  assert.deepEqual(waits, [1_000]);

  calls = 0;
  await assert.rejects(
    vision.requestText(vision.buildPayload(smallDataUrl, "question"), {
      requestFn: async () => {
        calls += 1;
        throw new vision.VisionError("rate limited", {
          code: "RATE_LIMITED",
          statusCode: 429,
        });
      },
      sleepFn: async () => assert.fail("unexpected retry"),
      onRetry: () => assert.fail("unexpected retry notice"),
    }),
    (error) => {
      assert.match(vision.describeError(error), /限流或额度限制/);
      return true;
    }
  );
  assert.equal(calls, 1);
});

test("postJson parses a short Retry-After without exposing request data", async () => {
  const server = http.createServer((request, response) => {
    request.resume();
    response.writeHead(429, { "Retry-After": "1" });
    response.end("rate limited");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try {
    await assert.rejects(
      vision.postJson(vision.buildPayload(smallDataUrl, "question"), {
        apiUrl: `http://127.0.0.1:${address.port}/v1/chat/completions`,
      }),
      (error) => {
        assert.equal(error.statusCode, 429);
        assert.equal(error.retryAfterMs, 1_000);
        assert.equal(error.code, "RATE_LIMITED");
        assert.doesNotMatch(error.message, /dGlue/);
        return true;
      }
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("retry notices stay on stderr while normal stdout stays compatible", async () => {
  let calls = 0;
  const stdout = outputCapture();
  const stderr = outputCapture();
  const code = await vision.run([smallDataUrl, "question"], {
    stdout: stdout.stream,
    stderr: stderr.stream,
    requestFn: async () => {
      calls += 1;
      return calls === 1 ? response("") : response("final text");
    },
    sleepFn: async () => {},
  });

  assert.equal(code, 0);
  assert.equal(stdout.text, "final text\n");
  assert.match(stderr.text, /retrying/);
  assert.doesNotMatch(stdout.text, /retrying/);
});
