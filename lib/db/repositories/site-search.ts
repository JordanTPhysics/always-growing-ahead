import { isRemoteDatabaseConfigured } from "@/lib/db/config";
import { pool } from "@/lib/db/pool";
import { expandSearchQuery } from "@/lib/search/concepts";
import {
  anyTextMatch,
  compileSearchTerms,
  joinOr,
  textMatch,
  translationMatch,
  type CompiledTerm,
} from "@/lib/search/match-sql";
import { findSemanticMatches, SEMANTIC_MATCH_RANK } from "@/lib/search/semantic";
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
  matchRank: number;
  matchScore: number;
};

export type SiteProfileHit = {
  id: number;
  role: "worker" | "employer";
  title: string | null;
  body: string | null;
  skills: string | null;
  postcode: string | null;
  addressText: string | null;
  matchRank: number;
  matchScore: number;
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
  matchRank: number;
  matchScore: number;
};

export type SiteMarketplaceHit = {
  id: number;
  title: string;
  description: string | null;
  price: string;
  location: string;
  category: string;
  seller: string | null;
  matchRank: number;
  matchScore: number;
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
  match_rank?: number;
};

type ProfileHitRow = RowDataPacket & {
  id: number;
  title: string | null;
  body: string | null;
  skills: string | null;
  postcode: string | null;
  address_text: string | null;
  match_rank?: number;
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
  match_rank?: number;
};

type MarketplaceHitRow = RowDataPacket & {
  id: number;
  title: string;
  description: string | null;
  price: string;
  location: string;
  category: string;
  seller: string | null;
  match_rank?: number;
};

type Scored = { id: number; score: number };

function containsOf(terms: CompiledTerm[]): string[] {
  return terms.map((term) => term.contains);
}

function rankCase(checks: Array<string | null>): string {
  const when = checks
    .map((sql, index) => (sql ? `WHEN ${sql} THEN ${index}` : null))
    .filter((line): line is string => Boolean(line));
  return `CASE ${when.join(" ")} ELSE 9 END`;
}

function existsAnd(fromWhere: string, likes: string): string {
  return `EXISTS (${fromWhere} AND (${likes}))`;
}

function skillLikes(
  fromWhere: string,
  patterns: string[],
  params: string[]
): string | null {
  if (patterns.length === 0) return null;
  const likes = patterns.map((pattern) => textMatch("s.name", pattern, params));
  return existsAnd(fromWhere, likes.join(" OR "));
}

function jobSkillMatch(patterns: string[], params: string[]): string | null {
  return skillLikes(
    `SELECT 1 FROM job_skills js
     JOIN skills s ON s.id = js.skill_id
     WHERE js.job_id = j.id`,
    patterns,
    params
  );
}

function workerSkillMatch(patterns: string[], params: string[]): string | null {
  return skillLikes(
    `SELECT 1 FROM worker_skills ws
     JOIN skills s ON s.id = ws.skill_id
     WHERE ws.worker_id = w.id`,
    patterns,
    params
  );
}

function historyMatch(
  alias: string,
  table: string,
  owner: string,
  columns: string[],
  patterns: string[],
  params: string[]
): string | null {
  const likes = anyTextMatch(columns, patterns, params);
  if (!likes) return null;
  return `EXISTS (SELECT 1 FROM ${table} ${alias} WHERE ${owner} AND (${likes}))`;
}

function mapJob(row: JobHitRow, score = 0): SiteJobHit {
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    requirements: row.requirements,
    skills: row.skills,
    companyName: row.company_name,
    postcode: row.postcode,
    addressText: row.address_text,
    jobType: row.job_type,
    matchRank: Number(row.match_rank ?? SEMANTIC_MATCH_RANK),
    matchScore: score,
  };
}

function mapProfile(
  row: ProfileHitRow,
  role: SiteProfileHit["role"],
  score = 0
): SiteProfileHit {
  return {
    id: Number(row.id),
    role,
    title: row.title,
    body: row.body,
    skills: row.skills,
    postcode: row.postcode,
    addressText: row.address_text,
    matchRank: Number(row.match_rank ?? SEMANTIC_MATCH_RANK),
    matchScore: score,
  };
}

