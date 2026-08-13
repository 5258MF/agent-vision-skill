#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const API_URL = "https://opencode.ai/zen/v1/chat/completions";
const MODEL = "mimo-v2.5-free";
const USER_AGENT = "agent-vision/1.0.0";
const DEFAULT_PROMPT = "请详细描述这张图片，包括可见文字、主体、布局和不确定之处。";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_TOKENS = 2_048;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = Object.freeze([2_000, 5_000]);
const MAX_RETRY_AFTER_MS = 30_000;
const MAX_BASE64_CHARS = Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 4;

const MIME_TYPES = Object.freeze({
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
});

const DATA_MIME_TYPES = new Set(Object.values(MIME_TYPES));
const TRANSIENT_STATUS_CODES = new Set([408, 425]);

class VisionError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "VisionError";
    Object.assign(this, options);
  }
}

function usage() {
  return [
    "Usage:",
    "  node vision.js [--json] <image-path-or-url|data-url|-> [question]",
    "",
    "Examples:",
    '  node vision.js "./screenshot.png" "请提取报错信息"',
    '  node vision.js "https://example.com/image.png" "Describe this image"',
    '  node vision.js "data:image/png;base64,..." "读取图片中的文字"',
    '  cat image-data-url.txt | node vision.js - "分析这张图片"',
  ].join("\n");
}

function parseArgs(argv) {
  const positional = [];
  let json = false;

  for (const arg of argv) {
    if (arg === "--json") {
      json = true;
    } else if (arg === "--help" || arg === "-h") {
      return { help: true, json, imageSource: "", prompt: "" };
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  return {
    help: false,
    json,
    imageSource: positional[0] || "",
    prompt: positional.slice(1).join(" ") || DEFAULT_PROMPT,
  };
}

function isHttpUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isDataUrl(value) {
  return typeof value === "string" && /^data:/i.test(value);
}

function supportedMimeMessage() {
  return "Supported types: JPEG, PNG, GIF, WebP, BMP.";
}

function parseDataImageUrl(source) {
  if (typeof source !== "string") {
    throw new VisionError("Image data URL must be a string.", { code: "INVALID_DATA_URL" });
  }

  const match = /^data:([^;,]+);base64,(.*)$/is.exec(source);
  if (!match) {
    throw new VisionError(
      "Invalid image data URL. Expected data:image/<type>;base64,<data>.",
      { code: "INVALID_DATA_URL" }
    );
  }

  const declaredMime = match[1].trim().toLowerCase();
  const mimeType = declaredMime === "image/jpg" ? "image/jpeg" : declaredMime;
  if (!DATA_MIME_TYPES.has(mimeType)) {
    throw new VisionError(
      `Unsupported image MIME type "${declaredMime}". ${supportedMimeMessage()}`,
      { code: "UNSUPPORTED_IMAGE_TYPE" }
    );
  }

  const encoded = match[2].replace(/[\t\n\f\r ]/g, "");
  if (encoded.length > MAX_BASE64_CHARS) {
    throw new VisionError("Image exceeds the 10 MiB limit.", { code: "IMAGE_TOO_LARGE" });
  }
  if (
    !encoded ||
    encoded.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) ||
    encoded.indexOf("=") !== -1 && encoded.indexOf("=") < encoded.length - 2
  ) {
    throw new VisionError("Invalid Base64 image data.", { code: "INVALID_BASE64" });
  }

  const decoded = Buffer.from(encoded, "base64");
  const normalizedInput = encoded.replace(/=+$/, "");
  const normalizedDecoded = decoded.toString("base64").replace(/=+$/, "");
  if (!decoded.length || normalizedInput !== normalizedDecoded) {
    throw new VisionError("Invalid Base64 image data.", { code: "INVALID_BASE64" });
  }
  if (decoded.length > MAX_IMAGE_BYTES) {
    throw new VisionError("Image exceeds the 10 MiB limit.", { code: "IMAGE_TOO_LARGE" });
  }

  return {
    imageUrl: `data:${mimeType};base64,${decoded.toString("base64")}`,
    displaySource: `data:${mimeType};base64,[redacted]`,
  };
}

function readStdin(stream = process.stdin) {
  const maxEncodedBytes = MAX_BASE64_CHARS + 4_096;

  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let settled = false;

    const cleanup = () => {
      stream.off("data", onData);
      stream.off("end", onEnd);
      stream.off("error", onError);
      stream.off("aborted", onAborted);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const onData = (chunk) => {
      const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
      totalBytes += Buffer.byteLength(text);
      if (totalBytes > maxEncodedBytes) {
        fail(new VisionError("Image data from stdin exceeds the 10 MiB limit.", {
          code: "IMAGE_TOO_LARGE",
        }));
        if (typeof stream.destroy === "function") {
          stream.on("error", () => {});
          stream.destroy();
        }
        return;
      }
      chunks.push(text);
    };
    const onEnd = () => {
      if (settled) return;
      settled = true;
      cleanup();
      const data = chunks.join("").trim();
      if (!data) {
        reject(new VisionError("No image data was provided on stdin.", {
          code: "EMPTY_STDIN",
        }));
        return;
      }
      resolve(data);
    };
    const onError = (error) => fail(error);
    const onAborted = () => fail(new VisionError("Image data input was aborted.", {
      code: "STDIN_ABORTED",
    }));

    stream.on("data", onData);
    stream.once("end", onEnd);
    stream.once("error", onError);
    stream.once("aborted", onAborted);
  });
}

