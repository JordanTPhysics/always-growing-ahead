import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/auth";
import {
  getSponsoredItemById,
  updateSponsoredItem,
} from "@/lib/db/repositories/sponsored";
import { isSafeArticleUrl } from "@/lib/news/article-url";

const updateSchema = z.object({
  tagline: z.string().trim().min(1).max(300),
  href: z.string().trim().max(1000).refine(isSafeArticleUrl),
  image_url: z.string().trim().max(1000).refine(isSafeArticleUrl),
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
  if (!parsed.success) return jsonError("Invalid sponsored item");

  const existing = await getSponsoredItemById(id);
  if (!existing) return jsonError("Not found", 404);

  const item = await updateSponsoredItem(id, parsed.data);
  return NextResponse.json({ item });
}
