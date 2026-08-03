import type { MarketplacePost } from "@/lib/marketplace/types";

export const marketplacePosts: MarketplacePost[] = [
  {
    id: "cscs-boots",
    title: "Steel toe boots — barely worn",
    description: "Size 10, worn on two site visits. Great grip, compliant with site PPE rules.",
    price: "£45",
    seller: {
      type: "worker",
      id: 8004,
      displayName: "James T.",
    },
    ownerUserId: 4,
    location: "Nottingham",
    category: "PPE & gear",
    mediaType: "image",
    mediaUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1080&q=80",
    likes: 128,
  },
  {
    id: "cordless-drill",
    title: "DeWalt 18V drill kit",
    description: "Two batteries, charger included. Perfect for first-fix carpentry jobs.",
    price: "£120",
    seller: {
      type: "worker",
      id: 8002,
      displayName: "Priya M.",
    },
    ownerUserId: 2,
    location: "Leicester",
    category: "Tools",
    mediaType: "video",
    mediaUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    likes: 342,
  },
  {
    id: "scaffolding-clips",
    title: "Scaffolding clips — box of 50",
    description: "Galvanised, surplus from a completed project. Collection only.",
    price: "£80",
    seller: {
      type: "employer",
      id: 1,
      displayName: "Site Supplies UK",
    },
    ownerUserId: 1,
    location: "Derby",
    category: "Materials",
    mediaType: "image",
    mediaUrl:
      "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1080&q=80",
    likes: 56,
  },
  {
    id: "electrician-labour",
    title: "Qualified electrician — weekend availability",
    description: "Part P certified, 8 years experience. Domestic and light commercial.",
    price: "£35/hr",
    seller: {
      type: "worker",
      id: 8007,
      displayName: "Alex R.",
    },
    ownerUserId: 7,
    location: "Birmingham",
    category: "Services",
    mediaType: "video",
    mediaUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    likes: 891,
  },
  {
    id: "hard-hats",
    title: "Hard hats — pack of 6",
    description: "White helmets, all with chin straps. Ideal for a small crew starting a new job.",
    price: "£30",
    seller: {
      type: "worker",
      id: 8003,
      displayName: "Morgan K.",
    },
    ownerUserId: 3,
    location: "Sheffield",
    category: "PPE & gear",
    mediaType: "image",
    mediaUrl:
      "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1080&q=80",
    likes: 74,
  },
  {
    id: "van-racking",
    title: "Van racking system",
    description: "Ply-lined shelves and drawers. Fits medium wheelbase transit. Buyer removes.",
    price: "£200",
    seller: {
      type: "worker",
      id: 8006,
      displayName: "Chris D.",
    },
    ownerUserId: 6,
    location: "Manchester",
    category: "Vehicles & storage",
    mediaType: "image",
    mediaUrl:
      "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1080&q=80",
    likes: 215,
  },
];
