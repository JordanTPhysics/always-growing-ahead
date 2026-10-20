import { pool } from "@/lib/db/pool";
import type {
  EducationComment,
  EducationCommentListItem,
} from "@/lib/db/types";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type CommentRow = EducationComment & RowDataPacket;

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

function mapCommentRow(row: CommentListRow): EducationCommentListItem {
  return {
    id: row.id,
    resource_id: row.resource_id,
    user_id: row.user_id,
    body: row.body,
    created_at: row.created_at,
    author_name: displayAuthorName(row.username, row.email),
  };
}

export async function listCommentsForEducationResource(
  resourceId: number
): Promise<EducationCommentListItem[]> {
  const [rows] = await pool.execute<CommentListRow[]>(
    `SELECT c.*, u.username, u.email
     FROM education_comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.resource_id = ?
     ORDER BY c.created_at ASC`,
    [resourceId]
  );

  return rows.map(mapCommentRow);
}

export async function countCommentsForEducationResource(
  resourceId: number
): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM education_comments
     WHERE resource_id = ?`,
    [resourceId]
  );
  return Number(rows[0]?.total ?? 0);
}

export async function createEducationComment(input: {
  resourceId: number;
  userId: number;
  body: string;
}): Promise<EducationCommentListItem> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO education_comments (resource_id, user_id, body)
     VALUES (?, ?, ?)`,
    [input.resourceId, input.userId, input.body]
  );

  const [rows] = await pool.execute<CommentListRow[]>(
    `SELECT c.*, u.username, u.email
     FROM education_comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.id = ?
     LIMIT 1`,
    [result.insertId]
  );

  const row = rows[0];
  if (!row) throw new Error("Failed to load created comment");
  return mapCommentRow(row);
}

export async function countCommentsForEducationResources(
  resourceIds: number[]
): Promise<Record<number, number>> {
  if (resourceIds.length === 0) return {};

  const placeholders = resourceIds.map(() => "?").join(", ");
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT resource_id, COUNT(*) AS total
     FROM education_comments
     WHERE resource_id IN (${placeholders})
     GROUP BY resource_id`,
    resourceIds
  );

  const counts: Record<number, number> = {};
  for (const id of resourceIds) counts[id] = 0;
  for (const row of rows) {
    counts[Number(row.resource_id)] = Number(row.total);
  }
  return counts;
}
