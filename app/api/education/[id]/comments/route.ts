import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api/auth";
import {
  countCommentsForEducationResource,
  createEducationComment,
  listCommentsForEducationResource,
} from "@/lib/db/repositories/education-comments";
import { getEducationResourceById } from "@/lib/db/repositories/education";
import { createNotification } from "@/lib/db/repositories/notifications";
import { educationMediaTypeToSlug } from "@/lib/education/media-types";
import { dispatchPushToUser } from "@/lib/notifications/push-dispatch";

const createSchema = z.object({
  body: z.string().trim().min(1).max(1000),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id: rawId } = await params;
  const resourceId = Number(rawId);
  if (!Number.isInteger(resourceId) || resourceId < 1) {
    return jsonError("Invalid resource");
  }

  const resource = await getEducationResourceById(resourceId);
  if (!resource || !resource.is_published) {
    return jsonError("Resource not found", 404);
  }

  const comments = await listCommentsForEducationResource(resourceId);
  const total = await countCommentsForEducationResource(resourceId);
  return NextResponse.json({ comments, total });
}

export async function POST(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id: rawId } = await params;
  const resourceId = Number(rawId);
  if (!Number.isInteger(resourceId) || resourceId < 1) {
    return jsonError("Invalid resource");
  }

  const resource = await getEducationResourceById(resourceId);
  if (!resource || !resource.is_published) {
    return jsonError("Resource not found", 404);
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid comment");

  const userId = Number(session.user.id);
  const comment = await createEducationComment({
    resourceId,
    userId,
    body: parsed.data.body,
  });

  const ownerUserId = resource.created_by;
  if (ownerUserId != null && ownerUserId !== userId) {
    const slug = educationMediaTypeToSlug(resource.media_type);
    const linkUrl = `/education/${slug}#resource-${resourceId}`;
    const title = "New comment on your education resource";
    const body = "Someone commented on your education guide.";
    await createNotification({
      userId: ownerUserId,
      type: "education_comment",
      title,
      body,
      linkUrl,
    });
    void dispatchPushToUser(ownerUserId, { title, body, linkUrl });
  }

  return NextResponse.json({ comment }, { status: 201 });
}
