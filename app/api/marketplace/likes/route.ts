import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  countLikesForListings,
  listLikedListingIds,
} from "@/lib/db/repositories/marketplace-likes";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("ids") ?? "";
  const listingIds = raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0 && id.length <= 64)
    .slice(0, 100);

  const counts = await countLikesForListings(listingIds);
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  const likedIds =
    userId != null && Number.isInteger(userId)
      ? await listLikedListingIds(userId, listingIds)
      : [];

  return NextResponse.json({ counts, likedIds });
}
