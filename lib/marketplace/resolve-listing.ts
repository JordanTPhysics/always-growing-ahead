import { getMarketplaceListingById } from "@/lib/db/repositories/marketplace-listings";
import { marketplacePosts } from "@/lib/marketplace/content";

export function getDemoMarketplacePost(listingId: string) {
  return marketplacePosts.find((post) => post.id === listingId) ?? null;
}

export async function marketplaceListingExists(
  listingId: string
): Promise<boolean> {
  if (getDemoMarketplacePost(listingId)) return true;
  return (await getMarketplaceListingById(listingId)) != null;
}

export async function getMarketplaceListingOwnerUserId(
  listingId: string
): Promise<number | null> {
  const demo = getDemoMarketplacePost(listingId);
  if (demo) return demo.ownerUserId;
  const listing = await getMarketplaceListingById(listingId);
  return listing?.user_id ?? null;
}
