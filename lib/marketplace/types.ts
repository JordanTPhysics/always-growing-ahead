export type MarketplaceMediaType = "image" | "video";

export const MARKETPLACE_CATEGORIES = [
  "PPE & gear",
  "Tools",
  "Materials",
  "Services",
  "Vehicles & storage",
  "Other",
] as const;

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number];

export type MarketplaceSellerProfile = {
  type: "worker" | "employer" | "user";
  id: number;
  displayName: string;
};

export type MarketplaceQuota = {
  used: number;
  limit: number;
  remaining: number;
};

export type MarketplacePost = {
  id: string;
  title: string;
  description: string;
  price: string;
  seller: MarketplaceSellerProfile;
  ownerUserId: number;
  location: string;
  category: string;
  mediaType: MarketplaceMediaType;
  mediaUrl: string;
  likes: number;
};

export function marketplaceSellerHref(
  seller: MarketplaceSellerProfile
): string | null {
  if (seller.type === "worker") return `/workers/${seller.id}`;
  if (seller.type === "employer") return `/employers/${seller.id}`;
  return null;
}
