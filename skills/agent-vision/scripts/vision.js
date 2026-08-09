#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const API_URL = "https://opencode.ai/zen/v1/chat/completions";
const MODEL = "mimo-v2.5-free";
const DEFAULT_PROMPT = "请详细描述这张图片，包括可见文字、主体、布局和不确定之处。";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_TOKENS = 2_048;

const MIME_TYPES = Object.freeze({
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
});

function usage() {
  return [
    "Usage:",
    "  node vision.js [--json] <image-path-or-url> [question]",
    "",
    "Examples:",
    '  node vision.js "./screenshot.png" "请提取报错信息"',
    '  node vision.js "https://example.com/image.png" "Describe this image"',
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
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function resolveImage(source) {
  if (isHttpUrl(source)) {
    return { imageUrl: source, displaySource: source };
  }

  const resolved = path.resolve(source);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Image file does not exist: ${resolved}`);
  }

  const stat = fs.statSync(resolved);
  if (!stat.isFile()) {
    throw new Error(`Image source is not a file: ${resolved}`);
  }
  if (stat.size === 0) {
    throw new Error(`Image file is empty: ${resolved}`);
  }
  if (stat.size > MAX_IMAGE_BYTES) {
    throw new Error(`Image exceeds the 10 MiB limit: ${resolved}`);
  }

  const extension = path.extname(resolved).toLowerCase();
  const mimeType = MIME_TYPES[extension];
  if (!mimeType) {
    throw new Error(
      `Unsupported image type "${extension || "unknown"}". ` +
      "Supported types: JPEG, PNG, GIF, WebP, BMP."
    );
  }

  const encoded = fs.readFileSync(resolved).toString("base64");
  return {
    imageUrl: `data:${mimeType};base64,${encoded}`,
    displaySource: resolved,
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
  throw new Error(
    `The model returned no final text (finish_reason: ${finishReason}). Try a shorter prompt.`
  );
}

function describeError(error) {
  if (error && typeof error.message === "string" && error.message.trim()) {
    return error.message.trim();
  }
  if (error && typeof error.code === "string" && error.code.trim()) {
    return `Network error: ${error.code}`;
  }
  const rendered = String(error || "").trim();
  return rendered || "Unknown network or API error.";
}

function postJson(payload) {
  const url = new URL(API_URL);
  const body = JSON.stringify(payload);
  const transport = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const request = transport.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "User-Agent": "agent-vision/1.0.0",
        },
      },
      (response) => {
        let data = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(
              new Error(`OpenCode Zen HTTP ${response.statusCode}: ${data.slice(0, 500)}`)
            );
            return;
          }

          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`OpenCode Zen returned invalid JSON: ${data.slice(0, 500)}`));
          }
        });
      }
    );

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error("OpenCode Zen request timed out after 120 seconds."));
    });
    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Agent Vision error: ${error.message}`);
    console.error(usage());
    process.exitCode = 2;
    return;
  }

  if (args.help) {
    console.log(usage());
    return;
  }
  if (!args.imageSource) {
    console.error(usage());
    process.exitCode = 2;
    return;
  }

  try {
    const { imageUrl, displaySource } = resolveImage(args.imageSource);
    const response = await postJson({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageUrl } },
            { type: "text", text: args.prompt },
          ],
        },
      ],
      stream: false,
      max_tokens: MAX_TOKENS,
    });
    const text = extractText(response);

    if (args.json) {
      console.log(JSON.stringify({
        ok: true,
        source: displaySource,
        model: MODEL,
        text,
      }));
    } else {
      console.log(text);
    }
  } catch (error) {
    const message = describeError(error);
    if (args.json) {
      console.error(JSON.stringify({ ok: false, error: message }));
    } else {
      console.error(`Agent Vision error: ${message}`);
    }
    process.exitCode = 1;
  }
}

main();
