import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { jsonError } from "@/lib/api/auth";
import { requireAdmin } from "@/lib/api/admin";

export const runtime = "nodejs";

const PDF_MAX_BYTES = 25 * 1024 * 1024;
const VIDEO_MAX_BYTES = 200 * 1024 * 1024;

type FileKind = "pdf" | "video";

type AllowedFile = {
  fileKind: FileKind;
  ext: string;
  maxBytes: number;
};

const ALLOWED_MIMES: Record<string, AllowedFile> = {
  "application/pdf": { fileKind: "pdf", ext: "pdf", maxBytes: PDF_MAX_BYTES },
  "application/x-pdf": { fileKind: "pdf", ext: "pdf", maxBytes: PDF_MAX_BYTES },
  "video/mp4": { fileKind: "video", ext: "mp4", maxBytes: VIDEO_MAX_BYTES },
  "video/webm": { fileKind: "video", ext: "webm", maxBytes: VIDEO_MAX_BYTES },
  "video/quicktime": {
    fileKind: "video",
    ext: "mov",
    maxBytes: VIDEO_MAX_BYTES,
  },
};

const EXTENSIONS: Record<string, AllowedFile> = {
  pdf: { fileKind: "pdf", ext: "pdf", maxBytes: PDF_MAX_BYTES },
  mp4: { fileKind: "video", ext: "mp4", maxBytes: VIDEO_MAX_BYTES },
  webm: { fileKind: "video", ext: "webm", maxBytes: VIDEO_MAX_BYTES },
  mov: { fileKind: "video", ext: "mov", maxBytes: VIDEO_MAX_BYTES },
};

function resolveAllowedFile(file: File): AllowedFile | null {
  const mime = file.type.trim().toLowerCase();
  if (mime && mime !== "application/octet-stream") {
    const byMime = ALLOWED_MIMES[mime];
    if (byMime) return byMime;
  }

  const ext = path.extname(file.name).replace(/^\./, "").toLowerCase();
  return EXTENSIONS[ext] ?? null;
}

export async function POST(request: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const form = await request.formData().catch(() => null);
  if (!form) return jsonError("Invalid form data");

  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Missing file");

  const allowed = resolveAllowedFile(file);
  if (!allowed) {
    return jsonError(
      "Unsupported file type. Use PDF, MP4, WebM, or QuickTime."
    );
  }

  if (file.size <= 0) {
    return jsonError("File is empty.");
  }

  if (file.size > allowed.maxBytes) {
    const maxMb = Math.round(allowed.maxBytes / (1024 * 1024));
    return jsonError(
      `${allowed.fileKind === "pdf" ? "PDF" : "Video"} too large (max ${maxMb}MB)`
    );
  }

  const userId = session!.user.id;
  const dir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "education",
    userId
  );
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${allowed.ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  const url = `/uploads/education/${userId}/${filename}`;
  const mimeType =
    file.type.trim() ||
    (allowed.fileKind === "pdf" ? "application/pdf" : "application/octet-stream");

  return NextResponse.json({
    url,
    fileName: file.name || filename,
    mimeType,
    byteSize: buffer.byteLength,
    fileKind: allowed.fileKind,
  });
}
