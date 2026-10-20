import { isRemoteDatabaseConfigured } from "@/lib/db/config";
import { pool } from "@/lib/db/pool";
import type { SponsoredItemRecord } from "@/lib/db/types";
import type { SponsoredItem } from "@/lib/sponsored/content";
import type { RowDataPacket } from "mysql2";

type SponsoredRow = SponsoredItemRecord & RowDataPacket;

export type SponsoredItemUpdate = {
  href: string;
  tagline: string;
  image_url: string;
};

export function toCarouselItem(row: SponsoredItemRecord): SponsoredItem {
  return {
    id: row.slug,
    href: row.href,
    title: row.tagline,
    description: row.description ?? undefined,
    imageUrl: row.image_url,
  };
}

export async function listSponsoredItems(): Promise<SponsoredItemRecord[]> {
  if (!isRemoteDatabaseConfigured()) return [];
  const [rows] = await pool.execute<SponsoredRow[]>(
    `SELECT id, slug, href, tagline, description, image_url, sort_order, updated_at
     FROM sponsored_items
     ORDER BY sort_order ASC, id ASC`
  );
  return rows;
}

export async function getSponsoredItemById(
  id: number
): Promise<SponsoredItemRecord | null> {
  if (!isRemoteDatabaseConfigured()) return null;
  const [rows] = await pool.execute<SponsoredRow[]>(
    `SELECT id, slug, href, tagline, description, image_url, sort_order, updated_at
     FROM sponsored_items
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function updateSponsoredItem(
  id: number,
  input: SponsoredItemUpdate
): Promise<SponsoredItemRecord | null> {
  const existing = await getSponsoredItemById(id);
  if (!existing) return null;

  await pool.execute(
    `UPDATE sponsored_items
     SET href = ?, tagline = ?, image_url = ?
     WHERE id = ?`,
    [input.href.trim(), input.tagline.trim(), input.image_url.trim(), id]
  );

  return getSponsoredItemById(id);
}
