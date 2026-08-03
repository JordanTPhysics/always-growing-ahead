import { pool } from "@/lib/db/pool";
import type {
  MarketplaceComment,
  MarketplaceCommentListItem,
} from "@/lib/db/types";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type CommentRow = MarketplaceComment & RowDataPacket;

type CommentListRow = CommentRow & {
  username: string | null;
  email: string;
};

function displayAuthorName(
  username: string | null,
  email: string | null
): string {
  if (username?.trim()) return username.trim();
  if (email?.trim()) return email.split("@")[0] ?? "User";
  return "User";
}

function mapCommentRow(row: CommentListRow): MarketplaceCommentListItem {
  return {
    id: row.id,
    listing_id: row.listing_id,
    user_id: row.user_id,
    body: row.body,
    created_at: row.created_at,
    author_name: displayAuthorName(row.username, row.email),
  };
}

export async function listCommentsForListing(
  listingId: string
): Promise<MarketplaceCommentListItem[]> {
  const [rows] = await pool.execute<CommentListRow[]>(
    `SELECT c.*, u.username, u.email
     FROM marketplace_comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.listing_id = ?
     ORDER BY c.created_at ASC`,
    [listingId]
  );

  return rows.map(mapCommentRow);
}

export async function countCommentsForListing(listingId: string): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM marketplace_comments
     WHERE listing_id = ?`,
    [listingId]
  );
  return Number(rows[0]?.total ?? 0);
}

export async function createMarketplaceComment(input: {
  listingId: string;
  userId: number;
  body: string;
}): Promise<MarketplaceCommentListItem> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO marketplace_comments (listing_id, user_id, body)
     VALUES (?, ?, ?)`,
    [input.listingId, input.userId, input.body]
  );

  const [rows] = await pool.execute<CommentListRow[]>(
    `SELECT c.*, u.username, u.email
     FROM marketplace_comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.id = ?
     LIMIT 1`,
    [result.insertId]
  );

  const row = rows[0];
  if (!row) throw new Error("Failed to load created comment");
  return mapCommentRow(row);
}

export async function countCommentsForListings(
  listingIds: string[]
): Promise<Record<string, number>> {
  if (listingIds.length === 0) return {};

  const placeholders = listingIds.map(() => "?").join(", ");
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT listing_id, COUNT(*) AS total
     FROM marketplace_comments
     WHERE listing_id IN (${placeholders})
     GROUP BY listing_id`,
    listingIds
  );

  const counts: Record<string, number> = {};
  for (const id of listingIds) counts[id] = 0;
  for (const row of rows) {
    counts[String(row.listing_id)] = Number(row.total);
  }
  return counts;
}