async function resolveImage(source, { stdin = process.stdin } = {}) {
  if (typeof source !== "string" || !source) {
    throw new VisionError("An image path, URL, data URL, or '-' is required.", {
      code: "MISSING_IMAGE",
    });
  }
  let input = source;
  if (source === "-") {
    input = await readStdin(stdin);
  }

  if (isDataUrl(input)) {
    return parseDataImageUrl(input);
  }
  if (isHttpUrl(input)) {
    return { imageUrl: input, displaySource: input };
  }

  const resolved = path.resolve(input);
  if (!fs.existsSync(resolved)) {
    throw new VisionError(`Image file does not exist: ${resolved}`, {
      code: "IMAGE_NOT_FOUND",
    });
  }

  const stat = fs.statSync(resolved);
  if (!stat.isFile()) {
    throw new VisionError(`Image source is not a file: ${resolved}`, {
      code: "IMAGE_NOT_FILE",
    });
  }
  if (stat.size === 0) {
    throw new VisionError(`Image file is empty: ${resolved}`, { code: "EMPTY_IMAGE" });
  }
  if (stat.size > MAX_IMAGE_BYTES) {
    throw new VisionError(`Image exceeds the 10 MiB limit: ${resolved}`, {
      code: "IMAGE_TOO_LARGE",
    });
  }

  const extension = path.extname(resolved).toLowerCase();
  const mimeType = MIME_TYPES[extension];
  if (!mimeType) {
    throw new VisionError(
      `Unsupported image type "${extension || "unknown"}". ${supportedMimeMessage()}`,
      { code: "UNSUPPORTED_IMAGE_TYPE" }
    );
  }

  const encoded = fs.readFileSync(resolved).toString("base64");
  return {
    imageUrl: `data:${mimeType};base64,${encoded}`,
    displaySource: resolved,
  };
}

function buildPayload(imageUrl, prompt) {
  return {
    model: MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: prompt },
        ],
      },
    ],
    stream: false,
    max_tokens: MAX_TOKENS,
  };
}

function extractText(response) {
  const choice = response?.choices?.[0];
  const content = choice?.message?.content;

  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part.text === "string") return part.text;
        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();
    if (text) return text;
  }

  const finishReason = choice?.finish_reason || "unknown";
  throw new VisionError(
    `The model returned no final text (finish_reason: ${finishReason}).`,
    { code: "EMPTY_MODEL_RESPONSE", retryable: true }
  );
}

function parseRetryAfter(value, now = Date.now()) {
  if (Array.isArray(value)) value = value[0];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return Math.max(0, Math.round(Number(trimmed) * 1_000));
  }

  const timestamp = Date.parse(trimmed);
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, timestamp - now);
}

function isTransientStatus(statusCode) {
  return TRANSIENT_STATUS_CODES.has(statusCode) || statusCode >= 500;
}

function isRetryableError(error) {
  if (!error) return false;
  if (error.statusCode === 429) {
    return Number.isFinite(error.retryAfterMs) && error.retryAfterMs <= MAX_RETRY_AFTER_MS;
  }
  if (isTransientStatus(error.statusCode)) return true;
  return error.retryable === true;
}

function retryDelay(error, attemptIndex) {
  if (error?.statusCode === 429 && Number.isFinite(error.retryAfterMs)) {
    return error.retryAfterMs;
  }
  return RETRY_DELAYS_MS[Math.min(attemptIndex, RETRY_DELAYS_MS.length - 1)];
}