function mapEducation(row: EducationHitRow, score = 0): SiteEducationHit {
  return {
    id: Number(row.id),
    topic: row.topic,
    mediaType: row.media_type,
    titleEn: row.title_en,
    titleAr: row.title_ar,
    titleCkb: row.title_ckb,
    descriptionEn: row.description_en,
    descriptionAr: row.description_ar,
    descriptionCkb: row.description_ckb,
    matchRank: Number(row.match_rank ?? SEMANTIC_MATCH_RANK),
    matchScore: score,
  };
}

function mapMarketplace(row: MarketplaceHitRow, score = 0): SiteMarketplaceHit {
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    price: row.price,
    location: row.location,
    category: row.category,
    seller: row.seller,
    matchRank: Number(row.match_rank ?? SEMANTIC_MATCH_RANK),
    matchScore: score,
  };
}

const JOB_SELECT = `SELECT j.id, j.title, j.description, j.requirements, j.job_type,
            j.postcode, j.address_text, e.company_name,
            (
              SELECT GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ')
              FROM job_skills js
              JOIN skills s ON s.id = js.skill_id
              WHERE js.job_id = j.id
            ) AS skills`;

const WORKER_SELECT = `SELECT w.id,
            COALESCE(NULLIF(TRIM(w.headline), ''), NULLIF(TRIM(u.username), '')) AS title,
            w.bio AS body,
            w.postcode,
            w.address_text,
            (
              SELECT GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ')
              FROM worker_skills ws
              JOIN skills s ON s.id = ws.skill_id
              WHERE ws.worker_id = w.id
            ) AS skills`;

const EMPLOYER_SELECT = `SELECT e.id,
            NULLIF(TRIM(e.company_name), '') AS title,
            e.company_description AS body,
            e.postcode,
            e.address_text,
            NULL AS skills`;

async function searchJobs(terms: CompiledTerm[]): Promise<SiteJobHit[]> {
  const primary = terms[0];
  if (!primary) return [];
  const expansion = containsOf(terms.slice(1));
  const rankParams: string[] = [];
  const whereParams: string[] = [];
  const originalCols = [
    "j.description",
    "j.requirements",
    "j.postcode",
    "j.address_text",
    "e.company_name",
  ];
  const expansionCols = ["j.title", "j.description", "j.requirements", "e.company_name"];
  const rankSql = rankCase(
    [
      textMatch("j.title", primary.prefix, rankParams),
      textMatch("j.title", primary.contains, rankParams),
      joinOr([
        anyTextMatch(originalCols, [primary.contains], rankParams),
        jobSkillMatch([primary.contains], rankParams),
      ]),
      translationMatch("job", "j.id", "human", [primary.contains], rankParams),
      translationMatch("job", "j.id", "machine", [primary.contains], rankParams),
      joinOr([
        anyTextMatch(expansionCols, expansion, rankParams),
        jobSkillMatch(expansion, rankParams),
        translationMatch("job", "j.id", "human", expansion, rankParams),
      ]),
      translationMatch("job", "j.id", "machine", expansion, rankParams),
    ]
  );
  const whereSql = joinOr([
    anyTextMatch(["j.title", ...originalCols], [primary.contains], whereParams),
    jobSkillMatch([primary.contains], whereParams),
    translationMatch("job", "j.id", "human", [primary.contains], whereParams),
    translationMatch("job", "j.id", "machine", [primary.contains], whereParams),
    anyTextMatch(expansionCols, expansion, whereParams),
    jobSkillMatch(expansion, whereParams),
    translationMatch("job", "j.id", "human", expansion, whereParams),
    translationMatch("job", "j.id", "machine", expansion, whereParams),
  ]);
  if (!whereSql) return [];
  const [rows] = await pool.execute<JobHitRow[]>(
    `${JOB_SELECT}, ${rankSql} AS match_rank
     FROM jobs j
     JOIN employer_profiles e ON e.id = j.employer_id
     WHERE j.status = 'active' AND (${whereSql})
     ORDER BY match_rank ASC, j.published_at DESC
     LIMIT ${SEARCH_LIMIT}`,
    [...rankParams, ...whereParams]
  );
  return rows.map((row) => mapJob(row));
}

