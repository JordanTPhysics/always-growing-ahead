import { pool } from "@/lib/db/pool";
import { mapWorkerRow, pointParams } from "@/lib/db/repositories/helpers";
import type {
  Availability,
  JobType,
  Proficiency,
  Visibility,
  WorkerExperience,
  WorkerProfile,
  WorkerQualification,
  WorkerSearchFilters,
  WorkerSearchResult,
  WorkerSkill,
} from "@/lib/db/types";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type WorkerRow = WorkerProfile & RowDataPacket;
type WorkerSearchRow = WorkerSearchResult & RowDataPacket;
type SkillRow = WorkerSkill & RowDataPacket;
type ExpRow = WorkerExperience & RowDataPacket;
type QualRow = WorkerQualification & RowDataPacket;

export type WorkerProfileInput = {
  headline?: string | null;
  bio?: string | null;
  profile_photo_url?: string | null;
  cv_file_url?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  postcode?: string | null;
  address_text?: string | null;
  desired_job_types?: JobType[] | null;
  desired_salary_min?: number | null;
  desired_salary_max?: number | null;
  availability?: Availability | null;
  visibility?: Visibility;
  contact_email?: string | null;
  contact_phone?: string | null;
  linkedin_url?: string | null;
};

function normalizeWorker(row: WorkerRow): WorkerProfile {
  const mapped = mapWorkerRow(row) as WorkerProfile;
  return {
    ...mapped,
    contact_email: mapped.contact_email ?? null,
    contact_phone: mapped.contact_phone ?? null,
    linkedin_url: mapped.linkedin_url ?? null,
  };
}

export async function getWorkerByUserId(
  userId: number
): Promise<WorkerProfile | null> {
  const [rows] = await pool.execute<WorkerRow[]>(
    "SELECT * FROM worker_profiles WHERE user_id = ? LIMIT 1",
    [userId]
  );
  return rows[0] ? normalizeWorker(rows[0]) : null;
}

