import { pool } from "@/lib/db/pool";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export type Contact = {
  id: number;
  job_id: number | null;
  worker_id: number;
  initiated_by: "worker" | "employer";
  created_at: Date;
};

type ContactRow = Contact & RowDataPacket;

export async function logContact(input: {
  job_id?: number | null;
  worker_id: number;
  initiated_by: "worker" | "employer";
}): Promise<Contact> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO contacts (job_id, worker_id, initiated_by)
     VALUES (?, ?, ?)`,
    [input.job_id ?? null, input.worker_id, input.initiated_by]
  );
  const [rows] = await pool.execute<ContactRow[]>(
    "SELECT * FROM contacts WHERE id = ? LIMIT 1",
    [result.insertId]
  );
  if (!rows[0]) throw new Error("Failed to load contact log");
  return rows[0];
}

export async function countContactsForJob(jobId: number): Promise<number> {
  const [rows] = await pool.execute<(RowDataPacket & { count: number })[]>(
    "SELECT COUNT(*) AS count FROM contacts WHERE job_id = ?",
    [jobId]
  );
  return Number(rows[0]?.count ?? 0);
}
