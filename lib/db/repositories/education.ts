import { isRemoteDatabaseConfigured } from "@/lib/db/config";
import { pool } from "@/lib/db/pool";
import type { EducationMediaType, EducationResource } from "@/lib/db/types";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type EducationRow = Omit<EducationResource, "is_published"> &
  RowDataPacket & { is_published: number | boolean };

function mapRow(row: EducationRow): EducationResource {
  return {
    ...row,
    is_published: Boolean(row.is_published),
  };
}

export type EducationResourceInput = {
  topic: string;
  media_type: EducationMediaType;
  file_url: string;
  file_name: string;
  mime_type: string;
  byte_size: number;
  title_en: string;
  title_ar?: string | null;
  title_ckb?: string | null;
  description_en?: string | null;
  description_ar?: string | null;
  description_ckb?: string | null;
  sort_order?: number;
  is_published?: boolean;
  created_by?: number | null;
};

export async function listPublishedEducationResources(): Promise<
  EducationResource[]
> {
  if (!isRemoteDatabaseConfigured()) return [];
  const [rows] = await pool.execute<EducationRow[]>(
    `SELECT * FROM education_resources
     WHERE is_published = 1
     ORDER BY topic ASC, sort_order ASC, id ASC`
  );
  return rows.map(mapRow);
}

export async function listPublishedEducationResourcesByMediaType(
  mediaType: EducationMediaType
): Promise<EducationResource[]> {
  if (!isRemoteDatabaseConfigured()) return [];
  const [rows] = await pool.execute<EducationRow[]>(
    `SELECT * FROM education_resources
     WHERE is_published = 1 AND media_type = ?
     ORDER BY topic ASC, sort_order ASC, id ASC`,
    [mediaType]
  );
  return rows.map(mapRow);
}

export async function listAllEducationResources(): Promise<EducationResource[]> {
  if (!isRemoteDatabaseConfigured()) return [];
  const [rows] = await pool.execute<EducationRow[]>(
    `SELECT * FROM education_resources
     ORDER BY topic ASC, sort_order ASC, id ASC`
  );
  return rows.map(mapRow);
}

export async function getEducationResourceById(
  id: number
): Promise<EducationResource | null> {
  if (!isRemoteDatabaseConfigured()) return null;
  const [rows] = await pool.execute<EducationRow[]>(
    "SELECT * FROM education_resources WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function createEducationResource(
  input: EducationResourceInput
): Promise<EducationResource> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO education_resources (
      topic, media_type, file_url, file_name, mime_type, byte_size,
      title_en, title_ar, title_ckb,
      description_en, description_ar, description_ckb,
      sort_order, is_published, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.topic.trim(),
      input.media_type,
      input.file_url,
      input.file_name,
      input.mime_type,
      input.byte_size,
      input.title_en.trim(),
      input.title_ar?.trim() || null,
      input.title_ckb?.trim() || null,
      input.description_en?.trim() || null,
      input.description_ar?.trim() || null,
      input.description_ckb?.trim() || null,
      input.sort_order ?? 0,
      input.is_published === false ? 0 : 1,
      input.created_by ?? null,
    ]
  );
  const created = await getEducationResourceById(result.insertId);
  if (!created) throw new Error("Failed to load created education resource");
  return created;
}

export async function updateEducationResource(
  id: number,
  input: Partial<EducationResourceInput>
): Promise<EducationResource | null> {
  const existing = await getEducationResourceById(id);
  if (!existing) return null;

  const next = {
    topic: input.topic?.trim() ?? existing.topic,
    media_type: input.media_type ?? existing.media_type,
    file_url: input.file_url ?? existing.file_url,
    file_name: input.file_name ?? existing.file_name,
    mime_type: input.mime_type ?? existing.mime_type,
    byte_size: input.byte_size ?? existing.byte_size,
    title_en: input.title_en?.trim() ?? existing.title_en,
    title_ar:
      input.title_ar !== undefined
        ? input.title_ar?.trim() || null
        : existing.title_ar,
    title_ckb:
      input.title_ckb !== undefined
        ? input.title_ckb?.trim() || null
        : existing.title_ckb,
    description_en:
      input.description_en !== undefined
        ? input.description_en?.trim() || null
        : existing.description_en,
    description_ar:
      input.description_ar !== undefined
        ? input.description_ar?.trim() || null
        : existing.description_ar,
    description_ckb:
      input.description_ckb !== undefined
        ? input.description_ckb?.trim() || null
        : existing.description_ckb,
    sort_order: input.sort_order ?? existing.sort_order,
    is_published:
      input.is_published !== undefined
        ? input.is_published
        : existing.is_published,
  };

  await pool.execute(
    `UPDATE education_resources SET
      topic = ?, media_type = ?, file_url = ?, file_name = ?, mime_type = ?, byte_size = ?,
      title_en = ?, title_ar = ?, title_ckb = ?,
      description_en = ?, description_ar = ?, description_ckb = ?,
      sort_order = ?, is_published = ?
     WHERE id = ?`,
    [
      next.topic,
      next.media_type,
      next.file_url,
      next.file_name,
      next.mime_type,
      next.byte_size,
      next.title_en,
      next.title_ar,
      next.title_ckb,
      next.description_en,
      next.description_ar,
      next.description_ckb,
      next.sort_order,
      next.is_published ? 1 : 0,
      id,
    ]
  );

  return getEducationResourceById(id);
}

export async function deleteEducationResource(id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    "DELETE FROM education_resources WHERE id = ?",
    [id]
  );
  return result.affectedRows > 0;
}
