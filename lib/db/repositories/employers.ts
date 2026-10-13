import { pool } from "@/lib/db/pool";
import { pointParams } from "@/lib/db/repositories/helpers";
import type { BusinessMapResult, EmployerProfile } from "@/lib/db/types";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type EmployerRow = EmployerProfile & RowDataPacket;

const EMPLOYER_COLUMNS = `id, user_id, company_name, company_description, logo_url, website_url,
  contact_email, contact_phone, linkedin_url, actively_hiring,
  location_lat, location_lng, postcode, address_text, external_id,
  created_at, updated_at`;

export type EmployerProfileInput = {
  company_name?: string | null;
  company_description?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  linkedin_url?: string | null;
  actively_hiring?: boolean;
  location_lat?: number | null;
  location_lng?: number | null;
  postcode?: string | null;
  address_text?: string | null;
  external_id?: string | null;
};

export type DirectoryEmployerInput = {
  company_name: string;
  company_description?: string | null;
  website_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  linkedin_url?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  postcode?: string | null;
  address_text?: string | null;
  external_id?: string | null;
};

export type BusinessSearchFilters = {
  lat?: number;
  lng?: number;
  radiusMeters?: number | null;
  field?: string;
  limit?: number;
};

function normalizeEmployer(row: EmployerRow): EmployerProfile {
  return {
    ...row,
    user_id: row.user_id == null ? null : Number(row.user_id),
    actively_hiring: Boolean(row.actively_hiring),
    location_lat: row.location_lat == null ? null : Number(row.location_lat),
    location_lng: row.location_lng == null ? null : Number(row.location_lng),
    postcode: row.postcode ?? null,
    address_text: row.address_text ?? null,
    external_id: row.external_id ?? null,
  };
}

