import { isRemoteDatabaseConfigured } from "@/lib/db/config";
import { pool } from "@/lib/db/pool";
import { likePattern } from "@/lib/search/text";
import type { EducationMediaType, JobType } from "@/lib/db/types";
import type { RowDataPacket } from "mysql2";

const SEARCH_LIMIT = 12;

export type SiteJobHit = {
  id: number;
  title: string;
  description: string | null;
  requirements: string | null;
  skills: string | null;
  companyName: string | null;
  postcode: string | null;
  addressText: string | null;
  jobType: JobType | null;
};

export type SiteProfileHit = {
  id: number;
  role: "worker" | "employer";
  title: string | null;
  body: string | null;
  skills: string | null;
  postcode: string | null;
  addressText: string | null;
};

export type SiteEducationHit = {
  id: number;
  topic: string;
  mediaType: EducationMediaType;
  titleEn: string;
  titleAr: string | null;
  titleCkb: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  descriptionCkb: string | null;
};

export type SiteMarketplaceHit = {
  id: number;
  title: string;
  description: string | null;
  price: string;
  location: string;
  category: string;
  seller: string | null;
};

export type SiteContentHits = {
  jobs: SiteJobHit[];
  profiles: SiteProfileHit[];
  education: SiteEducationHit[];
  marketplace: SiteMarketplaceHit[];
};

type JobHitRow = RowDataPacket & {
  id: number;
  title: string;
  description: string | null;
  requirements: string | null;
  skills: string | null;
  company_name: string | null;
  postcode: string | null;
  address_text: string | null;
  job_type: JobType | null;
};

type ProfileHitRow = RowDataPacket & {
  id: number;
  title: string | null;
  body: string | null;
  skills: string | null;
  postcode: string | null;
  address_text: string | null;
};

type EducationHitRow = RowDataPacket & {
  id: number;
  topic: string;
  media_type: EducationMediaType;
  title_en: string;
  title_ar: string | null;
  title_ckb: string | null;
  description_en: string | null;
  description_ar: string | null;
  description_ckb: string | null;
};

type MarketplaceHitRow = RowDataPacket & {
  id: number;
  title: string;
  description: string | null;
  price: string;
  location: string;
  category: string;
  seller: string | null;
};

function patterns(query: string) {
  return {
    contains: likePattern(query, "contains"),
    prefix: likePattern(query, "prefix"),
  };
}

async function searchJobs(query: string): Promise<SiteJobHit[]> {
  const { contains, prefix } = patterns(query);
  const [rows] = await pool.execute<JobHitRow[]>(
    `SELECT j.id, j.title, j.description, j.requirements, j.job_type,
            j.postcode, j.address_text, e.company_name,
            (
              SELECT GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ')
              FROM job_skills js
              JOIN skills s ON s.id = js.skill_id
              WHERE js.job_id = j.id
            ) AS skills
     FROM jobs j
     JOIN employer_profiles e ON e.id = j.employer_id
     WHERE j.status = 'active'
       AND (
         j.title LIKE ?
         OR j.description LIKE ?
         OR j.requirements LIKE ?
         OR j.postcode LIKE ?
         OR j.address_text LIKE ?
         OR e.company_name LIKE ?
         OR EXISTS (
           SELECT 1 FROM job_skills js
           JOIN skills s ON s.id = js.skill_id
           WHERE js.job_id = j.id AND s.name LIKE ?
         )
       )
     ORDER BY
       CASE
         WHEN j.title LIKE ? THEN 0
         WHEN j.title LIKE ? THEN 1
         ELSE 2
       END,
       j.published_at DESC
     LIMIT ${SEARCH_LIMIT}`,
    [
      contains,
      contains,
      contains,
      contains,
      contains,
      contains,
      contains,
      prefix,
      contains,
    ]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    description: row.description,
    requirements: row.requirements,
    skills: row.skills,
    companyName: row.company_name,
    postcode: row.postcode,
    addressText: row.address_text,
    jobType: row.job_type,
  }));
}

async function searchWorkers(query: string): Promise<SiteProfileHit[]> {
  const { contains, prefix } = patterns(query);
  const [rows] = await pool.execute<ProfileHitRow[]>(
    `SELECT w.id,
            COALESCE(NULLIF(TRIM(w.headline), ''), NULLIF(TRIM(u.username), '')) AS title,
            w.bio AS body,
            w.postcode,
            w.address_text,
            (
              SELECT GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ')
              FROM worker_skills ws
              JOIN skills s ON s.id = ws.skill_id
              WHERE ws.worker_id = w.id
            ) AS skills
     FROM worker_profiles w
     LEFT JOIN users u ON u.id = w.user_id
     WHERE w.visibility = 'public'
       AND (
         w.headline LIKE ?
         OR w.bio LIKE ?
         OR w.postcode LIKE ?
         OR w.address_text LIKE ?
         OR u.username LIKE ?
         OR EXISTS (
           SELECT 1 FROM worker_skills ws
           JOIN skills s ON s.id = ws.skill_id
           WHERE ws.worker_id = w.id AND s.name LIKE ?
         )
         OR EXISTS (
           SELECT 1 FROM worker_experience ex
           WHERE ex.worker_id = w.id
             AND (ex.job_title LIKE ? OR ex.employer_name LIKE ?)
         )
         OR EXISTS (
           SELECT 1 FROM worker_qualifications q
           WHERE q.worker_id = w.id
             AND (q.qualification_name LIKE ? OR q.institution LIKE ?)
         )
       )
     ORDER BY
       CASE
         WHEN COALESCE(w.headline, u.username, '') LIKE ? THEN 0
         WHEN COALESCE(w.headline, u.username, '') LIKE ? THEN 1
         ELSE 2
       END,
       w.updated_at DESC
     LIMIT ${SEARCH_LIMIT}`,
    [
      contains,
      contains,
      contains,
      contains,
      contains,
      contains,
      contains,
      contains,
      contains,
      contains,
      prefix,
      contains,
    ]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    role: "worker" as const,
    title: row.title,
    body: row.body,
    skills: row.skills,
    postcode: row.postcode,
    addressText: row.address_text,
  }));
}

