import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  isObjectStorageConfigured,
  presignGetUrl,
  resolveLocalUploadPath,
} from "@/lib/storage";

export const runtime = "nodejs";

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

type Params = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, { params }: Params) {
  const { path: segments } = await params;
  if (!segments?.length) {
    return new NextResponse("Not found", { status: 404 });
  }

  const key = `uploads/${segments.map((part) => decodeURIComponent(part)).join("/")}`;
  if (
    key.includes("..") ||
    segments.some((part) => part === "" || part === "." || part === "..")
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (isObjectStorageConfigured()) {
    const url = await presignGetUrl(key);
    return NextResponse.redirect(url, 302);
  }

  const absolute = resolveLocalUploadPath(key);
  if (!absolute) return new NextResponse("Not found", { status: 404 });

  try {
    const body = await readFile(absolute);
    const ext = path.extname(key).replace(/^\./, "").toLowerCase();
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