function formatDelay(delayMs) {
  if (delayMs === 0) return "now";
  const seconds = delayMs / 1_000;
  return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)}s`;
}

function defaultRetryNotice({ attempt, maxAttempts, delayMs }) {
  console.error(
    `Agent Vision: temporary OpenCode Zen error; retrying (${attempt + 1}/${maxAttempts}) in ${formatDelay(delayMs)}.`
  );
}

function sleep(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function requestText(payload, {
  requestFn = postJson,
  sleepFn = sleep,
  onRetry = defaultRetryNotice,
} = {}) {
  let lastError;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await requestFn(payload);
      return extractText(response);
    } catch (error) {
      lastError = error;
      if (attempt >= MAX_ATTEMPTS - 1 || !isRetryableError(error)) {
        throw error;
      }

      const delayMs = retryDelay(error, attempt);
      onRetry({
        attempt,
        maxAttempts: MAX_ATTEMPTS,
        delayMs,
        error,
      });
      await sleepFn(delayMs);
    }
  }

  throw lastError || new VisionError("Unknown network or API error.");
}

function describeError(error) {
  if (error?.statusCode === 429 || error?.code === "RATE_LIMITED") {
    return "OpenCode Zen 免费服务当前受到限流或额度限制，请稍后重试。";
  }
  if (error?.code === "EMPTY_MODEL_RESPONSE") {
    return "OpenCode Zen 未返回可用文本，免费服务可能暂时不稳定，请稍后重试。";
  }
  if (error?.code === "INVALID_JSON") {
    return "OpenCode Zen 返回了无效响应，免费服务可能暂时不稳定，请稍后重试。";
  }
  if (error && typeof error.message === "string" && error.message.trim()) {
    return error.message.trim();
  }
  if (error && typeof error.code === "string" && error.code.trim()) {
    return `Network error: ${error.code}`;
  }
  const rendered = String(error || "").trim();
  return rendered || "Unknown network or API error.";
}

function postJson(payload, { apiUrl = API_URL } = {}) {
  const url = new URL(apiUrl);
  const body = JSON.stringify(payload);
  const transport = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const succeed = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const request = transport.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "User-Agent": USER_AGENT,
        },
      },
      (response) => {
        let data = "";
        response.setEncoding("utf8");
        response.on("aborted", () => {
          fail(new VisionError("OpenCode Zen response was aborted.", {
            code: "ECONNRESET",
            retryable: true,
          }));
        });
        response.on("error", (error) => {
          fail(new VisionError(
            `OpenCode Zen response error${error.code ? ` (${error.code})` : ""}.`,
            { code: error.code || "NETWORK_ERROR", retryable: true, cause: error }
          ));
        });
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          const statusCode = response.statusCode || 0;
          if (statusCode < 200 || statusCode >= 300) {
            const retryAfterMs = parseRetryAfter(response.headers["retry-after"]);
            const isRateLimited = statusCode === 429;
            const message = isRateLimited
              ? "OpenCode Zen HTTP 429: free usage limit reached."
              : `OpenCode Zen HTTP ${statusCode}.`;
            fail(new VisionError(message, {
              code: isRateLimited ? "RATE_LIMITED" : `HTTP_${statusCode}`,
              statusCode,
              retryAfterMs,
              retryable: isTransientStatus(statusCode),
            }));
            return;
          }

          try {
            succeed(JSON.parse(data));
          } catch {
            fail(new VisionError("OpenCode Zen returned invalid JSON.", {
              code: "INVALID_JSON",
              retryable: true,
            }));
          }
        });
      }
    );

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new VisionError(
        "OpenCode Zen request timed out after 120 seconds.",
        { code: "ETIMEDOUT", retryable: true }
      ));
    });
    request.on("error", (error) => {
      if (error instanceof VisionError) {
        fail(error);
      } else {
        fail(new VisionError(
          `OpenCode Zen network error${error.code ? ` (${error.code})` : ""}.`,
          { code: error.code || "NETWORK_ERROR", retryable: true, cause: error }
        ));
      }
    });
    request.write(body);
    request.end();
  });
}

async function analyzeImage(source, prompt, options = {}) {
  const { imageUrl, displaySource } = await resolveImage(source, options);
  const text = await requestText(buildPayload(imageUrl, prompt), options);
  return { source: displaySource, model: MODEL, text };
}

function writeLine(stream, value) {
  stream.write(`${value}\n`);
}

async function run(argv = process.argv.slice(2), {
  stdin = process.stdin,
  stdout = process.stdout,
  stderr = process.stderr,
  requestFn = postJson,
  sleepFn = sleep,
} = {}) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    writeLine(stderr, `Agent Vision error: ${describeError(error)}`);
    writeLine(stderr, usage());
    return 2;
  }

  if (args.help) {
    writeLine(stdout, usage());
    return 0;
  }
  if (!args.imageSource) {
    writeLine(stderr, usage());
    return 2;
  }

  try {
    const result = await analyzeImage(args.imageSource, args.prompt, {
      stdin,
      requestFn,
      sleepFn,
      onRetry: ({ attempt, maxAttempts, delayMs }) => {
        writeLine(
          stderr,
          `Agent Vision: temporary OpenCode Zen error; retrying (${attempt + 1}/${maxAttempts}) in ${formatDelay(delayMs)}.`
        );
      },
    });

    if (args.json) {
      writeLine(stdout, JSON.stringify({ ok: true, ...result }));
    } else {
      writeLine(stdout, result.text);
    }
    return 0;
  } catch (error) {
    const message = describeError(error);
    if (args.json) {
      writeLine(stderr, JSON.stringify({ ok: false, error: message }));
    } else {
      writeLine(stderr, `Agent Vision error: ${message}`);
    }
    return 1;
  }
}

async function main() {
  process.exitCode = await run();
}

module.exports = {
  API_URL,
  MODEL,
  DEFAULT_PROMPT,
  MAX_IMAGE_BYTES,
  MAX_ATTEMPTS,
  RETRY_DELAYS_MS,
  MAX_RETRY_AFTER_MS,
  VisionError,
  usage,
  parseArgs,
  isHttpUrl,
  parseDataImageUrl,
  readStdin,
  resolveImage,
  buildPayload,
  extractText,
  parseRetryAfter,
  isRetryableError,
  describeError,
  postJson,
  requestText,
  analyzeImage,
  run,
};

if (require.main === module) {
  main();
}
