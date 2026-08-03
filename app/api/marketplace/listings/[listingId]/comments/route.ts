import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api/auth";
import {
  countCommentsForListing,
  createMarketplaceComment,
  listCommentsForListing,
} from "@/lib/db/repositories/marketplace-comments";
import { createNotification } from "@/lib/db/repositories/notifications";
import { marketplacePosts } from "@/lib/marketplace/content";
import { dispatchPushToUser } from "@/lib/notifications/push-dispatch";

const createSchema = z.object({
  body: z.string().trim().min(1).max(1000),
});

type Params = { params: Promise<{ listingId: string }> };

function findListingOwnerUserId(listingId: string): number | null {
  const post = marketplacePosts.find((item) => item.id === listingId);
  return post?.ownerUserId ?? null;
}

export async function GET(_request: Request, { params }: Params) {
  const { listingId } = await params;
  if (!listingId?.trim()) return jsonError("Invalid listing");

  const comments = await listCommentsForListing(listingId);
  const total = await countCommentsForListing(listingId);
  return NextResponse.json({ comments, total });
}

export async function POST(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { listingId } = await params;
  if (!listingId?.trim()) return jsonError("Invalid listing");

  const exists = marketplacePosts.some((item) => item.id === listingId);
  if (!exists) return jsonError("Listing not found", 404);

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid comment");

  const userId = Number(session.user.id);
  const comment = await createMarketplaceComment({
    listingId,
    userId,
    body: parsed.data.body,
  });

  const ownerUserId = findListingOwnerUserId(listingId);
  if (ownerUserId != null && ownerUserId !== userId) {
    const linkUrl = `/marketplace#${listingId}`;
    const title = "New comment on your listing";
    const body = "Someone commented on your marketplace listing.";
    await createNotification({
      userId: ownerUserId,
      type: "marketplace_comment",
      title,
      body,
      linkUrl,
    });
    void dispatchPushToUser(ownerUserId, { title, body, linkUrl });
  }

  return NextResponse.json({ comment }, { status: 201 });
}