async function searchWorkers(terms: CompiledTerm[]): Promise<SiteProfileHit[]> {
  const primary = terms[0];
  if (!primary) return [];
  const expansion = containsOf(terms.slice(1));
  const rankParams: string[] = [];
  const whereParams: string[] = [];
  const title = "COALESCE(NULLIF(TRIM(w.headline), ''), u.username)";
  const originalCols = ["w.bio", "w.postcode", "w.address_text"];
  const expansionCols = ["w.headline", "w.bio"];
  const rankSql = rankCase([
    textMatch(title, primary.prefix, rankParams),
    textMatch(title, primary.contains, rankParams),
      joinOr([
        anyTextMatch(originalCols, [primary.contains], rankParams),
        workerSkillMatch([primary.contains], rankParams),
        historyMatch("ex", "worker_experience", "ex.worker_id = w.id", ["ex.job_title", "ex.employer_name", "ex.description"], [primary.contains], rankParams),
        historyMatch("q", "worker_qualifications", "q.worker_id = w.id", ["q.qualification_name", "q.institution"], [primary.contains], rankParams),
      ]),
      translationMatch("worker", "w.id", "human", [primary.contains], rankParams),
      translationMatch("worker", "w.id", "machine", [primary.contains], rankParams),
      joinOr([
        anyTextMatch(expansionCols, expansion, rankParams),
        workerSkillMatch(expansion, rankParams),
        historyMatch("ex", "worker_experience", "ex.worker_id = w.id", ["ex.job_title", "ex.employer_name", "ex.description"], expansion, rankParams),
        historyMatch("q", "worker_qualifications", "q.worker_id = w.id", ["q.qualification_name", "q.institution"], expansion, rankParams),
        translationMatch("worker", "w.id", "human", expansion, rankParams),
      ]),
      translationMatch("worker", "w.id", "machine", expansion, rankParams),
    ]
  );
  const whereSql = joinOr([
    anyTextMatch([title, ...originalCols], [primary.contains], whereParams),
    workerSkillMatch([primary.contains], whereParams),
    historyMatch("ex", "worker_experience", "ex.worker_id = w.id", ["ex.job_title", "ex.employer_name", "ex.description"], [primary.contains], whereParams),
    historyMatch("q", "worker_qualifications", "q.worker_id = w.id", ["q.qualification_name", "q.institution"], [primary.contains], whereParams),
    translationMatch("worker", "w.id", "human", [primary.contains], whereParams),
    translationMatch("worker", "w.id", "machine", [primary.contains], whereParams),
    anyTextMatch(expansionCols, expansion, whereParams),
    workerSkillMatch(expansion, whereParams),
    historyMatch("ex", "worker_experience", "ex.worker_id = w.id", ["ex.job_title", "ex.employer_name", "ex.description"], expansion, whereParams),
    historyMatch("q", "worker_qualifications", "q.worker_id = w.id", ["q.qualification_name", "q.institution"], expansion, whereParams),
    translationMatch("worker", "w.id", "human", expansion, whereParams),
    translationMatch("worker", "w.id", "machine", expansion, whereParams),
  ]);
  if (!whereSql) return [];
  const [rows] = await pool.execute<ProfileHitRow[]>(
    `${WORKER_SELECT}, ${rankSql} AS match_rank
     FROM worker_profiles w
     LEFT JOIN users u ON u.id = w.user_id
     WHERE w.visibility = 'public' AND (${whereSql})
     ORDER BY match_rank ASC, w.updated_at DESC
     LIMIT ${SEARCH_LIMIT}`,
    [...rankParams, ...whereParams]
  );
  return rows.map((row) => mapProfile(row, "worker"));
}

