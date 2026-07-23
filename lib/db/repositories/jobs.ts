import { pool } from "@/lib/db/pool";
import { pointParams } from "@/lib/db/repositories/helpers";
import type {
  Job,
  JobSearchFilters,
  JobSearchResult,
  JobSkill,
  JobStatus,
  JobType,
  SalaryType,
} from "@/lib/db/types";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type JobRow = Job & RowDataPacket;
type JobSearchRow = JobSearchResult & RowDataPacket;
type JobSkillRow = JobSkill & RowDataPacket;

export type JobInput = {
  title: string;
  description?: string | null;
  job_type?: JobType | null;
  location_lat?: number | null;
  location_lng?: number | null;
  postcode?: string | null;
  address_text?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_type?: SalaryType | null;
  requirements?: string | null;
  status?: JobStatus;
  expires_at?: Date | string | null;
};

export async function getJobById(id: number): Promise<Job | null> {
  const [rows] = await pool.execute<JobRow[]>(
    `SELECT j.*, e.company_name
     FROM jobs j
     JOIN employer_profiles e ON e.id = j.employer_id
     WHERE j.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function listJobsByEmployer(employerId: number): Promise<Job[]> {
  const [rows] = await pool.execute<JobRow[]>(
    `SELECT j.*, e.company_name
     FROM jobs j
     JOIN employer_profiles e ON e.id = j.employer_id
     WHERE j.employer_id = ?
     ORDER BY j.updated_at DESC`,
    [employerId]
  );
  return rows;
}

export async function listActiveJobs(limit = 50): Promise<Job[]> {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const [rows] = await pool.execute<JobRow[]>(
    `SELECT j.*, e.company_name
     FROM jobs j
     JOIN employer_profiles e ON e.id = j.employer_id
     WHERE j.status = 'active'
     ORDER BY j.published_at DESC
     LIMIT ${safeLimit}`
  );
  return rows;
}

export async function searchJobs(
  filters: JobSearchFilters = {}
): Promise<JobSearchResult[]> {
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
  const where: string[] = [`j.status = 'active'`];

  let distanceSelect = "NULL AS distance_m";
  if (originLat != null && originLng != null) {
    distanceSelect =
      "ST_Distance_Sphere(j.location_point, ST_SRID(POINT(?, ?), 4326)) AS distance_m";
    params.push(originLng, originLat);
    where.push("j.location_point IS NOT NULL");
    if (radius != null) {
      where.push(
        "ST_Distance_Sphere(j.location_point, ST_SRID(POINT(?, ?), 4326)) <= ?"
      );
      params.push(originLng, originLat, radius);
    }
  }

  if (filters.field?.trim()) {
    where.push("j.title LIKE ?");
    params.push(`%${filters.field.trim()}%`);
  }
  if (filters.jobType) {
    where.push("j.job_type = ?");
    params.push(filters.jobType);
  }
  if (filters.salaryMin != null) {
    where.push("(j.salary_max IS NULL OR j.salary_max >= ?)");
    params.push(filters.salaryMin);
  }
  if (filters.salaryMax != null) {
    where.push("(j.salary_min IS NULL OR j.salary_min <= ?)");
    params.push(filters.salaryMax);
  }
  if (filters.postedWithinDays != null && filters.postedWithinDays > 0) {
    where.push("j.published_at >= DATE_SUB(NOW(), INTERVAL ? DAY)");
    params.push(filters.postedWithinDays);
  }
  if (filters.skillIds && filters.skillIds.length > 0) {
    const placeholders = filters.skillIds.map(() => "?").join(", ");
    where.push(
      `EXISTS (
        SELECT 1 FROM job_skills js
        WHERE js.job_id = j.id AND js.skill_id IN (${placeholders})
      )`
    );
    params.push(...filters.skillIds);
  }

  const orderBy = hasOrigin
    ? "distance_m ASC, j.published_at DESC"
    : "j.published_at DESC";

  const [rows] = await pool.execute<JobSearchRow[]>(
    `SELECT j.*, e.company_name, ${distanceSelect}
     FROM jobs j
     JOIN employer_profiles e ON e.id = j.employer_id
     WHERE ${where.join(" AND ")}
     ORDER BY ${orderBy}
     LIMIT ${safeLimit}`,
    params
  );

  return rows.map((row) => ({
    ...row,
    distance_m:
      row.distance_m == null ? null : Number(row.distance_m),
    location_lat:
      row.location_lat == null ? null : Number(row.location_lat),
    location_lng:
      row.location_lng == null ? null : Number(row.location_lng),
  }));
}

export async function createJob(
  employerId: number,
  input: JobInput
): Promise<Job> {
  const status = input.status ?? "draft";
  const [lat, lng, pointLng, pointLat] = pointParams(
    input.location_lat,
    input.location_lng
  );

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO jobs (
      employer_id, title, description, job_type,
      location_lat, location_lng, location_point, postcode, address_text,
      salary_min, salary_max, salary_type, requirements, status,
      published_at, expires_at
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, IF(? IS NULL OR ? IS NULL, NULL, ST_SRID(POINT(?, ?), 4326)), ?, ?,
      ?, ?, ?, ?, ?,
      IF(? = 'active', CURRENT_TIMESTAMP, NULL), ?
    )`,
    [
      employerId,
      input.title,
      input.description ?? null,
      input.job_type ?? null,
      lat,
      lng,
      pointLng,
      pointLat,
      pointLng,
      pointLat,
      input.postcode ?? null,
      input.address_text ?? null,
      input.salary_min ?? null,
      input.salary_max ?? null,
      input.salary_type ?? null,
      input.requirements ?? null,
      status,
      status,
      input.expires_at ?? null,
    ]
  );

  const job = await getJobById(result.insertId);
  if (!job) throw new Error("Failed to load created job");
  return job;
}

