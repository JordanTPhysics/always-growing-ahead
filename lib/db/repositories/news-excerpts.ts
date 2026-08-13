import { pool } from "@/lib/db/pool";
import type { NewsExcerpt } from "@/lib/db/types";
import { isMockMapDataEnabled } from "@/lib/mock/nottingham";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type NewsExcerptRow = Omit<NewsExcerpt, "is_published"> &
  RowDataPacket & { is_published: number | boolean };

function mapRow(row: NewsExcerptRow): NewsExcerpt {
  return {
    ...row,
    is_published: Boolean(row.is_published),
  };
}

export type NewsExcerptInput = {
  body_en: string;
  body_ar?: string | null;
  body_ckb?: string | null;
  sort_order?: number;
  is_published?: boolean;
  created_by?: number | null;
};

export async function listPublishedNewsExcerpts(): Promise<NewsExcerpt[]> {
  if (isMockMapDataEnabled()) return [];
  const [rows] = await pool.execute<NewsExcerptRow[]>(
    `SELECT * FROM news_excerpts
     WHERE is_published = 1
     ORDER BY sort_order ASC, id ASC`
  );
  return rows.map(mapRow);
}

export async function listAllNewsExcerpts(): Promise<NewsExcerpt[]> {
  if (isMockMapDataEnabled()) return [];
  const [rows] = await pool.execute<NewsExcerptRow[]>(
    `SELECT * FROM news_excerpts
     ORDER BY sort_order ASC, id ASC`
  );
  return rows.map(mapRow);
}

export async function getNewsExcerptById(
  id: number
): Promise<NewsExcerpt | null> {
  if (isMockMapDataEnabled()) return null;
  const [rows] = await pool.execute<NewsExcerptRow[]>(
    "SELECT * FROM news_excerpts WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function createNewsExcerpt(
  input: NewsExcerptInput
): Promise<NewsExcerpt> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO news_excerpts (
      body_en, body_ar, body_ckb, sort_order, is_published, created_by
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.body_en.trim(),
      input.body_ar?.trim() || null,
      input.body_ckb?.trim() || null,
      input.sort_order ?? 0,
      input.is_published === false ? 0 : 1,
      input.created_by ?? null,
    ]
  );
  const created = await getNewsExcerptById(result.insertId);
  if (!created) throw new Error("Failed to load created news excerpt");
  return created;
}

export async function updateNewsExcerpt(
  id: number,
  input: Partial<NewsExcerptInput>
): Promise<NewsExcerpt | null> {
  const existing = await getNewsExcerptById(id);
  if (!existing) return null;

  const next = {
    body_en: input.body_en?.trim() ?? existing.body_en,
    body_ar:
      input.body_ar !== undefined
        ? input.body_ar?.trim() || null
        : existing.body_ar,
    body_ckb:
      input.body_ckb !== undefined
        ? input.body_ckb?.trim() || null
        : existing.body_ckb,
    sort_order: input.sort_order ?? existing.sort_order,
    is_published:
      input.is_published !== undefined
        ? input.is_published
        : existing.is_published,
  };

  await pool.execute(
    `UPDATE news_excerpts SET
      body_en = ?, body_ar = ?, body_ckb = ?,
      sort_order = ?, is_published = ?
     WHERE id = ?`,
    [
      next.body_en,
      next.body_ar,
      next.body_ckb,
      next.sort_order,
      next.is_published ? 1 : 0,
      id,
    ]
  );

  return getNewsExcerptById(id);
}

export async function deleteNewsExcerpt(id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    "DELETE FROM news_excerpts WHERE id = ?",
    [id]
  );
  return result.affectedRows > 0;
}