export async function getWorkerById(id: number): Promise<WorkerProfile | null> {
  const [rows] = await pool.execute<WorkerRow[]>(
    "SELECT * FROM worker_profiles WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] ? normalizeWorker(rows[0]) : null;
}

export async function createWorkerProfile(
  userId: number,
  input: WorkerProfileInput = {}
): Promise<WorkerProfile> {
  const [lat, lng, pointLng, pointLat] = pointParams(
    input.location_lat,
    input.location_lng
  );
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO worker_profiles (
      user_id, headline, bio, profile_photo_url, cv_file_url,
      location_lat, location_lng, location_point, postcode, address_text,
      desired_job_types, desired_salary_min, desired_salary_max,
      availability, visibility, contact_email, contact_phone, linkedin_url
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, IF(? IS NULL OR ? IS NULL, NULL, ST_SRID(POINT(?, ?), 4326)), ?, ?,
      CAST(? AS JSON), ?, ?,
      ?, ?, ?, ?, ?
    )`,
    [
      userId,
      input.headline ?? null,
      input.bio ?? null,
      input.profile_photo_url ?? null,
      input.cv_file_url ?? null,
      lat,
      lng,
      pointLng,
      pointLat,
      pointLng,
      pointLat,
      input.postcode ?? null,
      input.address_text ?? null,
      input.desired_job_types ? JSON.stringify(input.desired_job_types) : null,
      input.desired_salary_min ?? null,
      input.desired_salary_max ?? null,
      input.availability ?? null,
      input.visibility ?? "public",
      input.contact_email ?? null,
      input.contact_phone ?? null,
      input.linkedin_url ?? null,
    ]
  );
  const profile = await getWorkerById(result.insertId);
  if (!profile) throw new Error("Failed to load created worker profile");
  return profile;
}

export async function updateWorkerProfile(
  workerId: number,
  input: WorkerProfileInput
): Promise<WorkerProfile> {
  const current = await getWorkerById(workerId);
  if (!current) throw new Error("Worker profile not found");

  const next = {
    headline: input.headline !== undefined ? input.headline : current.headline,
    bio: input.bio !== undefined ? input.bio : current.bio,
    profile_photo_url:
      input.profile_photo_url !== undefined
        ? input.profile_photo_url
        : current.profile_photo_url,
    cv_file_url:
      input.cv_file_url !== undefined ? input.cv_file_url : current.cv_file_url,
    location_lat:
      input.location_lat !== undefined
        ? input.location_lat
        : current.location_lat,
    location_lng:
      input.location_lng !== undefined
        ? input.location_lng
        : current.location_lng,
    postcode: input.postcode !== undefined ? input.postcode : current.postcode,
    address_text:
      input.address_text !== undefined
        ? input.address_text
        : current.address_text,
    desired_job_types:
      input.desired_job_types !== undefined
        ? input.desired_job_types
        : current.desired_job_types,
    desired_salary_min:
      input.desired_salary_min !== undefined
        ? input.desired_salary_min
        : current.desired_salary_min,
    desired_salary_max:
      input.desired_salary_max !== undefined
        ? input.desired_salary_max
        : current.desired_salary_max,
    availability:
      input.availability !== undefined
        ? input.availability
        : current.availability,
    visibility:
      input.visibility !== undefined ? input.visibility : current.visibility,
    contact_email:
      input.contact_email !== undefined
        ? input.contact_email
        : current.contact_email,
    contact_phone:
      input.contact_phone !== undefined
        ? input.contact_phone
        : current.contact_phone,
    linkedin_url:
      input.linkedin_url !== undefined
        ? input.linkedin_url
        : current.linkedin_url,
  };

  const [lat, lng, pointLng, pointLat] = pointParams(
    next.location_lat,
    next.location_lng
  );

  await pool.execute(
    `UPDATE worker_profiles SET
      headline = ?, bio = ?, profile_photo_url = ?, cv_file_url = ?,
      location_lat = ?, location_lng = ?,
      location_point = IF(? IS NULL OR ? IS NULL, NULL, ST_SRID(POINT(?, ?), 4326)),
      postcode = ?, address_text = ?,
      desired_job_types = CAST(? AS JSON),
      desired_salary_min = ?, desired_salary_max = ?,
      availability = ?, visibility = ?,
      contact_email = ?, contact_phone = ?, linkedin_url = ?
     WHERE id = ?`,
    [
      next.headline,
      next.bio,
      next.profile_photo_url,
      next.cv_file_url,
      lat,
      lng,
      pointLng,
      pointLat,
      pointLng,
      pointLat,
      next.postcode,
      next.address_text,
      next.desired_job_types ? JSON.stringify(next.desired_job_types) : null,
      next.desired_salary_min,
      next.desired_salary_max,
      next.availability,
      next.visibility,
      next.contact_email,
      next.contact_phone,
      next.linkedin_url,
      workerId,
    ]
  );

  const updated = await getWorkerById(workerId);
  if (!updated) throw new Error("Failed to load updated worker profile");
  return updated;
}

export async function listWorkerSkills(
  workerId: number
): Promise<WorkerSkill[]> {
  const [rows] = await pool.execute<SkillRow[]>(
    `SELECT ws.*, s.name AS skill_name, s.category AS skill_category
     FROM worker_skills ws
     JOIN skills s ON s.id = ws.skill_id
     WHERE ws.worker_id = ?
     ORDER BY s.name ASC`,
    [workerId]
  );
  return rows;
}

export async function setWorkerSkills(
  workerId: number,
  skills: { skill_id: number; proficiency?: Proficiency | null }[]
): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute("DELETE FROM worker_skills WHERE worker_id = ?", [
      workerId,
    ]);
    for (const skill of skills) {
      await conn.execute(
        `INSERT INTO worker_skills (worker_id, skill_id, proficiency)
         VALUES (?, ?, ?)`,
        [workerId, skill.skill_id, skill.proficiency ?? null]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function listWorkerExperience(
  workerId: number
): Promise<WorkerExperience[]> {
  const [rows] = await pool.execute<ExpRow[]>(
    `SELECT * FROM worker_experience
     WHERE worker_id = ?
     ORDER BY start_date DESC, id DESC`,
    [workerId]
  );
  return rows;
}

export async function replaceWorkerExperience(
  workerId: number,
  entries: {
    job_title?: string | null;
    employer_name?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    description?: string | null;
  }[]
): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute("DELETE FROM worker_experience WHERE worker_id = ?", [
      workerId,
    ]);
    for (const entry of entries) {
      await conn.execute(
        `INSERT INTO worker_experience
          (worker_id, job_title, employer_name, start_date, end_date, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          workerId,
          entry.job_title ?? null,
          entry.employer_name ?? null,
          entry.start_date ?? null,
          entry.end_date ?? null,
          entry.description ?? null,
        ]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function listWorkerQualifications(
  workerId: number
): Promise<WorkerQualification[]> {
  const [rows] = await pool.execute<QualRow[]>(
    `SELECT * FROM worker_qualifications
     WHERE worker_id = ?
     ORDER BY year_awarded DESC, id DESC`,
    [workerId]
  );
  return rows;
}

export async function replaceWorkerQualifications(
  workerId: number,
  entries: {
    qualification_name?: string | null;
    institution?: string | null;
    year_awarded?: number | null;
    certificate_file_url?: string | null;
  }[]
): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      "DELETE FROM worker_qualifications WHERE worker_id = ?",
      [workerId]
    );
    for (const entry of entries) {
      await conn.execute(
        `INSERT INTO worker_qualifications
          (worker_id, qualification_name, institution, year_awarded, certificate_file_url)
         VALUES (?, ?, ?, ?, ?)`,
        [
          workerId,
          entry.qualification_name ?? null,
          entry.institution ?? null,
          entry.year_awarded ?? null,
          entry.certificate_file_url ?? null,
        ]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getPublicWorkerBundle(workerId: number) {
  const profile = await getWorkerById(workerId);
  if (!profile || profile.visibility !== "public") return null;
  const [skills, experience, qualifications] = await Promise.all([
    listWorkerSkills(workerId),
    listWorkerExperience(workerId),
    listWorkerQualifications(workerId),
  ]);
  const { contact_email: _e, contact_phone: _p, linkedin_url: _l, ...publicProfile } =
    profile;
  return { profile: publicProfile, skills, experience, qualifications };
}

export async function searchPublicWorkers(
  filters: WorkerSearchFilters = {}
): Promise<WorkerSearchResult[]> {
  const safeLimit = Math.min(Math.max(Number(filters.limit) || 100, 1), 200);
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
  const where: string[] = [
    `w.visibility = 'public'`,
    `(w.availability IS NULL OR w.availability <> 'not_looking')`,
  ];

  let distanceSelect = "NULL AS distance_m";
  if (originLat != null && originLng != null) {
    distanceSelect =
      "ST_Distance_Sphere(w.location_point, ST_SRID(POINT(?, ?), 4326)) AS distance_m";
    params.push(originLng, originLat);
    where.push("w.location_point IS NOT NULL");
    if (radius != null) {
      where.push(
        "ST_Distance_Sphere(w.location_point, ST_SRID(POINT(?, ?), 4326)) <= ?"
      );
      params.push(originLng, originLat, radius);
    }
  }

  if (filters.field?.trim()) {
    where.push("w.headline LIKE ?");
    params.push(`%${filters.field.trim()}%`);
  }
  if (filters.availability) {
    where.push("w.availability = ?");
    params.push(filters.availability);
  }
  if (filters.jobType) {
    where.push(
      "JSON_CONTAINS(w.desired_job_types, CAST(? AS JSON), '$')"
    );
    params.push(JSON.stringify(filters.jobType));
  }
  if (filters.skillIds && filters.skillIds.length > 0) {
    const placeholders = filters.skillIds.map(() => "?").join(", ");
    where.push(
      `EXISTS (
        SELECT 1 FROM worker_skills ws
        WHERE ws.worker_id = w.id AND ws.skill_id IN (${placeholders})
      )`
    );
    params.push(...filters.skillIds);
  }

  const orderBy = hasOrigin
    ? "distance_m ASC, w.updated_at DESC"
    : "w.updated_at DESC";

  const [rows] = await pool.execute<WorkerSearchRow[]>(
    `SELECT w.*,
      ${distanceSelect},
      (
        SELECT GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ')
        FROM worker_skills ws
        JOIN skills s ON s.id = ws.skill_id
        WHERE ws.worker_id = w.id
      ) AS top_skills
     FROM worker_profiles w
     WHERE ${where.join(" AND ")}
     ORDER BY ${orderBy}
     LIMIT ${safeLimit}`,
    params
  );

  return rows.map((row) => {
    const normalized = normalizeWorker(row as WorkerRow);
    return {
      ...normalized,
      contact_email: null,
      contact_phone: null,
      linkedin_url: null,
      distance_m:
        row.distance_m == null ? null : Number(row.distance_m),
      location_lat:
        normalized.location_lat == null
          ? null
          : Number(normalized.location_lat),
      location_lng:
        normalized.location_lng == null
          ? null
          : Number(normalized.location_lng),
      top_skills: row.top_skills ?? null,
    };
  });
}
