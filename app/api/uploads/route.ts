import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { jsonError, requireSession } from "@/lib/api/auth";
import { z } from "zod";

const schema = z.object({
  dataUrl: z.string().min(32).max(8_000_000),
  folder: z.enum(["profiles", "certificates", "logos"]).optional(),
});

/** Accepts a data URL and stores under public/uploads (dev/local). Swap for R2/S3 in production. */
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
  const userId = session.user.id;
  const dir = path.join(process.cwd(), "public", "uploads", folder, userId);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > 5 * 1024 * 1024) {
    return jsonError("Image too large (max 5MB)");
  }

  await writeFile(path.join(dir, filename), buffer);
  const url = `/uploads/${folder}/${userId}/${filename}`;
  return NextResponse.json({ url });
}
