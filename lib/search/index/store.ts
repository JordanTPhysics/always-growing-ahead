import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "@/lib/db/pool";
import type { ActiveLocale } from "@/lib/i18n/locales";
import { EMBEDDING_MODEL, embeddingConfigured } from "@/lib/search/embed-client";
import { translatorConfigured } from "@/lib/search/translate";
import {
  isSearchEntityType,
  type SearchEntityType,
} from "@/lib/search/index/types";

export type QueueItem = {
  entityType: SearchEntityType;
  entityId: number;
  generation: number;
};

export type StoredTranslation = {
  fieldName: "title" | "description";
  locale: ActiveLocale;
  sourceLocale: string;
  origin: "human" | "machine";
  sourceHash: string;
  text: string;
};

type QueueRow = RowDataPacket & {
  entity_type: string;
  entity_id: number;
  generation: number;
};

type TranslationRow = RowDataPacket & {
  field_name: string;
  locale: string;
  source_locale: string;
  origin: "human" | "machine";
  source_hash: string;
  text: string;
};

function isFieldName(value: string): value is StoredTranslation["fieldName"] {
  return value === "title" || value === "description";
}

function isLocale(value: string): value is ActiveLocale {
  return value === "en" || value === "ar" || value === "ckb";
}

export async function enqueueSearchRow(
  entityType: SearchEntityType,
  entityId: number
): Promise<void> {
  await pool.execute(
    `INSERT INTO search_index_queue
       (entity_type, entity_id, generation, attempts, available_at, locked_at, last_error)
     VALUES (?, ?, 1, 0, UTC_TIMESTAMP(), NULL, NULL) AS incoming
     ON DUPLICATE KEY UPDATE
       generation = search_index_queue.generation + 1,
       attempts = 0,
       available_at = UTC_TIMESTAMP(),
       locked_at = NULL,
       last_error = NULL`,
    [entityType, entityId]
  );
}

export async function purgeSearchIndex(
  entityType: SearchEntityType,
  entityId: number
): Promise<void> {
  await pool.execute(
    `DELETE FROM content_translations WHERE entity_type = ? AND entity_id = ?`,
    [entityType, entityId]
  );
  await pool.execute(
    `DELETE FROM content_embeddings WHERE entity_type = ? AND entity_id = ?`,
    [entityType, entityId]
  );
  await pool.execute(
    `DELETE FROM search_index_queue WHERE entity_type = ? AND entity_id = ?`,
    [entityType, entityId]
  );
}

export async function claimNext(
  order: "newest" | "oldest"
): Promise<QueueItem | null> {
  const direction = order === "newest" ? "DESC" : "ASC";
  const [rows] = await pool.query<QueueRow[]>(
    `SELECT entity_type, entity_id, generation
     FROM search_index_queue
     WHERE available_at <= UTC_TIMESTAMP()
       AND (locked_at IS NULL OR locked_at < UTC_TIMESTAMP() - INTERVAL 10 MINUTE)
     ORDER BY updated_at ${direction}
     LIMIT 5`
  );

  for (const row of rows) {
    if (!isSearchEntityType(row.entity_type)) {
      await pool.execute(
        `DELETE FROM search_index_queue WHERE entity_type = ? AND entity_id = ?`,
        [row.entity_type, row.entity_id]
      );
      continue;
    }
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE search_index_queue
       SET locked_at = UTC_TIMESTAMP()
       WHERE entity_type = ? AND entity_id = ? AND generation = ?
         AND available_at <= UTC_TIMESTAMP()
         AND (locked_at IS NULL OR locked_at < UTC_TIMESTAMP() - INTERVAL 10 MINUTE)`,
      [row.entity_type, row.entity_id, row.generation]
    );
    if (result.affectedRows === 1) {
      return {
        entityType: row.entity_type,
        entityId: Number(row.entity_id),
        generation: Number(row.generation),
      };
    }
  }
  return null;
}

async function queueStill(
  item: QueueItem,
  sql: string,
  params: Array<string | number>
): Promise<void> {
  await pool.execute(sql, [...params, item.entityType, item.entityId, item.generation]);
}

export async function completeQueueItem(item: QueueItem): Promise<void> {
  await queueStill(
    item,
    `DELETE FROM search_index_queue
     WHERE entity_type = ? AND entity_id = ? AND generation = ?`,
    []
  );
}

export async function releaseQueueItem(item: QueueItem): Promise<void> {
  await queueStill(
    item,
    `UPDATE search_index_queue
     SET locked_at = NULL
     WHERE entity_type = ? AND entity_id = ? AND generation = ?`,
    []
  );
}

export async function retryQueueItem(item: QueueItem, error: string): Promise<void> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT attempts FROM search_index_queue
     WHERE entity_type = ? AND entity_id = ? AND generation = ?`,
    [item.entityType, item.entityId, item.generation]
  );
  if (!rows[0]) return;
  const attempts = Number(rows[0].attempts ?? 0) + 1;
  const minutes = Math.min(360, 2 ** Math.min(attempts, 8));
  await pool.execute(
    `UPDATE search_index_queue
     SET attempts = ?,
         locked_at = NULL,
         available_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE),
         last_error = ?
     WHERE entity_type = ? AND entity_id = ? AND generation = ?`,
    [
      attempts,
      minutes,
      error.slice(0, 500),
      item.entityType,
      item.entityId,
      item.generation,
    ]
  );
}

