import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api/auth";
import {
  addMarketplaceLike,
  countLikesForListing,
  removeMarketplaceLike,
} from "@/lib/db/repositories/marketplace-likes";
import { createNotification } from "@/lib/db/repositories/notifications";
import {
  getMarketplaceListingOwnerUserId,
  marketplaceListingExists,
} from "@/lib/marketplace/resolve-listing";
import { dispatchPushToUser } from "@/lib/notifications/push-dispatch";

type Params = { params: Promise<{ listingId: string }> };

function validListingId(listingId: string | undefined): listingId is string {
  const id = listingId?.trim() ?? "";
  return id.length > 0 && id.length <= 64;
}

async function notifyOwnerLiked(listingId: string, ownerUserId: number) {
  const linkUrl = `/marketplace#${listingId}`;
  const title = "Someone liked your listing";
  const body = "Your marketplace listing received a like.";
  await createNotification({
    userId: ownerUserId,
    type: "marketplace_like",
    title,
    body,
    linkUrl,
  });
  void dispatchPushToUser(ownerUserId, { title, body, linkUrl });
}

export async function POST(_request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { listingId } = await params;
  if (!validListingId(listingId)) return jsonError("Invalid listing");

  if (!(await marketplaceListingExists(listingId))) {
    return jsonError("Listing not found", 404);
  }

  const userId = Number(session.user.id);
  const created = await addMarketplaceLike({ listingId, userId });

  if (created) {
    try {
      const ownerUserId = await getMarketplaceListingOwnerUserId(listingId);
      if (ownerUserId != null && ownerUserId !== userId) {
        await notifyOwnerLiked(listingId, ownerUserId);
      }
    } catch (err) {
      console.error("notifyOwnerLiked", err);
    }
  }

  const count = await countLikesForListing(listingId);
  return NextResponse.json(
    { liked: true, count },
    { status: created ? 201 : 200 }
  );
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { listingId } = await params;
  if (!validListingId(listingId)) return jsonError("Invalid listing");

  if (!(await marketplaceListingExists(listingId))) {
    return jsonError("Listing not found", 404);
  }

  await removeMarketplaceLike({
    listingId,
    userId: Number(session.user.id),
  });
  const count = await countLikesForListing(listingId);
  return NextResponse.json({ liked: false, count });
}