export async function updateJob(jobId: number, input: Partial<JobInput>): Promise<Job> {
  const current = await getJobById(jobId);
  if (!current) throw new Error("Job not found");

  const next = {
    title: input.title !== undefined ? input.title : current.title,
    description:
      input.description !== undefined ? input.description : current.description,
    job_type: input.job_type !== undefined ? input.job_type : current.job_type,
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
    salary_min:
      input.salary_min !== undefined ? input.salary_min : current.salary_min,
    salary_max:
      input.salary_max !== undefined ? input.salary_max : current.salary_max,
    salary_type:
      input.salary_type !== undefined ? input.salary_type : current.salary_type,
    requirements:
      input.requirements !== undefined
        ? input.requirements
        : current.requirements,
    status: input.status !== undefined ? input.status : current.status,
    expires_at:
      input.expires_at !== undefined ? input.expires_at : current.expires_at,
  };

  const becomingActive =
    next.status === "active" && current.status !== "active";
  const [lat, lng, pointLng, pointLat] = pointParams(
    next.location_lat,
    next.location_lng
  );

  await pool.execute(
    `UPDATE jobs SET
      title = ?, description = ?, job_type = ?,
      location_lat = ?, location_lng = ?,
      location_point = IF(? IS NULL OR ? IS NULL, NULL, ST_SRID(POINT(?, ?), 4326)),
      postcode = ?, address_text = ?,
      salary_min = ?, salary_max = ?, salary_type = ?,
      requirements = ?, status = ?,
      published_at = CASE
        WHEN ? THEN CURRENT_TIMESTAMP
        ELSE published_at
      END,
      expires_at = ?
     WHERE id = ?`,
    [
      next.title,
      next.description,
      next.job_type,
      lat,
      lng,
      pointLng,
      pointLat,
      pointLng,
      pointLat,
      next.postcode,
      next.address_text,
      next.salary_min,
      next.salary_max,
      next.salary_type,
      next.requirements,
      next.status,
      becomingActive,
      next.expires_at,
      jobId,
    ]
  );

  const updated = await getJobById(jobId);
  if (!updated) throw new Error("Failed to load updated job");
  return updated;
}

export async function listJobSkills(jobId: number): Promise<JobSkill[]> {
  const [rows] = await pool.execute<JobSkillRow[]>(
    `SELECT js.*, s.name AS skill_name
     FROM job_skills js
     JOIN skills s ON s.id = js.skill_id
     WHERE js.job_id = ?
     ORDER BY js.required DESC, s.name ASC`,
    [jobId]
  );
  return rows;
}

export async function setJobSkills(
  jobId: number,
  skills: { skill_id: number; required?: boolean }[]
): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute("DELETE FROM job_skills WHERE job_id = ?", [jobId]);
    for (const skill of skills) {
      await conn.execute(
        `INSERT INTO job_skills (job_id, skill_id, required)
         VALUES (?, ?, ?)`,
        [jobId, skill.skill_id, skill.required ?? true]
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