export async function deferQueueItem(item: QueueItem): Promise<void> {
  await queueStill(
    item,
    `UPDATE search_index_queue
     SET locked_at = NULL,
         last_error = 'monthly translation budget',
         available_at = DATE_FORMAT(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 MONTH), '%Y-%m-01 00:00:00')
     WHERE entity_type = ? AND entity_id = ? AND generation = ?`,
    []
  );
}

export async function listTranslations(
  entityType: SearchEntityType,
  entityId: number
): Promise<StoredTranslation[]> {
  const [rows] = await pool.execute<TranslationRow[]>(
    `SELECT field_name, locale, source_locale, origin, source_hash, text
     FROM content_translations
     WHERE entity_type = ? AND entity_id = ?`,
    [entityType, entityId]
  );
  return rows.flatMap((row) => {
    if (!isFieldName(row.field_name) || !isLocale(row.locale)) return [];
    return [
      {
        fieldName: row.field_name,
        locale: row.locale,
        sourceLocale: row.source_locale,
        origin: row.origin,
        sourceHash: row.source_hash,
        text: row.text,
      },
    ];
  });
}

export async function upsertTranslation(input: {
  entityType: SearchEntityType;
  entityId: number;
  fieldName: StoredTranslation["fieldName"];
  locale: ActiveLocale;
  sourceLocale: string;
  origin: "human" | "machine";
  sourceHash: string;
  text: string;
}): Promise<void> {
  await pool.execute(
    `INSERT INTO content_translations
       (entity_type, entity_id, field_name, locale, source_locale, origin, source_hash, text)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) AS incoming
     ON DUPLICATE KEY UPDATE
       text = IF(
         content_translations.origin = 'human' AND incoming.origin = 'machine',
         content_translations.text,
         incoming.text
       ),
       source_locale = IF(
         content_translations.origin = 'human' AND incoming.origin = 'machine',
         content_translations.source_locale,
         incoming.source_locale
       ),
       source_hash = IF(
         content_translations.origin = 'human' AND incoming.origin = 'machine',
         content_translations.source_hash,
         incoming.source_hash
       ),
       origin = IF(
         content_translations.origin = 'human' AND incoming.origin = 'machine',
         content_translations.origin,
         incoming.origin
       )`,
    [
      input.entityType,
      input.entityId,
      input.fieldName,
      input.locale,
      input.sourceLocale,
      input.origin,
      input.sourceHash,
      input.text,
    ]
  );
}

export async function deleteHumanTranslation(
  entityType: SearchEntityType,
  entityId: number,
  fieldName: StoredTranslation["fieldName"],
  locale: ActiveLocale
): Promise<void> {
  await pool.execute(
    `DELETE FROM content_translations
     WHERE entity_type = ? AND entity_id = ? AND field_name = ? AND locale = ? AND origin = 'human'`,
    [entityType, entityId, fieldName, locale]
  );
}

export async function deleteFieldTranslations(
  entityType: SearchEntityType,
  entityId: number,
  fieldName: StoredTranslation["fieldName"]
): Promise<void> {
  await pool.execute(
    `DELETE FROM content_translations
     WHERE entity_type = ? AND entity_id = ? AND field_name = ?`,
    [entityType, entityId, fieldName]
  );
}

export async function embeddingSourceHash(
  entityType: SearchEntityType,
  entityId: number
): Promise<string | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT source_hash FROM content_embeddings
     WHERE entity_type = ? AND entity_id = ? AND model = ?`,
    [entityType, entityId, EMBEDDING_MODEL]
  );
  const hash = rows[0]?.source_hash;
  return typeof hash === "string" ? hash : null;
}

export async function upsertEmbedding(input: {
  entityType: SearchEntityType;
  entityId: number;
  sourceHash: string;
  vectorJson: string;
}): Promise<void> {
  await pool.execute(
    `INSERT INTO content_embeddings (entity_type, entity_id, model, source_hash, vector)
     VALUES (?, ?, ?, ?, CAST(? AS JSON)) AS incoming
     ON DUPLICATE KEY UPDATE
       model = incoming.model,
       source_hash = incoming.source_hash,
       vector = incoming.vector`,
    [
      input.entityType,
      input.entityId,
      EMBEDDING_MODEL,
      input.sourceHash,
      input.vectorJson,
    ]
  );
}

export async function deleteEmbedding(
  entityType: SearchEntityType,
  entityId: number
): Promise<void> {
  await pool.execute(
    `DELETE FROM content_embeddings WHERE entity_type = ? AND entity_id = ?`,
    [entityType, entityId]
  );
}

export function usageMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function translationCharactersUsed(): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT characters_used FROM search_translation_usage WHERE period_month = ?`,
    [usageMonth()]
  );
  return Number(rows[0]?.characters_used ?? 0);
}

