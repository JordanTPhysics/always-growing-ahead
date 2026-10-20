import { pool } from "@/lib/db/pool";
import type { RowDataPacket } from "mysql2";

export async function listUserIdsExcept(excludeUserId: number): Promise<number[]> {
  const [rows] = await pool.execute<(RowDataPacket & { id: number })[]>(
    "SELECT id FROM users WHERE id <> ?",
    [excludeUserId]
  );
  return rows.map((row) => Number(row.id));
}

/** Workers who turned on "actively looking" on their profile. */
export async function listActivelyLookingUserIds(
  excludeUserId: number
): Promise<number[]> {
  const [rows] = await pool.execute<(RowDataPacket & { user_id: number })[]>(
    `SELECT DISTINCT user_id
     FROM worker_profiles
     WHERE actively_looking = 1
       AND user_id IS NOT NULL
       AND user_id <> ?`,
    [excludeUserId]
  );
  return rows.map((row) => Number(row.user_id));
}