export async function getEmployerByUserId(
  userId: number
): Promise<EmployerProfile | null> {
  const [rows] = await pool.execute<EmployerRow[]>(
    `SELECT ${EMPLOYER_COLUMNS} FROM employer_profiles WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] ? normalizeEmployer(rows[0]) : null;
}

export async function getEmployerById(
  id: number
): Promise<EmployerProfile | null> {
  const [rows] = await pool.execute<EmployerRow[]>(
    `SELECT ${EMPLOYER_COLUMNS} FROM employer_profiles WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ? normalizeEmployer(rows[0]) : null;
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

async function getEmployerByExternalId(
  externalId: string
): Promise<EmployerProfile | null> {
  const [rows] = await pool.execute<EmployerRow[]>(
    `SELECT ${EMPLOYER_COLUMNS} FROM employer_profiles WHERE external_id = ? LIMIT 1`,
    [externalId]
  );
  return rows[0] ? normalizeEmployer(rows[0]) : null;
}

/**
 * Insert a directory business with no login, or update one that shares `external_id`.
 * Bulk imports are always stored as not actively hiring.
 */
export async function upsertDirectoryEmployer(
  input: DirectoryEmployerInput
): Promise<{ profile: EmployerProfile; created: boolean }> {
  const externalId = input.external_id?.trim() || null;
  const existing = externalId
    ? await getEmployerByExternalId(externalId)
    : null;
  const [lat, lng, pointLng, pointLat] = pointParams(
    input.location_lat,
    input.location_lng
  );

  if (!existing) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO employer_profiles
        (user_id, company_name, company_description, logo_url, website_url,
         contact_email, contact_phone, linkedin_url, actively_hiring,
         location_lat, location_lng, location_point, postcode, address_text, external_id)
       VALUES (
         NULL, ?, ?, NULL, ?,
         ?, ?, ?, 0,
         ?, ?, IF(? IS NULL OR ? IS NULL, NULL, ST_SRID(POINT(?, ?), 4326)), ?, ?, ?
       )`,
      [
        input.company_name,
        input.company_description ?? null,
        input.website_url ?? null,
        input.contact_email ?? null,
        input.contact_phone ?? null,
        input.linkedin_url ?? null,
        lat,
        lng,
        pointLng,
        pointLat,
        pointLng,
        pointLat,
        input.postcode ?? null,
        input.address_text ?? null,
        externalId,
      ]
    );
    const profile = await getEmployerById(result.insertId);
    if (!profile) throw new Error("Failed to load created business profile");
    return { profile, created: true };
  }

  await pool.execute(
    `UPDATE employer_profiles SET
      company_name = ?,
      company_description = ?,
      website_url = ?,
      contact_email = ?,
      contact_phone = ?,
      linkedin_url = ?,
      actively_hiring = 0,
      location_lat = ?,
      location_lng = ?,
      location_point = IF(? IS NULL OR ? IS NULL, NULL, ST_SRID(POINT(?, ?), 4326)),
      postcode = ?,
      address_text = ?
     WHERE id = ?`,
    [
      input.company_name,
      input.company_description ?? null,
      input.website_url ?? null,
      input.contact_email ?? null,
      input.contact_phone ?? null,
      input.linkedin_url ?? existing.linkedin_url,
      lat,
      lng,
      pointLng,
      pointLat,
      pointLng,
      pointLat,
      input.postcode ?? null,
      input.address_text ?? null,
      existing.id,
    ]
  );
  const profile = await getEmployerById(existing.id);
  if (!profile) throw new Error("Failed to load updated business profile");
  return { profile, created: false };
}

type BusinessSearchRow = BusinessMapResult & RowDataPacket;

/** Located businesses, including those that are not actively hiring. */
export async function searchDirectoryBusinesses(
  filters: BusinessSearchFilters = {}
): Promise<BusinessMapResult[]> {
  const safeLimit = Math.min(Math.max(Number(filters.limit) || 200, 1), 200);
  const hasOrigin =
    filters.lat != null &&
    filters.lng != null &&
    Number.isFinite(filters.lat) &&
    Number.isFinite(filters.lng);
  const originLat = hasOrigin ? Number(filters.lat) : null;
  const originLng = hasOrigin ? Number(filters.lng) : null;
  const radius =
    filters.radiusMeters != null && Number.isFinite(filters.radiusMeters)
      ? filters.radiusMeters
      : null;

  const params: (string | number)[] = [];
  const where = [
    "e.location_lat IS NOT NULL",
    "e.location_lng IS NOT NULL",
    "e.location_point IS NOT NULL",
  ];

  let distanceSelect = "NULL AS distance_m";
  if (originLat != null && originLng != null) {
    distanceSelect =
      "ST_Distance_Sphere(e.location_point, ST_SRID(POINT(?, ?), 4326)) AS distance_m";
    params.push(originLng, originLat);
    if (radius != null) {
      where.push(
        "ST_Distance_Sphere(e.location_point, ST_SRID(POINT(?, ?), 4326)) <= ?"
      );
      params.push(originLng, originLat, radius);
    }
  }

  if (filters.field?.trim()) {
    where.push(
      "(e.company_name LIKE ? OR e.company_description LIKE ? OR e.address_text LIKE ? OR e.postcode LIKE ?)"
    );
    const term = `%${filters.field.trim()}%`;
    params.push(term, term, term, term);
  }

  const orderBy = hasOrigin
    ? "distance_m ASC, e.updated_at DESC"
    : "e.updated_at DESC";

  const [rows] = await pool.execute<BusinessSearchRow[]>(
    `SELECT e.id, e.company_name, e.company_description, e.website_url,
            e.address_text, e.postcode, e.location_lat, e.location_lng,
            e.actively_hiring, ${distanceSelect}
     FROM employer_profiles e
     WHERE ${where.join(" AND ")}
     ORDER BY ${orderBy}
     LIMIT ${safeLimit}`,
    params
  );

  return rows.map((row) => ({
    id: Number(row.id),
    company_name: row.company_name ?? null,
    company_description: row.company_description ?? null,
    website_url: row.website_url ?? null,
    address_text: row.address_text ?? null,
    postcode: row.postcode ?? null,
    location_lat: Number(row.location_lat),
    location_lng: Number(row.location_lng),
    actively_hiring: Boolean(row.actively_hiring),
    distance_m: row.distance_m == null ? null : Number(row.distance_m),
  }));
}
