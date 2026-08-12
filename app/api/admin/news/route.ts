import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/auth";
import {
  createNewsExcerpt,
  listAllNewsExcerpts,
} from "@/lib/db/repositories/news-excerpts";
import { resolveDbUserId } from "@/lib/db/repositories/users";

const createSchema = z.object({
  body_en: z.string().trim().min(1).max(500),
  body_ar: z.string().trim().max(500).nullable().optional(),
  body_ckb: z.string().trim().max(500).nullable().optional(),
  sort_order: z.number().int().optional(),
  is_published: z.boolean().optional(),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const excerpts = await listAllNewsExcerpts();
  return NextResponse.json({ excerpts });
}

export async function POST(request: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid news excerpt");

  const createdBy = await resolveDbUserId(
    Number(session!.user.id),
    session!.user.email
  );

  const excerpt = await createNewsExcerpt({
    ...parsed.data,
    created_by: createdBy,
  });
  return NextResponse.json({ excerpt }, { status: 201 });
}
