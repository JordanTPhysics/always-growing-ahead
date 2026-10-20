import { after } from "next/server";
import type { JobStatus } from "@/lib/db/types";
import { createNotificationsForUsers } from "@/lib/db/repositories/notifications";
import {
  listActivelyLookingUserIds,
  listUserIdsExcept,
} from "@/lib/notifications/audience";
import {
  dispatchPushToUsers,
  type PushPayload,
} from "@/lib/notifications/push-dispatch";

function clip(value: string, max: number) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function schedulePush(userIds: number[], payload: PushPayload) {
  if (userIds.length === 0) return;
  const task = () => dispatchPushToUsers(userIds, payload);
  try {
    after(task);
  } catch {
    void task();
  }
}

async function fanOut(input: {
  userIds: number[];
  type: string;
  title: string;
  body: string;
  linkUrl: string;
}) {
  if (input.userIds.length === 0) return;
  await createNotificationsForUsers(input.userIds, input);
  schedulePush(input.userIds, {
    title: input.title,
    body: input.body,
    linkUrl: input.linkUrl,
  });
}

export async function notifyMarketplacePosted(input: {
  posterUserId: number;
  listingId: string;
  title: string;
}) {
  try {
    const userIds = await listUserIdsExcept(input.posterUserId);
    await fanOut({
      userIds,
      type: "marketplace_post",
      title: "New marketplace listing",
      body: clip(input.title, 240),
      linkUrl: `/marketplace#${input.listingId}`,
    });
  } catch (err) {
    console.error("notifyMarketplacePosted", err);
  }
}

export async function notifyJobPublished(input: {
  posterUserId: number;
  jobId: number;
  title: string;
  status: JobStatus | string;
  previousStatus?: JobStatus | string | null;
  postcode?: string | null;
  addressText?: string | null;
}) {
  if (input.status !== "active" || input.previousStatus === "active") return;

  try {
    const userIds = await listActivelyLookingUserIds(input.posterUserId);
    const place = [input.addressText, input.postcode].filter(Boolean).join(" · ");
    await fanOut({
      userIds,
      type: "job_posted",
      title: "New job posted",
      body: clip(place ? `${input.title} · ${place}` : input.title, 240),
      linkUrl: `/jobs/${input.jobId}`,
    });
  } catch (err) {
    console.error("notifyJobPublished", err);
  }
}
