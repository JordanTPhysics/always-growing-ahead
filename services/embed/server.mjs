/**
 * Local embedding service for AGA search.
 * Model: Xenova/multilingual-e5-small (quantized, MIT).
 * Not part of the Next.js process. Plan on about 2 GB of RAM.
 */
import http from "node:http";
import { env, pipeline } from "@huggingface/transformers";

const MODEL = "Xenova/multilingual-e5-small";
const PORT = Number(process.env.PORT || 8000);
const HOST = "0.0.0.0";
const MAX_TEXTS = 16;
const MAX_CHARS = 8000;

env.cacheDir = process.env.HF_HOME || "/models";

/** @type {Awaited<ReturnType<typeof pipeline>> | null} */
let extractor = null;

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function withPrefix(text, kind) {
  const trimmed = text.trim();
  const prefix = kind === "query" ? "query: " : "passage: ";
  return trimmed.startsWith(prefix) ? trimmed : `${prefix}${trimmed}`;
}

async function embed(texts, kind) {
  const vectors = [];
  for (const text of texts) {
    const output = await extractor(withPrefix(text, kind), {
      pooling: "mean",
      normalize: true,
    });
    vectors.push(Array.from(output.data));
  }
  return vectors;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/health") {
      send(res, extractor ? 200 : 503, { ok: Boolean(extractor), model: MODEL });
      return;
    }
    if (req.method !== "POST" || url.pathname !== "/embed") {
      send(res, 404, { error: "not found" });
      return;
    }
    if (!extractor) {
      send(res, 503, { error: "model loading" });
      return;
    }
    const raw = await readBody(req, 1_000_000);
    const payload = JSON.parse(raw || "{}");
    const { texts, kind } = payload;
    if (
      (kind !== "query" && kind !== "passage") ||
      !Array.isArray(texts) ||
      texts.length === 0 ||
      texts.length > MAX_TEXTS
    ) {
      send(res, 400, { error: "expected { texts, kind: query|passage }" });
      return;
    }
    if (texts.some((text) => typeof text !== "string" || text.length > MAX_CHARS)) {
      send(res, 400, { error: "each text must be a string of at most 8000 characters" });
      return;
    }
    const vectors = await embed(texts, kind);
    send(res, 200, { model: MODEL, vectors });
  } catch (error) {
    console.error("[embed]", error);
    if (!res.headersSent) send(res, 500, { error: "embed failed" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[embed] listening on ${HOST}:${PORT}`);
});

extractor = await pipeline("feature-extraction", MODEL, { dtype: "q8" });
console.log(`[embed] loaded ${MODEL}`);
