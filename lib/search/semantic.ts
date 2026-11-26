import type { RowDataPacket } from "mysql2";
import { isRemoteDatabaseConfigured } from "@/lib/db/config";
import { pool } from "@/lib/db/pool";
import { embedTexts, embeddingConfigured, EMBEDDING_MODEL } from "@/lib/search/embed-client";
import { isSearchEntityType, type SearchEntityType } from "@/lib/search/index/types";
import { cosineSimilarity, vectorFromJson } from "@/lib/search/vectors";

/** multilingual-e5 cosine scores for a loose paraphrase sit around here. */
const MIN_SCORE = 0.72;
const MAX_VECTORS = 5000;
const PER_TYPE = 8;

export const SEMANTIC_MATCH_RANK = 7;

export type SemanticHit = {
  entityType: SearchEntityType;
  entityId: number;
  score: number;
};

type EmbeddingRow = RowDataPacket & {
  entity_type: string;
  entity_id: number;
  vector: unknown;
};

export async function findSemanticMatches(query: string): Promise<SemanticHit[]> {
  if (!embeddingConfigured() || !isRemoteDatabaseConfigured()) return [];
  try {
    const vectors = await embedTexts([query], "query", 4000);
    const queryVector = vectors?.[0];
    if (!queryVector) return [];

    const [rows] = await pool.execute<EmbeddingRow[]>(
      `SELECT entity_type, entity_id, vector
       FROM content_embeddings
       WHERE model = ?
       ORDER BY updated_at DESC
       LIMIT ${MAX_VECTORS}`,
      [EMBEDDING_MODEL]
    );

    const best = new Map<SearchEntityType, SemanticHit[]>();
    for (const row of rows) {
      if (!isSearchEntityType(row.entity_type)) continue;
      const vector = vectorFromJson(row.vector);
      if (!vector) continue;
      const score = cosineSimilarity(queryVector, vector);
      if (score < MIN_SCORE) continue;
      const list = best.get(row.entity_type) ?? [];
      list.push({
        entityType: row.entity_type,
        entityId: Number(row.entity_id),
        score,
      });
      best.set(row.entity_type, list);
    }

    const matches: SemanticHit[] = [];
    for (const list of best.values()) {
      list.sort((left, right) => right.score - left.score);
      matches.push(...list.slice(0, PER_TYPE));
    }
    return matches;
  } catch (error) {
    console.error("[search] semantic search failed", error);
    return [];
  }
}
