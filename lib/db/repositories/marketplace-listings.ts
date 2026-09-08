import { pool } from "@/lib/db/pool";
import type { MarketplaceListing } from "@/lib/db/types";
import type {
  MarketplaceMediaType,
  MarketplacePost,
  MarketplaceSellerProfile,
} from "@/lib/marketplace/types";
import { isRemoteDatabaseConfigured } from "@/lib/db/config";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type ListingRow = MarketplaceListing & RowDataPacket;

type ListingFeedRow = ListingRow & {
  username: string | null;
  email: string;
  city: string | null;
  worker_profile_id: number | null;
  worker_headline: string | null;
  employer_profile_id: number | null;
  company_name: string | null;
};

export function marketplaceListingPublicId(id: number): string {
  return String(id);
}

function displayName(
  username: string | null,
  email: string | null,
  companyName: string | null,
  headline: string | null
): string {
  if (companyName?.trim()) return companyName.trim();
  if (username?.trim()) return username.trim();
  if (headline?.trim()) return headline.trim();
  if (email?.trim()) return email.split("@")[0] ?? "User";
  return "User";
}

function sellerFromRow(row: ListingFeedRow): MarketplaceSellerProfile {
  const name = displayName(
    row.username,
    row.email,
    row.company_name,
    row.worker_headline
  );
  if (row.employer_profile_id) {
    return {
      type: "employer",
      id: Number(row.employer_profile_id),
      displayName: name,
    };
  }
  if (row.worker_profile_id) {
    return {
      type: "worker",
      id: Number(row.worker_profile_id),
      displayName: name,
    };
  }
  return {
    type: "user",
    id: Number(row.user_id),
    displayName: name,
  };
}

function mapListingToPost(row: ListingFeedRow): MarketplacePost {
  return {
    id: marketplaceListingPublicId(row.id),
    title: row.title,
    description: row.description ?? "",
    price: row.price ?? "",
    seller: sellerFromRow(row),
    ownerUserId: Number(row.user_id),
    location: row.location || row.city || "",
    category: row.category || "Other",
    mediaType: row.media_type,
    mediaUrl: row.media_url,
    likes: 0,
  };
}

const FEED_SELECT = `SELECT l.*, u.username, u.email, u.city,
       wp.id AS worker_profile_id, wp.headline AS worker_headline,
       ep.id AS employer_profile_id, ep.company_name
     FROM marketplace_listings l
     JOIN users u ON u.id = l.user_id
     LEFT JOIN worker_profiles wp ON wp.user_id = u.id
     LEFT JOIN employer_profiles ep ON ep.user_id = u.id`;

export async function listMarketplaceListings(): Promise<MarketplacePost[]> {
  if (!isRemoteDatabaseConfigured()) return [];

  const [rows] = await pool.execute<ListingFeedRow[]>(
    `${FEED_SELECT}
     ORDER BY l.created_at DESC, l.id DESC`
  );
  return rows.map(mapListingToPost);
}

export async function getMarketplaceListingById(
  listingId: string
): Promise<MarketplaceListing | null> {
  if (!isRemoteDatabaseConfigured()) return null;
  if (!/^\d+$/.test(listingId)) return null;

  const [rows] = await pool.execute<ListingRow[]>(
    `SELECT * FROM marketplace_listings WHERE id = ? LIMIT 1`,
    [listingId]
  );
  return rows[0] ?? null;
}

export async function getMarketplaceListingPostById(
  listingId: string
): Promise<MarketplacePost | null> {
  if (!isRemoteDatabaseConfigured()) return null;
  if (!/^\d+$/.test(listingId)) return null;

  const [rows] = await pool.execute<ListingFeedRow[]>(
    `${FEED_SELECT}
     WHERE l.id = ?
     LIMIT 1`,
    [listingId]
  );
  return rows[0] ? mapListingToPost(rows[0]) : null;
}

export async function countRecentMarketplaceListings(
  userId: number
): Promise<number> {
  if (!isRemoteDatabaseConfigured()) return 0;

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM marketplace_listings
     WHERE user_id = ?
       AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)`,
    [userId]
  );
  return Number(rows[0]?.total ?? 0);
}

export async function createMarketplaceListing(input: {
  userId: number;
  title: string;
  description: string;
  price: string;
  location: string;
  category: string;
  mediaType: MarketplaceMediaType;
  mediaUrl: string;
}): Promise<MarketplacePost> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO marketplace_listings
      (user_id, title, description, price, location, category, media_type, media_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.userId,
      input.title,
      input.description,
      input.price,
      input.location,
      input.category,
      input.mediaType,
      input.mediaUrl,
    ]
  );

  const post = await getMarketplaceListingPostById(
    marketplaceListingPublicId(result.insertId)
  );
  if (!post) throw new Error("Failed to load created listing");
  return post;
}
