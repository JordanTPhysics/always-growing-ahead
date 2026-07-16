import { pool } from "@/lib/db/pool";
import type { SavedSearch, SavedSearchKind } from "@/lib/db/types";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type SavedSearchRow = Omit<SavedSearch, "filters"> & {
  filters: string | Record<string, unknown>;
} & RowDataPacket;

function parseSavedSearch(row: SavedSearchRow): SavedSearch {
  return {
    ...row,
    filters:
      typeof row.filters === "string" ? JSON.parse(row.filters) : row.filters,
  };
}

export async function createSavedSearch(input: {
  userId: number;
  kind: SavedSearchKind;
  name: string;
  filters: Record<string, unknown>;
}): Promise<SavedSearch> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO saved_searches (user_id, kind, name, filters)
     VALUES (?, ?, ?, ?)`,
    [input.userId, input.kind, input.name, JSON.stringify(input.filters)]
  );
  const [rows] = await pool.execute<SavedSearchRow[]>(
    "SELECT * FROM saved_searches WHERE id = ? LIMIT 1",
    [result.insertId]
  );
  if (!rows[0]) throw new Error("Failed to load created saved search");
  return parseSavedSearch(rows[0]);
}

export async function listSavedSearchesForUser(
  userId: number,
  kind?: SavedSearchKind
): Promise<SavedSearch[]> {
  const [rows] = await pool.execute<SavedSearchRow[]>(
    `SELECT * FROM saved_searches
     WHERE user_id = ?${kind ? " AND kind = ?" : ""}
     ORDER BY created_at DESC`,
    kind ? [userId, kind] : [userId]
  );
  return rows.map(parseSavedSearch);
}

export async function deleteSavedSearch(
  savedSearchId: number,
  userId: number
): Promise<void> {
  await pool.execute("DELETE FROM saved_searches WHERE id = ? AND user_id = ?", [
    savedSearchId,
    userId,
  ]);
}
