import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { jsonError } from "@/lib/api/auth";
import { requireAdmin } from "@/lib/api/admin";
import type { EducationMediaType } from "@/lib/db/types";

export const runtime = "nodejs";

const PDF_MAX_BYTES = 25 * 1024 * 1024;
const VIDEO_MAX_BYTES = 200 * 1024 * 1024;

const ALLOWED: Record<
  string,
  { mediaType: EducationMediaType; ext: string; maxBytes: number }
> = {
  "application/pdf": { mediaType: "pdf", ext: "pdf", maxBytes: PDF_MAX_BYTES },
  "video/mp4": { mediaType: "video", ext: "mp4", maxBytes: VIDEO_MAX_BYTES },
  "video/webm": { mediaType: "video", ext: "webm", maxBytes: VIDEO_MAX_BYTES },
  "video/quicktime": {
    mediaType: "video",
    ext: "mov",
    maxBytes: VIDEO_MAX_BYTES,
  },
};

export async function POST(request: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const form = await request.formData().catch(() => null);
  if (!form) return jsonError("Invalid form data");

  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Missing file");

  const mime = file.type || "application/octet-stream";
  const allowed = ALLOWED[mime];
  if (!allowed) {
    return jsonError(
      "Unsupported file type. Use PDF, MP4, WebM, or QuickTime."
    );
  }

  if (file.size > allowed.maxBytes) {
    const maxMb = Math.round(allowed.maxBytes / (1024 * 1024));
    return jsonError(
      `${allowed.mediaType === "pdf" ? "PDF" : "Video"} too large (max ${maxMb}MB)`
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
  return NextResponse.json({
    url,
    fileName: file.name || filename,
    mimeType: mime,
    byteSize: buffer.byteLength,
    mediaType: allowed.mediaType,
  });
}
