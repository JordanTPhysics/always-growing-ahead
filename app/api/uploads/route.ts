import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api/auth";
import {
  isObjectStorageConfigured,
  keyToStoredUrl,
  newUploadKey,
  putObject,
  writeLocalUpload,
} from "@/lib/storage";
import { z } from "zod";

const schema = z.object({
  dataUrl: z.string().min(32).max(8_000_000),
  folder: z.enum(["profiles", "certificates", "logos"]).optional(),
});

export const runtime = "nodejs";

/** Accepts a data URL. Writes to MinIO when S3_* is set, otherwise public/uploads. */
export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid upload");

  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(
    parsed.data.dataUrl
  );
  if (!match) return jsonError("Only image data URLs are supported");

  const mime = match[1];
  const ext = mime.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  if (!["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
    return jsonError("Unsupported image type");
  }

  const folder = parsed.data.folder ?? "profiles";
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > 5 * 1024 * 1024) {
    return jsonError("Image too large (max 5MB)");
  }

  const key = newUploadKey(folder, session.user.id, ext);
  if (isObjectStorageConfigured()) {
    await putObject(key, buffer, mime);
  } else {
    await writeLocalUpload(key, buffer);
  }

  return NextResponse.json({ url: keyToStoredUrl(key) });
}
