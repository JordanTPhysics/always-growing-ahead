import { pool } from "@/lib/db/pool";
import type {
  Favourite,
  FavouriteListItem,
  FavouriteTargetType,
} from "@/lib/db/types";
import { isMockMapDataEnabled } from "@/lib/mock/nottingham";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type FavouriteRow = Favourite & RowDataPacket;

type FavouriteListRow = FavouriteListItem & RowDataPacket;

export async function addFavourite(input: {
  userId: number;
  targetType: FavouriteTargetType;
  targetId: number;
}): Promise<{ favourite: Favourite; created: boolean }> {
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO favourites (user_id, target_type, target_id)
       VALUES (?, ?, ?)`,
      [input.userId, input.targetType, input.targetId]
    );
    const [rows] = await pool.execute<FavouriteRow[]>(
      "SELECT * FROM favourites WHERE id = ? LIMIT 1",
      [result.insertId]
    );
    if (!rows[0]) throw new Error("Failed to load created favourite");
    return { favourite: rows[0], created: true };
  } catch (error) {
    const errno = (error as { errno?: number }).errno;
    if (errno !== 1062) throw error;

    const [rows] = await pool.execute<FavouriteRow[]>(
      `SELECT * FROM favourites
       WHERE user_id = ? AND target_type = ? AND target_id = ?
       LIMIT 1`,
      [input.userId, input.targetType, input.targetId]
    );
    if (!rows[0]) throw error;
    return { favourite: rows[0], created: false };
  }
}

export async function removeFavourite(input: {
  userId: number;
  targetType: FavouriteTargetType;
  targetId: number;
}): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM favourites
     WHERE user_id = ? AND target_type = ? AND target_id = ?`,
    [input.userId, input.targetType, input.targetId]
  );
  return result.affectedRows > 0;
}

export async function listFavouritesForUser(
  userId: number,
  targetType?: FavouriteTargetType
): Promise<FavouriteListItem[]> {
  if (isMockMapDataEnabled()) return [];
  const [rows] = await pool.execute<FavouriteListRow[]>(
    `SELECT
       f.*,
       CASE f.target_type
         WHEN 'job' THEN j.title
         WHEN 'worker' THEN w.headline
         WHEN 'employer' THEN e.company_name
         WHEN 'education' THEN er.title_en
       END AS label,
       CASE f.target_type
         WHEN 'job' THEN je.company_name
         WHEN 'worker' THEN COALESCE(w.postcode, w.address_text)
         WHEN 'employer' THEN e.website_url
         WHEN 'education' THEN er.topic
       END AS subtitle,
       CASE f.target_type
         WHEN 'education' THEN
           CONCAT(
             '/education/',
             CASE er.media_type
               WHEN 'short_video' THEN 'short-videos'
               WHEN 'lecture' THEN 'lectures'
               ELSE 'pdf'
             END
           )
         ELSE NULL
       END AS link_base
     FROM favourites f
     LEFT JOIN jobs j
       ON f.target_type = 'job' AND f.target_id = j.id
     LEFT JOIN employer_profiles je
       ON f.target_type = 'job' AND je.id = j.employer_id
     LEFT JOIN worker_profiles w
       ON f.target_type = 'worker' AND f.target_id = w.id
     LEFT JOIN employer_profiles e
       ON f.target_type = 'employer' AND f.target_id = e.id
     LEFT JOIN education_resources er
       ON f.target_type = 'education' AND f.target_id = er.id
     WHERE f.user_id = ?${targetType ? " AND f.target_type = ?" : ""}
     ORDER BY f.created_at DESC`,
    targetType ? [userId, targetType] : [userId]
  );

  return rows.map((row) => ({
    ...row,
    label: row.label ?? null,
    subtitle: row.subtitle ?? null,
    link_base: row.link_base ?? null,
  }));
}

export async function listFavouritedTargetIds(
  userId: number,
  targetType: FavouriteTargetType,
  targetIds: number[]
): Promise<number[]> {
  if (targetIds.length === 0 || isMockMapDataEnabled()) return [];

  const placeholders = targetIds.map(() => "?").join(", ");
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT target_id
     FROM favourites
     WHERE user_id = ? AND target_type = ? AND target_id IN (${placeholders})`,
    [userId, targetType, ...targetIds]
  );
  return rows.map((row) => Number(row.target_id));
}
