import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/auth";
import {
  deleteNewsExcerpt,
  getNewsExcerptById,
  updateNewsExcerpt,
} from "@/lib/db/repositories/news-excerpts";

const updateSchema = z.object({
  body_en: z.string().trim().min(1).max(500).optional(),
  body_ar: z.string().trim().max(500).nullable().optional(),
  body_ckb: z.string().trim().max(500).nullable().optional(),
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

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const id = await resolveId(params);
  if (id === null) return jsonError("Invalid id");

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid news excerpt");

  const existing = await getNewsExcerptById(id);
  if (!existing) return jsonError("Not found", 404);

  const excerpt = await updateNewsExcerpt(id, parsed.data);
  return NextResponse.json({ excerpt });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const id = await resolveId(params);
  if (id === null) return jsonError("Invalid id");

  const existing = await getNewsExcerptById(id);
  if (!existing) return jsonError("Not found", 404);

  const deleted = await deleteNewsExcerpt(id);
  if (!deleted) return jsonError("Not found", 404);

  return NextResponse.json({ ok: true });
}
