import { NextResponse } from "next/server";
import { countCommentsForListings } from "@/lib/db/repositories/marketplace-comments";
import { marketplacePosts } from "@/lib/marketplace/content";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("ids") ?? "";
  const fromQuery = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 100);
  const listingIds =
    fromQuery.length > 0 ? fromQuery : marketplacePosts.map((post) => post.id);
  const counts = await countCommentsForListings(listingIds);
  return NextResponse.json({ counts });
}