async function searchEmployers(query: string): Promise<SiteProfileHit[]> {
  const { contains, prefix } = patterns(query);
  const [rows] = await pool.execute<ProfileHitRow[]>(
    `SELECT e.id,
            NULLIF(TRIM(e.company_name), '') AS title,
            e.company_description AS body,
            e.postcode,
            e.address_text,
            NULL AS skills
     FROM employer_profiles e
     WHERE e.company_name LIKE ?
        OR e.company_description LIKE ?
        OR e.postcode LIKE ?
        OR e.address_text LIKE ?
        OR e.website_url LIKE ?
     ORDER BY
       CASE
         WHEN e.company_name LIKE ? THEN 0
         WHEN e.company_name LIKE ? THEN 1
         ELSE 2
       END,
       e.updated_at DESC
     LIMIT ${SEARCH_LIMIT}`,
    [contains, contains, contains, contains, contains, prefix, contains]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    role: "employer" as const,
    title: row.title,
    body: row.body,
    skills: null,
    postcode: row.postcode,
    addressText: row.address_text,
  }));
}

async function searchEducation(query: string): Promise<SiteEducationHit[]> {
  const { contains, prefix } = patterns(query);
  const [rows] = await pool.execute<EducationHitRow[]>(
    `SELECT id, topic, media_type, title_en, title_ar, title_ckb,
            description_en, description_ar, description_ckb
     FROM education_resources
     WHERE is_published = 1
       AND (
         topic LIKE ?
         OR title_en LIKE ?
         OR title_ar LIKE ?
         OR title_ckb LIKE ?
         OR description_en LIKE ?
         OR description_ar LIKE ?
         OR description_ckb LIKE ?
         OR file_name LIKE ?
       )
     ORDER BY
       CASE
         WHEN topic LIKE ? OR title_en LIKE ? OR title_ar LIKE ? OR title_ckb LIKE ? THEN 0
         ELSE 1
       END,
       updated_at DESC
     LIMIT ${SEARCH_LIMIT}`,
    [
      contains,
      contains,
      contains,
      contains,
      contains,
      contains,
      contains,
      contains,
      prefix,
      prefix,
      prefix,
      prefix,
    ]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    topic: row.topic,
    mediaType: row.media_type,
    titleEn: row.title_en,
    titleAr: row.title_ar,
    titleCkb: row.title_ckb,
    descriptionEn: row.description_en,
    descriptionAr: row.description_ar,
    descriptionCkb: row.description_ckb,
  }));
}

async function searchMarketplace(query: string): Promise<SiteMarketplaceHit[]> {
  const { contains, prefix } = patterns(query);
  const [rows] = await pool.execute<MarketplaceHitRow[]>(
    `SELECT l.id, l.title, l.description, l.price, l.location, l.category,
            COALESCE(
              NULLIF(TRIM(ep.company_name), ''),
              NULLIF(TRIM(u.username), '')
            ) AS seller
     FROM marketplace_listings l
     JOIN users u ON u.id = l.user_id
     LEFT JOIN employer_profiles ep ON ep.user_id = u.id
     WHERE l.title LIKE ?
        OR l.description LIKE ?
        OR l.category LIKE ?
        OR l.location LIKE ?
        OR l.price LIKE ?
        OR u.username LIKE ?
        OR ep.company_name LIKE ?
     ORDER BY
       CASE
         WHEN l.title LIKE ? THEN 0
         WHEN l.title LIKE ? THEN 1
         ELSE 2
       END,
       l.created_at DESC
     LIMIT ${SEARCH_LIMIT}`,
    [
      contains,
      contains,
      contains,
      contains,
      contains,
      contains,
      contains,
      prefix,
      contains,
    ]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    description: row.description,
    price: row.price,
    location: row.location,
    category: row.category,
    seller: row.seller,
  }));
}

/** Returns null when the database query fails. An unconfigured database yields empty lists. */
export async function searchSiteContent(
  query: string
): Promise<SiteContentHits | null> {
  if (!isRemoteDatabaseConfigured()) {
    return { jobs: [], profiles: [], education: [], marketplace: [] };
  }

  try {
    const [jobs, workers, employers, education, marketplace] = await Promise.all([
      searchJobs(query),
      searchWorkers(query),
      searchEmployers(query),
      searchEducation(query),
      searchMarketplace(query),
    ]);

    return {
      jobs,
      profiles: [...workers, ...employers],
      education,
      marketplace,
    };
  } catch (error) {
    console.error("[search] content search failed", error);
    return null;
  }
}
