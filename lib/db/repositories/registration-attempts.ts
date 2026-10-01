import { isRemoteDatabaseConfigured } from "@/lib/db/config";
import { pool } from "@/lib/db/pool";
import type {
  RegistrationAttempt,
  RegistrationAttemptStatus,
} from "@/lib/db/types";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type RegistrationAttemptRow = RegistrationAttempt & RowDataPacket;

function blankToNull(value: string | null | undefined, max: number): string | null {
  const trimmed = value?.trim().slice(0, max) ?? "";
  return trimmed ? trimmed : null;
}

export async function createRegistrationAttempt(input: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  district?: string | null;
  errorMessage: string;
  locale?: string | null;
}): Promise<RegistrationAttempt> {
  const name = blankToNull(input.name, 100);
  const email = blankToNull(input.email, 255)?.toLowerCase() ?? null;
  const phone = blankToNull(input.phone, 100);
  const city = blankToNull(input.city, 100);
  const district = blankToNull(input.district, 100);
  const errorMessage = input.errorMessage.trim().slice(0, 2000);
  if (!name && !email && !phone) {
    throw new Error("Registration attempt is missing contact information");
  }
  if (!errorMessage) {
    throw new Error("Registration attempt is missing an error");
  }

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO registration_attempts
      (name, email, phone, city, district, error_message, locale)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, email, phone, city, district, errorMessage, input.locale?.trim().slice(0, 10) || "en"]
  );
  const created = await getRegistrationAttemptById(result.insertId);
  if (!created) throw new Error("Failed to load registration attempt");
  return created;
}

export async function getRegistrationAttemptById(
  id: number
): Promise<RegistrationAttempt | null> {
  if (!isRemoteDatabaseConfigured()) return null;
  const [rows] = await pool.execute<RegistrationAttemptRow[]>(
    "SELECT * FROM registration_attempts WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] ?? null;
}

export async function listRegistrationAttempts(
  status?: RegistrationAttemptStatus | null
): Promise<RegistrationAttempt[]> {
  if (!isRemoteDatabaseConfigured()) return [];
  if (status) {
    const [rows] = await pool.execute<RegistrationAttemptRow[]>(
      `SELECT * FROM registration_attempts
       WHERE status = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 200`,
      [status]
    );
    return rows;
  }
  const [rows] = await pool.execute<RegistrationAttemptRow[]>(
    `SELECT * FROM registration_attempts
     ORDER BY created_at DESC, id DESC
     LIMIT 200`
  );
  return rows;
}

export async function updateRegistrationAttemptStatus(
  id: number,
  status: RegistrationAttemptStatus
): Promise<RegistrationAttempt | null> {
  if (!isRemoteDatabaseConfigured()) return null;
  const [result] = await pool.execute<ResultSetHeader>(
    "UPDATE registration_attempts SET status = ? WHERE id = ?",
    [status, id]
  );
  if (result.affectedRows === 0) return null;
  return getRegistrationAttemptById(id);
}
