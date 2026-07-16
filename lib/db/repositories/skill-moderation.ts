import { pool } from "@/lib/db/pool";
import type {
  SkillModeration,
  SkillModerationStatus,
} from "@/lib/db/types";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type SkillModerationRow = SkillModeration & RowDataPacket;

export async function createSkillModeration(input: {
  proposedName: string;
  proposedByUserId: number;
  skillId?: number | null;
}): Promise<SkillModeration> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO skill_moderation (skill_id, proposed_name, proposed_by_user_id)
     VALUES (?, ?, ?)`,
    [input.skillId ?? null, input.proposedName, input.proposedByUserId]
  );
  const [rows] = await pool.execute<SkillModerationRow[]>(
    "SELECT * FROM skill_moderation WHERE id = ? LIMIT 1",
    [result.insertId]
  );
  if (!rows[0]) throw new Error("Failed to load skill moderation request");
  return rows[0];
}

export async function listSkillModeration(
  status: SkillModerationStatus = "pending"
): Promise<SkillModeration[]> {
  const [rows] = await pool.execute<SkillModerationRow[]>(
    `SELECT * FROM skill_moderation
     WHERE status = ?
     ORDER BY created_at ASC`,
    [status]
  );
  return rows;
}

export async function getSkillModerationById(
  id: number
): Promise<SkillModeration | null> {
  const [rows] = await pool.execute<SkillModerationRow[]>(
    "SELECT * FROM skill_moderation WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] ?? null;
}

export async function updateSkillModerationStatus(
  id: number,
  status: Exclude<SkillModerationStatus, "pending">
): Promise<void> {
  await pool.execute("UPDATE skill_moderation SET status = ? WHERE id = ?", [
    status,
    id,
  ]);
}
