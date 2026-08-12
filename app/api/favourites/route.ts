import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api/auth";
import {
  addFavourite,
  listFavouritedTargetIds,
  listFavouritesForUser,
  removeFavourite,
} from "@/lib/db/repositories/favourites";
import { getEducationResourceById } from "@/lib/db/repositories/education";
import { getEmployerById } from "@/lib/db/repositories/employers";
import { getJobById } from "@/lib/db/repositories/jobs";
import { createNotification } from "@/lib/db/repositories/notifications";
import { getWorkerById } from "@/lib/db/repositories/workers";
import { educationMediaTypeToSlug } from "@/lib/education/media-types";
import { dispatchPushToUser } from "@/lib/notifications/push-dispatch";
import type { FavouriteTargetType } from "@/lib/db/types";

const targetTypeSchema = z.enum(["job", "worker", "employer", "education"]);

const createSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.number().int().positive(),
});

function parseTargetIds(raw: string | null): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
}

async function resolveFavouriteTarget(
  targetType: FavouriteTargetType,
  targetId: number
): Promise<{ exists: boolean; ownerUserId: number | null }> {
  if (targetType === "job") {
    const job = await getJobById(targetId);
    if (!job) return { exists: false, ownerUserId: null };
    const employer = await getEmployerById(job.employer_id);
    return { exists: true, ownerUserId: employer?.user_id ?? null };
  }

  if (targetType === "worker") {
    const worker = await getWorkerById(targetId);
    if (!worker) return { exists: false, ownerUserId: null };
    return { exists: true, ownerUserId: worker.user_id };
  }

  if (targetType === "education") {
    const resource = await getEducationResourceById(targetId);
    if (!resource || !resource.is_published) {
      return { exists: false, ownerUserId: null };
    }
    return { exists: true, ownerUserId: resource.created_by };
  }

  const employer = await getEmployerById(targetId);
  if (!employer) return { exists: false, ownerUserId: null };
  return { exists: true, ownerUserId: employer.user_id };
}

async function notifyOwnerFavourited(
  targetType: FavouriteTargetType,
  targetId: number,
  ownerUserId: number
) {
  let linkUrl: string;
  if (targetType === "job") {
    linkUrl = `/jobs/${targetId}`;
  } else if (targetType === "worker") {
    linkUrl = `/workers/${targetId}`;
  } else if (targetType === "education") {
    const resource = await getEducationResourceById(targetId);
    const slug = resource
      ? educationMediaTypeToSlug(resource.media_type)
      : "short-videos";
    linkUrl = `/education/${slug}#resource-${targetId}`;
  } else {
    linkUrl = `/employers/${targetId}`;
  }

  const copy =
    targetType === "job"
      ? {
          title: "Your job was added to favourites",
          body: "Someone saved your job posting to their favourites.",
        }
      : targetType === "worker"
        ? {
            title: "Your profile was added to favourites",
            body: "Someone saved your worker profile to their favourites.",
          }
        : targetType === "education"
          ? {
              title: "Your education resource was favourited",
              body: "Someone saved your education guide to their favourites.",
            }
          : {
              title: "Your company was added to favourites",
              body: "Someone saved your company profile to their favourites.",
            };

  await createNotification({
    userId: ownerUserId,
    type: "favourited",
    title: copy.title,
    body: copy.body,
    linkUrl,
  });
  void dispatchPushToUser(ownerUserId, {
    title: copy.title,
    body: copy.body,
    linkUrl,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetType = targetTypeSchema.safeParse(searchParams.get("targetType"));
  const targetIds = parseTargetIds(searchParams.get("targetIds"));

  if (searchParams.has("targetIds")) {
    const { session, error } = await requireSession();
    if (error) return error;

    if (!targetType.success) return jsonError("Invalid target type");
    const favouritedIds = await listFavouritedTargetIds(
      Number(session.user.id),
      targetType.data,
      targetIds
    );
    return NextResponse.json({ favouritedIds });
  }

  const { session, error } = await requireSession();
  if (error) return error;

  const kind = searchParams.get("targetType");
  const kindParsed = kind ? targetTypeSchema.safeParse(kind) : null;
  if (kind && !kindParsed?.success) return jsonError("Invalid target type");

  const favourites = await listFavouritesForUser(
    Number(session.user.id),
    kindParsed?.success ? kindParsed.data : undefined
  );
  return NextResponse.json({ favourites });
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid favourite");

  const userId = Number(session.user.id);
  const { targetType, targetId } = parsed.data;

  const target = await resolveFavouriteTarget(targetType, targetId);
  if (!target.exists) return jsonError("Target not found", 404);

  const { favourite, created } = await addFavourite({
    userId,
    targetType,
    targetId,
  });

  if (
    created &&
    target.ownerUserId != null &&
    target.ownerUserId !== userId
  ) {
    await notifyOwnerFavourited(targetType, targetId, target.ownerUserId);
  }

  return NextResponse.json({ favourite, favourited: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const targetType = targetTypeSchema.safeParse(searchParams.get("targetType"));
  const targetId = Number(searchParams.get("targetId"));

  if (!targetType.success || !Number.isInteger(targetId) || targetId < 1) {
    return jsonError("Invalid favourite");
  }

  await removeFavourite({
    userId: Number(session.user.id),
    targetType: targetType.data,
    targetId,
  });
  return NextResponse.json({ ok: true, favourited: false });
}
