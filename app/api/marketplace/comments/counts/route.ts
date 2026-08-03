import { NextResponse } from "next/server";
import { countCommentsForListings } from "@/lib/db/repositories/marketplace-comments";
import { marketplacePosts } from "@/lib/marketplace/content";

export async function GET() {
  const listingIds = marketplacePosts.map((post) => post.id);
  const counts = await countCommentsForListings(listingIds);
  return NextResponse.json({ counts });
}
