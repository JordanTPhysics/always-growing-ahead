import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/auth";
import {
  createEducationResource,
  listAllEducationResources,
} from "@/lib/db/repositories/education";
import { resolveDbUserId } from "@/lib/db/repositories/users";
import { EDUCATION_MEDIA_TYPES } from "@/lib/education/media-types";

const createSchema = z.object({
  topic: z.string().trim().min(1).max(255),
  media_type: z.enum(EDUCATION_MEDIA_TYPES),
  file_url: z.string().trim().min(1).max(500),
  file_name: z.string().trim().min(1).max(255),
  mime_type: z.string().trim().min(1).max(100),
  byte_size: z.coerce.number().int().positive(),
  title_en: z.string().trim().min(1).max(255),
  title_ar: z.string().trim().max(255).nullable().optional(),
  title_ckb: z.string().trim().max(255).nullable().optional(),
  description_en: z.string().trim().max(5000).nullable().optional(),
  description_ar: z.string().trim().max(5000).nullable().optional(),
  description_ckb: z.string().trim().max(5000).nullable().optional(),
  sort_order: z.number().int().optional(),
  is_published: z.boolean().optional(),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const resources = await listAllEducationResources();
  return NextResponse.json({ resources });
}

export async function POST(request: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid education resource");

  if (!parsed.data.file_url.startsWith("/uploads/education/")) {
    return jsonError("Invalid education file URL");
  }

  const createdBy = await resolveDbUserId(
    Number(session!.user.id),
    session!.user.email
  );

  const resource = await createEducationResource({
    ...parsed.data,
    created_by: createdBy,
  });
  return NextResponse.json({ resource }, { status: 201 });
}
