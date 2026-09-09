import { Readable } from "node:stream";
import path from "node:path";
import { NextResponse } from "next/server";
import { openStoredObject, statStoredObject } from "@/lib/storage";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

export function uploadKeyFromSegments(
  segments: string[] | undefined
): string | null {
  if (!segments?.length) return null;
  if (segments.some((part) => part === "" || part === "." || part === "..")) {
    return null;
  }
  const key = `uploads/${segments.map((part) => decodeURIComponent(part)).join("/")}`;
  if (key.includes("..")) return null;
  return key;
}

function mimeForKey(key: string, stored: string | null): string {
  if (stored) return stored;
  const ext = path.extname(key).replace(/^\./, "").toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

function parseByteRange(
  header: string | null,
  size: number
): { start: number; end: number } | "invalid" | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return "invalid";

  const [, startRaw, endRaw] = match;
  if (startRaw === "" && endRaw === "") return "invalid";

  if (startRaw === "") {
    const suffix = Number(endRaw);
    if (!Number.isFinite(suffix) || suffix <= 0) return "invalid";
    const start = Math.max(0, size - suffix);
    return { start, end: size - 1 };
  }

  const start = Number(startRaw);
  const end = endRaw === "" ? size - 1 : Number(endRaw);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    return "invalid";
  }

  return { start, end: Math.min(end, size - 1) };
}

function asWebStream(stream: Readable): ReadableStream<Uint8Array> {
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}

export async function serveStoredUpload(
  request: Request,
  segments: string[] | undefined,
  method: "GET" | "HEAD"
): Promise<NextResponse> {
  const key = uploadKeyFromSegments(segments);
  if (!key) return new NextResponse("Not found", { status: 404 });

  const info = await statStoredObject(key);
  if (!info) return new NextResponse("Not found", { status: 404 });

  const contentType = mimeForKey(key, info.contentType);
  const range = parseByteRange(request.headers.get("range"), info.size);

  if (range === "invalid") {
    return new NextResponse("Range Not Satisfiable", {
      status: 416,
      headers: {
        "Content-Range": `bytes */${info.size}`,
      },
    });
  }

  const headers = new Headers({
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  });

  if (range) {
    headers.set(
      "Content-Range",
      `bytes ${range.start}-${range.end}/${info.size}`
    );
    headers.set("Content-Length", String(range.end - range.start + 1));
  } else {
    headers.set("Content-Length", String(info.size));
  }

  if (method === "HEAD") {
    return new NextResponse(null, {
      status: range ? 206 : 200,
      headers,
    });
  }

  const body = await openStoredObject(key, range ?? undefined);
  if (!body) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(asWebStream(body), {
    status: range ? 206 : 200,
    headers,
  });
}
