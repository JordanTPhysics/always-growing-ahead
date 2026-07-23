import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/auth";
import {
  deleteEducationResource,
  getEducationResourceById,
  updateEducationResource,
} from "@/lib/db/repositories/education";

const updateSchema = z.object({
  topic: z.string().trim().min(1).max(255).optional(),
  media_type: z.enum(["pdf", "video"]).optional(),
  file_url: z.string().trim().min(1).max(500).optional(),
  file_name: z.string().trim().min(1).max(255).optional(),
  mime_type: z.string().trim().min(1).max(100).optional(),
  byte_size: z.number().int().positive().optional(),
  title_en: z.string().trim().min(1).max(255).optional(),
  title_ar: z.string().trim().max(255).nullable().optional(),
  title_ckb: z.string().trim().max(255).nullable().optional(),
  description_en: z.string().trim().max(5000).nullable().optional(),
  description_ar: z.string().trim().max(5000).nullable().optional(),
  description_ckb: z.string().trim().max(5000).nullable().optional(),
  sort_order: z.number().int().optional(),
  is_published: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

async function resolveId(params: Promise<{ id: string }>) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) return null;
  return numeric;
}

async function tryUnlinkEducationFile(fileUrl: string) {
  if (!fileUrl.startsWith("/uploads/education/")) return;
  const relativeUrl = fileUrl.replace(/^\//, "");
  const absolute = path.resolve(process.cwd(), "public", relativeUrl);
  const uploadsRoot = path.resolve(
    process.cwd(),
    "public",
    "uploads",
    "education"
  );
  const relative = path.relative(uploadsRoot, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return;
  await unlink(absolute).catch(() => undefined);
}

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const id = await resolveId(params);
  if (id === null) return jsonError("Invalid id");

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid education resource");

  if (
    parsed.data.file_url !== undefined &&
    !parsed.data.file_url.startsWith("/uploads/education/")
  ) {
    return jsonError("Invalid education file URL");
  }

  const existing = await getEducationResourceById(id);
  if (!existing) return jsonError("Not found", 404);

  const resource = await updateEducationResource(id, parsed.data);
  if (
    parsed.data.file_url &&
    parsed.data.file_url !== existing.file_url
  ) {
    await tryUnlinkEducationFile(existing.file_url);
  }

  return NextResponse.json({ resource });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const id = await resolveId(params);
  if (id === null) return jsonError("Invalid id");

  const existing = await getEducationResourceById(id);
  if (!existing) return jsonError("Not found", 404);

  const deleted = await deleteEducationResource(id);
  if (!deleted) return jsonError("Not found", 404);

  await tryUnlinkEducationFile(existing.file_url);
  return NextResponse.json({ ok: true });
}