async function searchEmployers(terms: CompiledTerm[]): Promise<SiteProfileHit[]> {
  const primary = terms[0];
  if (!primary) return [];
  const expansion = containsOf(terms.slice(1));
  const rankParams: string[] = [];
  const whereParams: string[] = [];
  const originalCols = [
    "e.company_description",
    "e.postcode",
    "e.address_text",
    "e.website_url",
  ];
  const rankSql = rankCase(
    [
      textMatch("e.company_name", primary.prefix, rankParams),
      textMatch("e.company_name", primary.contains, rankParams),
      anyTextMatch(originalCols, [primary.contains], rankParams),
      translationMatch("employer", "e.id", "human", [primary.contains], rankParams),
      translationMatch("employer", "e.id", "machine", [primary.contains], rankParams),
      joinOr([
        anyTextMatch(["e.company_name", "e.company_description"], expansion, rankParams),
        translationMatch("employer", "e.id", "human", expansion, rankParams),
      ]),
      translationMatch("employer", "e.id", "machine", expansion, rankParams),
    ]
  );
  const whereSql = joinOr([
    anyTextMatch(["e.company_name", ...originalCols], [primary.contains], whereParams),
    translationMatch("employer", "e.id", "human", [primary.contains], whereParams),
    translationMatch("employer", "e.id", "machine", [primary.contains], whereParams),
    anyTextMatch(["e.company_name", "e.company_description"], expansion, whereParams),
    translationMatch("employer", "e.id", "human", expansion, whereParams),
    translationMatch("employer", "e.id", "machine", expansion, whereParams),
  ]);
  if (!whereSql) return [];
  const [rows] = await pool.execute<ProfileHitRow[]>(
    `${EMPLOYER_SELECT}, ${rankSql} AS match_rank
     FROM employer_profiles e
     WHERE ${whereSql}
     ORDER BY match_rank ASC, e.updated_at DESC
     LIMIT ${SEARCH_LIMIT}`,
    [...rankParams, ...whereParams]
  );
  return rows.map((row) => mapProfile(row, "employer"));
}

async function searchEducation(terms: CompiledTerm[]): Promise<SiteEducationHit[]> {
  const primary = terms[0];
  if (!primary) return [];
  const expansion = containsOf(terms.slice(1));
  const rankParams: string[] = [];
  const whereParams: string[] = [];
  const titles = ["title_en", "title_ar", "title_ckb"];
  const bodies = ["topic", "description_en", "description_ar", "description_ckb", "file_name"];
  const rankSql = rankCase(
    [
      anyTextMatch(titles, [primary.prefix], rankParams),
      anyTextMatch(titles, [primary.contains], rankParams),
      anyTextMatch(bodies, [primary.contains], rankParams),
      translationMatch("education", "r.id", "human", [primary.contains], rankParams),
      translationMatch("education", "r.id", "machine", [primary.contains], rankParams),
      joinOr([
        anyTextMatch([...titles, ...bodies], expansion, rankParams),
        translationMatch("education", "r.id", "human", expansion, rankParams),
      ]),
      translationMatch("education", "r.id", "machine", expansion, rankParams),
    ]
  );
  const whereSql = joinOr([
    anyTextMatch([...titles, ...bodies], [primary.contains], whereParams),
    translationMatch("education", "r.id", "human", [primary.contains], whereParams),
    translationMatch("education", "r.id", "machine", [primary.contains], whereParams),
    anyTextMatch([...titles, ...bodies], expansion, whereParams),
    translationMatch("education", "r.id", "human", expansion, whereParams),
    translationMatch("education", "r.id", "machine", expansion, whereParams),
  ]);
  if (!whereSql) return [];
  const [rows] = await pool.execute<EducationHitRow[]>(
    `SELECT id, topic, media_type, title_en, title_ar, title_ckb,
            description_en, description_ar, description_ckb,
            ${rankSql} AS match_rank
     FROM education_resources r
     WHERE r.is_published = 1 AND (${whereSql})
     ORDER BY match_rank ASC, r.updated_at DESC
     LIMIT ${SEARCH_LIMIT}`,
    [...rankParams, ...whereParams]
  );
  return rows.map((row) => mapEducation(row));
}

