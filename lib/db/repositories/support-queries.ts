import { pool } from "@/lib/db/pool";
import type { SupportQuery } from "@/lib/db/types";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type SupportQueryRow = SupportQuery & RowDataPacket;

export async function createSupportQuery(input: {
  userId?: number | null;
  name?: string | null;
  email: string;
  phone?: string | null;
  message: string;
  locale?: string;
}): Promise<SupportQuery> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO support_queries (user_id, name, email, phone, message, locale)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.userId ?? null,
      input.name?.trim() || null,
      input.email.trim().toLowerCase(),
      input.phone?.trim() || null,
      input.message.trim(),
      input.locale ?? "en",
    ]
  );
  const [rows] = await pool.execute<SupportQueryRow[]>(
    "SELECT * FROM support_queries WHERE id = ? LIMIT 1",
    [result.insertId]
  );
  if (!rows[0]) throw new Error("Failed to load support query");
  return rows[0];
}
