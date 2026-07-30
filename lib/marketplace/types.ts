export type MarketplaceMediaType = "image" | "video";

export type MarketplacePost = {
  id: string;
  title: string;
  description: string;
  price: string;
  seller: string;
  location: string;
  category: string;
  mediaType: MarketplaceMediaType;
  mediaUrl: string;
  likes: number;
};
