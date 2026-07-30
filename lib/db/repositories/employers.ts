import { pool } from "@/lib/db/pool";
import type { EmployerProfile } from "@/lib/db/types";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type EmployerRow = EmployerProfile & RowDataPacket;

export type EmployerProfileInput = {
  company_name?: string | null;
  company_description?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  linkedin_url?: string | null;
  actively_hiring?: boolean;
};

export async function getEmployerByUserId(
  userId: number
): Promise<EmployerProfile | null> {
  const [rows] = await pool.execute<EmployerRow[]>(
    "SELECT * FROM employer_profiles WHERE user_id = ? LIMIT 1",
    [userId]
  );
  return rows[0]
    ? { ...rows[0], actively_hiring: Boolean(rows[0].actively_hiring) }
    : null;
}

export async function getEmployerById(
  id: number
): Promise<EmployerProfile | null> {
  const [rows] = await pool.execute<EmployerRow[]>(
    "SELECT * FROM employer_profiles WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0]
    ? { ...rows[0], actively_hiring: Boolean(rows[0].actively_hiring) }
    : null;
}

export async function createEmployerProfile(
  userId: number,
  input: EmployerProfileInput = {}
): Promise<EmployerProfile> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO employer_profiles
      (user_id, company_name, company_description, logo_url, website_url,
       contact_email, contact_phone, linkedin_url, actively_hiring)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.company_name ?? null,
      input.company_description ?? null,
      input.logo_url ?? null,
      input.website_url ?? null,
      input.contact_email ?? null,
      input.contact_phone ?? null,
      input.linkedin_url ?? null,
      input.actively_hiring ? 1 : 0,
    ]
  );
  const profile = await getEmployerById(result.insertId);
  if (!profile) throw new Error("Failed to load created employer profile");
  return profile;
}

export async function updateEmployerProfile(
  employerId: number,
  input: EmployerProfileInput
): Promise<EmployerProfile> {
  const current = await getEmployerById(employerId);
  if (!current) throw new Error("Employer profile not found");

  await pool.execute(
    `UPDATE employer_profiles SET
      company_name = ?,
      company_description = ?,
      logo_url = ?,
      website_url = ?,
      contact_email = ?,
      contact_phone = ?,
      linkedin_url = ?,
      actively_hiring = ?
     WHERE id = ?`,
    [
      input.company_name !== undefined
        ? input.company_name
        : current.company_name,
      input.company_description !== undefined
        ? input.company_description
        : current.company_description,
      input.logo_url !== undefined ? input.logo_url : current.logo_url,
      input.website_url !== undefined ? input.website_url : current.website_url,
      input.contact_email !== undefined
        ? input.contact_email
        : current.contact_email,
      input.contact_phone !== undefined
        ? input.contact_phone
        : current.contact_phone,
      input.linkedin_url !== undefined
        ? input.linkedin_url
        : current.linkedin_url,
      (
        input.actively_hiring !== undefined
          ? input.actively_hiring
          : current.actively_hiring
      )
        ? 1
        : 0,
      employerId,
    ]
  );

  const updated = await getEmployerById(employerId);
  if (!updated) throw new Error("Failed to load updated employer profile");
  return updated;
}
