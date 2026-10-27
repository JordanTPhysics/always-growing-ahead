import { pool } from "@/lib/db/pool";
import { isRemoteDatabaseConfigured } from "@/lib/db/config";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export async function addMarketplaceLike(input: {
  listingId: string;
  userId: number;
}): Promise<boolean> {
  try {
    await pool.execute<ResultSetHeader>(
      `INSERT INTO marketplace_likes (listing_id, user_id)
       VALUES (?, ?)`,
      [input.listingId, input.userId]
    );
    return true;
  } catch (error) {
    const errno = (error as { errno?: number }).errno;
    if (errno !== 1062) throw error;
    return false;
  }
}

export async function removeMarketplaceLike(input: {
  listingId: string;
  userId: number;
}): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM marketplace_likes
     WHERE listing_id = ? AND user_id = ?`,
    [input.listingId, input.userId]
  );
  return result.affectedRows > 0;
}

export async function countLikesForListing(listingId: string): Promise<number> {
  if (!isRemoteDatabaseConfigured()) return 0;

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM marketplace_likes
     WHERE listing_id = ?`,
    [listingId]
  );
  return Number(rows[0]?.total ?? 0);
}

export async function countLikesForListings(
  listingIds: string[]
): Promise<Record<string, number>> {
  if (listingIds.length === 0 || !isRemoteDatabaseConfigured()) return {};

  const placeholders = listingIds.map(() => "?").join(", ");
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT listing_id, COUNT(*) AS total
     FROM marketplace_likes
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

export async function listLikedListingIds(
  userId: number,
  listingIds: string[]
): Promise<string[]> {
  if (listingIds.length === 0 || !isRemoteDatabaseConfigured()) return [];

  const placeholders = listingIds.map(() => "?").join(", ");
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT listing_id
     FROM marketplace_likes
     WHERE user_id = ? AND listing_id IN (${placeholders})`,
    [userId, ...listingIds]
  );
  return rows.map((row) => String(row.listing_id));
}