export async function recordTranslationCharacters(count: number): Promise<void> {
  if (count <= 0) return;
  await pool.execute(
    `INSERT INTO search_translation_usage (period_month, characters_used)
     VALUES (?, ?) AS incoming
     ON DUPLICATE KEY UPDATE
       characters_used = search_translation_usage.characters_used + incoming.characters_used`,
    [usageMonth(), count]
  );
}

const BACKFILL: Array<{
  entityType: SearchEntityType;
  from: string;
  id: string;
  where: string;
  text: string;
}> = [
  {
    entityType: "job",
    from: "jobs j",
    id: "j.id",
    where: "j.status = 'active'",
    text: "CHAR_LENGTH(TRIM(j.title)) > 0 OR CHAR_LENGTH(TRIM(COALESCE(j.description, ''))) > 0",
  },
  {
    entityType: "worker",
    from: "worker_profiles w",
    id: "w.id",
    where: "w.visibility = 'public'",
    text: "CHAR_LENGTH(TRIM(COALESCE(w.headline, ''))) > 0 OR CHAR_LENGTH(TRIM(COALESCE(w.bio, ''))) > 0",
  },
  {
    entityType: "employer",
    from: "employer_profiles e",
    id: "e.id",
    where: "1 = 1",
    text: "CHAR_LENGTH(TRIM(COALESCE(e.company_name, ''))) > 0 OR CHAR_LENGTH(TRIM(COALESCE(e.company_description, ''))) > 0",
  },
  {
    entityType: "education",
    from: "education_resources r",
    id: "r.id",
    where: "r.is_published = 1",
    text: `CHAR_LENGTH(TRIM(r.title_en)) > 0
      OR CHAR_LENGTH(TRIM(COALESCE(r.title_ar, ''))) > 0
      OR CHAR_LENGTH(TRIM(COALESCE(r.title_ckb, ''))) > 0
      OR CHAR_LENGTH(TRIM(COALESCE(r.description_en, ''))) > 0
      OR CHAR_LENGTH(TRIM(COALESCE(r.description_ar, ''))) > 0
      OR CHAR_LENGTH(TRIM(COALESCE(r.description_ckb, ''))) > 0`,
  },
  {
    entityType: "marketplace",
    from: "marketplace_listings l",
    id: "l.id",
    where: "1 = 1",
    text: "CHAR_LENGTH(TRIM(l.title)) > 0 OR CHAR_LENGTH(TRIM(COALESCE(l.description, ''))) > 0",
  },
];

/** Queue indexable rows that have never been embedded, or never fully translated. */
export async function enqueueMissingDocuments(): Promise<number> {
  const embed = embeddingConfigured() ? 1 : 0;
  const azure = translatorConfigured() ? 1 : 0;
  if (!embed && !azure) return 0;

  let enqueued = 0;
  for (const spec of BACKFILL) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT IGNORE INTO search_index_queue (entity_type, entity_id)
       SELECT ?, ${spec.id}
       FROM ${spec.from}
       WHERE ${spec.where}
         AND NOT EXISTS (
           SELECT 1 FROM search_index_queue q
           WHERE q.entity_type = ? AND q.entity_id = ${spec.id}
         )
         AND (
           (? = 1 AND NOT EXISTS (
             SELECT 1 FROM content_embeddings emb
             WHERE emb.entity_type = ? AND emb.entity_id = ${spec.id} AND emb.model = ?
           ))
           OR (? = 1 AND (${spec.text}) AND (
             NOT EXISTS (
               SELECT 1 FROM content_translations missing
               WHERE missing.entity_type = ? AND missing.entity_id = ${spec.id}
             )
             OR EXISTS (
               SELECT 1 FROM content_translations partial
               WHERE partial.entity_type = ? AND partial.entity_id = ${spec.id}
               GROUP BY partial.field_name
               HAVING COUNT(DISTINCT partial.locale) < 3
             )
           ))
         )`,
      [
        spec.entityType,
        spec.entityType,
        embed,
        spec.entityType,
        EMBEDDING_MODEL,
        azure,
        spec.entityType,
        spec.entityType,
      ]
    );
    enqueued += result.affectedRows;
  }
  return enqueued;
}