async function searchMarketplace(terms: CompiledTerm[]): Promise<SiteMarketplaceHit[]> {
  const primary = terms[0];
  if (!primary) return [];
  const expansion = containsOf(terms.slice(1));
  const rankParams: string[] = [];
  const whereParams: string[] = [];
  const originalCols = [
    "l.description",
    "l.category",
    "l.location",
    "l.price",
    "u.username",
    "ep.company_name",
  ];
  const rankSql = rankCase(
    [
      textMatch("l.title", primary.prefix, rankParams),
      textMatch("l.title", primary.contains, rankParams),
      anyTextMatch(originalCols, [primary.contains], rankParams),
      translationMatch("marketplace", "l.id", "human", [primary.contains], rankParams),
      translationMatch("marketplace", "l.id", "machine", [primary.contains], rankParams),
      joinOr([
        anyTextMatch(["l.title", "l.description", "l.category"], expansion, rankParams),
        translationMatch("marketplace", "l.id", "human", expansion, rankParams),
      ]),
      translationMatch("marketplace", "l.id", "machine", expansion, rankParams),
    ]
  );
  const whereSql = joinOr([
    anyTextMatch(["l.title", ...originalCols], [primary.contains], whereParams),
    translationMatch("marketplace", "l.id", "human", [primary.contains], whereParams),
    translationMatch("marketplace", "l.id", "machine", [primary.contains], whereParams),
    anyTextMatch(["l.title", "l.description", "l.category"], expansion, whereParams),
    translationMatch("marketplace", "l.id", "human", expansion, whereParams),
    translationMatch("marketplace", "l.id", "machine", expansion, whereParams),
  ]);
  if (!whereSql) return [];
  const [rows] = await pool.execute<MarketplaceHitRow[]>(
    `SELECT l.id, l.title, l.description, l.price, l.location, l.category,
            COALESCE(
              NULLIF(TRIM(ep.company_name), ''),
              NULLIF(TRIM(u.username), '')
            ) AS seller,
            ${rankSql} AS match_rank
     FROM marketplace_listings l
     JOIN users u ON u.id = l.user_id
     LEFT JOIN employer_profiles ep ON ep.user_id = u.id
     WHERE ${whereSql}
     ORDER BY match_rank ASC, l.created_at DESC
     LIMIT ${SEARCH_LIMIT}`,
    [...rankParams, ...whereParams]
  );
  return rows.map((row) => mapMarketplace(row));
}

function sortHits<T extends { matchRank: number; matchScore: number }>(items: T[]) {
  items.sort(
    (left, right) =>
      left.matchRank - right.matchRank || right.matchScore - left.matchScore
  );
  if (items.length > SEARCH_LIMIT) items.splice(SEARCH_LIMIT);
}

function idsOf(scored: Scored[]): number[] {
  return scored.map((item) => item.id);
}

function scoreMap(scored: Scored[]): Map<number, number> {
  return new Map(scored.map((item) => [item.id, item.score]));
}

async function loadJobs(scored: Scored[]): Promise<SiteJobHit[]> {
  if (scored.length === 0) return [];
  const scores = scoreMap(scored);
  const [rows] = await pool.execute<JobHitRow[]>(
    `${JOB_SELECT}
     FROM jobs j
     JOIN employer_profiles e ON e.id = j.employer_id
     WHERE j.status = 'active' AND j.id IN (${idsOf(scored).map(() => "?").join(", ")})`,
    idsOf(scored)
  );
  return rows.map((row) => mapJob(row, scores.get(Number(row.id)) ?? 0));
}

async function loadWorkers(scored: Scored[]): Promise<SiteProfileHit[]> {
  if (scored.length === 0) return [];
  const scores = scoreMap(scored);
  const [rows] = await pool.execute<ProfileHitRow[]>(
    `${WORKER_SELECT}
     FROM worker_profiles w
     LEFT JOIN users u ON u.id = w.user_id
     WHERE w.visibility = 'public' AND w.id IN (${idsOf(scored).map(() => "?").join(", ")})`,
    idsOf(scored)
  );
  return rows.map((row) => mapProfile(row, "worker", scores.get(Number(row.id)) ?? 0));
}

async function loadEmployers(scored: Scored[]): Promise<SiteProfileHit[]> {
  if (scored.length === 0) return [];
  const scores = scoreMap(scored);
  const [rows] = await pool.execute<ProfileHitRow[]>(
    `${EMPLOYER_SELECT}
     FROM employer_profiles e
     WHERE e.id IN (${idsOf(scored).map(() => "?").join(", ")})`,
    idsOf(scored)
  );
  return rows.map((row) => mapProfile(row, "employer", scores.get(Number(row.id)) ?? 0));
}

