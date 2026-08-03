export type MarketplaceMediaType = "image" | "video";

export type MarketplaceSellerProfile = {
  type: "worker" | "employer";
  id: number;
  displayName: string;
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

export function marketplaceSellerHref(seller: MarketplaceSellerProfile): string {
  return seller.type === "worker"
    ? `/workers/${seller.id}`
    : `/employers/${seller.id}`;
}
