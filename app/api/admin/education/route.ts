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

  try {
    const resources = await listAllEducationResources();
    return NextResponse.json({ resources });
  } catch (err) {
    console.error("listAllEducationResources", err);
    return jsonError("Could not load education guides.", 500);
  }
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

  try {
    const resource = await createEducationResource({
      ...parsed.data,
      created_by: createdBy,
    });
    return NextResponse.json({ resource }, { status: 201 });
  } catch (err) {
    console.error("createEducationResource", err);
    return jsonError(saveErrorMessage(err), 500);
  }
}

function saveErrorMessage(err: unknown): string {
  const code = (err as { code?: string }).code;
  if (code === "ER_NO_REFERENCED_ROW" || code === "ER_NO_REFERENCED_ROW_2") {
    return "Could not save: this admin account is not in the database.";
  }
  if (code === "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD" || code === "ER_WARN_DATA_OUT_OF_RANGE") {
    return "Could not save: a field was the wrong type or too long.";
  }
  if (err instanceof Error && err.message) return err.message;
  return "Could not save the education guide.";
}