async function loadEducation(scored: Scored[]): Promise<SiteEducationHit[]> {
  if (scored.length === 0) return [];
  const scores = scoreMap(scored);
  const [rows] = await pool.execute<EducationHitRow[]>(
    `SELECT id, topic, media_type, title_en, title_ar, title_ckb,
            description_en, description_ar, description_ckb
     FROM education_resources
     WHERE is_published = 1 AND id IN (${idsOf(scored).map(() => "?").join(", ")})`,
    idsOf(scored)
  );
  return rows.map((row) => mapEducation(row, scores.get(Number(row.id)) ?? 0));
}

async function loadMarketplace(scored: Scored[]): Promise<SiteMarketplaceHit[]> {
  if (scored.length === 0) return [];
  const scores = scoreMap(scored);
  const [rows] = await pool.execute<MarketplaceHitRow[]>(
    `SELECT l.id, l.title, l.description, l.price, l.location, l.category,
            COALESCE(
              NULLIF(TRIM(ep.company_name), ''),
              NULLIF(TRIM(u.username), '')
            ) AS seller
     FROM marketplace_listings l
     JOIN users u ON u.id = l.user_id
     LEFT JOIN employer_profiles ep ON ep.user_id = u.id
     WHERE l.id IN (${idsOf(scored).map(() => "?").join(", ")})`,
    idsOf(scored)
  );
  return rows.map((row) => mapMarketplace(row, scores.get(Number(row.id)) ?? 0));
}

async function attachSemantic(query: string, hits: SiteContentHits) {
  const matches = await findSemanticMatches(query);
  if (matches.length === 0) return;
  const seen = {
    job: new Set(hits.jobs.map((hit) => hit.id)),
    worker: new Set(
      hits.profiles.filter((hit) => hit.role === "worker").map((hit) => hit.id)
    ),
    employer: new Set(
      hits.profiles.filter((hit) => hit.role === "employer").map((hit) => hit.id)
    ),
    education: new Set(hits.education.map((hit) => hit.id)),
    marketplace: new Set(hits.marketplace.map((hit) => hit.id)),
  };
  const missing: Record<"job" | "worker" | "employer" | "education" | "marketplace", Scored[]> = {
    job: [],
    worker: [],
    employer: [],
    education: [],
    marketplace: [],
  };
  for (const match of matches) {
    if (seen[match.entityType].has(match.entityId)) continue;
    missing[match.entityType].push({ id: match.entityId, score: match.score });
  }
  const [jobs, workers, employers, education, marketplace] = await Promise.all([
    loadJobs(missing.job),
    loadWorkers(missing.worker),
    loadEmployers(missing.employer),
    loadEducation(missing.education),
    loadMarketplace(missing.marketplace),
  ]);
  hits.jobs.push(...jobs);
  hits.profiles.push(...workers, ...employers);
  hits.education.push(...education);
  hits.marketplace.push(...marketplace);
}

function emptyHits(): SiteContentHits {
  return { jobs: [], profiles: [], education: [], marketplace: [] };
}

/** Returns null when the database query fails. An unconfigured database yields empty lists. */
export async function searchSiteContent(query: string): Promise<SiteContentHits | null> {
  if (!isRemoteDatabaseConfigured()) return emptyHits();
  const terms = compileSearchTerms([query, ...expandSearchQuery(query)]);
  if (terms.length === 0) return emptyHits();

  try {
    const [jobs, workers, employers, education, marketplace] = await Promise.all([
      searchJobs(terms),
      searchWorkers(terms),
      searchEmployers(terms),
      searchEducation(terms),
      searchMarketplace(terms),
    ]);
    const hits: SiteContentHits = {
      jobs,
      profiles: [...workers, ...employers],
      education,
      marketplace,
    };
    await attachSemantic(query, hits);
    sortHits(hits.jobs);
    sortHits(hits.profiles);
    sortHits(hits.education);
    sortHits(hits.marketplace);
    return hits;
  } catch (error) {
    console.error("[search] content search failed", error);
    return null;
  }
}
