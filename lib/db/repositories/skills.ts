import { pool } from "@/lib/db/pool";
import type { Skill } from "@/lib/db/types";
import { isMockMapDataEnabled } from "@/lib/mock/nottingham";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

type SkillRow = Skill & RowDataPacket;

export async function listSkills(query?: string): Promise<Skill[]> {
  if (isMockMapDataEnabled()) return [];
  if (query?.trim()) {
    const [rows] = await pool.execute<SkillRow[]>(
      `SELECT * FROM skills
       WHERE name LIKE ?
       ORDER BY name ASC
       LIMIT 50`,
      [`%${query.trim()}%`]
    );
    return rows;
  }
  const [rows] = await pool.execute<SkillRow[]>(
    "SELECT * FROM skills ORDER BY category ASC, name ASC"
  );
  return rows;
}

export async function getSkillById(id: number): Promise<Skill | null> {
  const [rows] = await pool.execute<SkillRow[]>(
    "SELECT * FROM skills WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] ?? null;
}

export async function getSkillByName(name: string): Promise<Skill | null> {
  const [rows] = await pool.execute<SkillRow[]>(
    "SELECT * FROM skills WHERE name = ? LIMIT 1",
    [name.trim()]
  );
  return rows[0] ?? null;
}

export async function findOrCreateSkill(
  name: string,
  category: string | null = "Custom"
): Promise<Skill> {
  const trimmed = name.trim();
  const [existing] = await pool.execute<SkillRow[]>(
    "SELECT * FROM skills WHERE name = ? LIMIT 1",
    [trimmed]
  );
  if (existing[0]) return existing[0];

  const [result] = await pool.execute<ResultSetHeader>(
    "INSERT INTO skills (name, category) VALUES (?, ?)",
    [trimmed, category]
  );
  const skill = await getSkillById(result.insertId);
  if (!skill) throw new Error("Failed to load created skill");
  return skill;
}
