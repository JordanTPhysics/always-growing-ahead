import { NextResponse } from "next/server";
import path from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { jsonError } from "@/lib/api/auth";
import { requireAdmin } from "@/lib/api/admin";
import {
  isObjectStorageConfigured,
  keyToStoredUrl,
  newUploadKey,
  putObjectStream,
  writeLocalUpload,
} from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 3600;

const PDF_MAX_BYTES = 100 * 1024 * 1024;
const VIDEO_MAX_BYTES = 2 * 1024 * 1024 * 1024;

type FileKind = "pdf" | "video";

type AllowedFile = {
  fileKind: FileKind;
  ext: string;
  maxBytes: number;
  mimeType: string;
};

const ALLOWED_MIMES: Record<string, AllowedFile> = {
  "application/pdf": {
    fileKind: "pdf",
    ext: "pdf",
    maxBytes: PDF_MAX_BYTES,
    mimeType: "application/pdf",
  },
  "application/x-pdf": {
    fileKind: "pdf",
    ext: "pdf",
    maxBytes: PDF_MAX_BYTES,
    mimeType: "application/pdf",
  },
  "video/mp4": {
    fileKind: "video",
    ext: "mp4",
    maxBytes: VIDEO_MAX_BYTES,
    mimeType: "video/mp4",
  },
  "video/webm": {
    fileKind: "video",
    ext: "webm",
    maxBytes: VIDEO_MAX_BYTES,
    mimeType: "video/webm",
  },
  "video/quicktime": {
    fileKind: "video",
    ext: "mov",
    maxBytes: VIDEO_MAX_BYTES,
    mimeType: "video/quicktime",
  },
};

const EXTENSIONS: Record<string, AllowedFile> = {
  pdf: ALLOWED_MIMES["application/pdf"],
  mp4: ALLOWED_MIMES["video/mp4"],
  webm: ALLOWED_MIMES["video/webm"],
  mov: ALLOWED_MIMES["video/quicktime"],
};

function resolveAllowedFile(
  fileName: string,
  contentType: string
): AllowedFile | null {
  const mime = contentType.trim().toLowerCase();
  if (mime && mime !== "application/octet-stream") {
    const byMime = ALLOWED_MIMES[mime];
    if (byMime) return byMime;
  }
  const ext = path.extname(fileName).replace(/^\./, "").toLowerCase();
  return EXTENSIONS[ext] ?? null;
}

function educationKeyForUser(userId: string, key: string): boolean {
  return (
    key.startsWith(`uploads/education/${userId}/`) &&
    !key.includes("..") &&
    key.split("/").length === 4
  );
}

function requestBodyStream(request: Request): Readable {
  if (!request.body) {
    throw new Error("Empty upload");
  }
  return Readable.fromWeb(
    request.body as unknown as NodeWebReadableStream
  );
}

/** JSON init: returns a same-origin PUT URL. The browser never talks to MinIO. */
export async function POST(request: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json().catch(() => null)) as {
    fileName?: unknown;
    contentType?: unknown;
    byteSize?: unknown;
  } | null;
  if (!body || typeof body.fileName !== "string") {
    return jsonError("Invalid upload");
  }

  const fileName = body.fileName.trim();
  const contentType =
    typeof body.contentType === "string" ? body.contentType : "";
  const byteSize = Number(body.byteSize);
  if (!fileName || !Number.isFinite(byteSize) || byteSize <= 0) {
    return jsonError("Invalid upload");
  }

  const allowed = resolveAllowedFile(fileName, contentType);
  if (!allowed) {
    return jsonError(
      "Unsupported file type. Use PDF, MP4, WebM, or QuickTime."
    );
  }

  if (byteSize > allowed.maxBytes) {
    const maxMb = Math.round(allowed.maxBytes / (1024 * 1024));
    return jsonError(
      `${allowed.fileKind === "pdf" ? "PDF" : "Video"} too large (max ${maxMb}MB)`
    );
  }

  const key = newUploadKey("education", session!.user.id, allowed.ext);
  return NextResponse.json({
    uploadUrl: `/api/admin/uploads?key=${encodeURIComponent(key)}`,
    url: keyToStoredUrl(key),
    fileName,
    mimeType: allowed.mimeType,
    byteSize,
    fileKind: allowed.fileKind,
  });
}

/** PUT the file. Streams to MinIO when S3 is configured, otherwise local disk. */
export async function PUT(request: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!educationKeyForUser(session!.user.id, key)) {
    return jsonError("Invalid upload key");
  }

  const ext = path.extname(key).replace(/^\./, "").toLowerCase();
  const allowed = EXTENSIONS[ext];
  if (!allowed) return jsonError("Unsupported file type");

  const declaredSize = Number(request.headers.get("content-length"));
  if (
    !Number.isFinite(declaredSize) ||
    declaredSize <= 0 ||
    declaredSize > allowed.maxBytes
  ) {
    return jsonError("Invalid file size");
  }

  try {
    if (isObjectStorageConfigured()) {
      await putObjectStream(
        key,
        requestBodyStream(request),
        declaredSize,
        allowed.mimeType
      );
    } else {
      const buffer = Buffer.from(await request.arrayBuffer());
      if (buffer.byteLength <= 0 || buffer.byteLength > allowed.maxBytes) {
        return jsonError("Invalid file size");
      }
      await writeLocalUpload(key, buffer);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("education upload PUT", err);
    return jsonError(
      err instanceof Error ? err.message : "Could not write the uploaded file.",
      500
    );
  }
}
