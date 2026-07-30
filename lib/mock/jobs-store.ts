import type {
  Job,
  JobSearchResult,
  JobSkill,
  JobStatus,
  JobType,
  SalaryType,
} from "@/lib/db/types";
import { ensureDemoJsonSeeded } from "@/lib/mock/demo-seed";
import { nextNumericId, readJsonFile, writeJsonFile } from "@/lib/mock/json-db";
import { getJsonEmployerById } from "@/lib/mock/profiles-store";

const JOBS_FILE = "jobs.json";
const JOB_ID_MIN = 10001;

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

export type StoredJobRecord = {
  job: Job;
  skills: JobSkill[];
};

type JobsDb = { jobs: StoredJobRecord[] };

function nowIso() {
  return new Date().toISOString();
}

function readJobs(): JobsDb {
  ensureDemoJsonSeeded();
  return readJsonFile<JobsDb>(JOBS_FILE, { jobs: [] });
}

function writeJobs(db: JobsDb) {
  writeJsonFile(JOBS_FILE, db);
}

function reviveJob(job: Job): Job {
  return {
    ...job,
    published_at: job.published_at ? new Date(job.published_at) : null,
    expires_at: job.expires_at ? new Date(job.expires_at) : null,
    created_at: new Date(job.created_at),
    updated_at: new Date(job.updated_at),
  };
}

function withCompanyName(job: Job): Job {
  const employer = getJsonEmployerById(job.employer_id);
  return {
    ...reviveJob(job),
    company_name: employer?.company_name ?? job.company_name ?? null,
  };
}

export function getJsonJobById(id: number): StoredJobRecord | null {
  const row = readJobs().jobs.find((j) => j.job.id === id);
  if (!row) return null;
  return {
    job: withCompanyName(row.job),
    skills: row.skills,
  };
}

export function listJsonJobsByEmployer(employerId: number): Job[] {
  return readJobs()
    .jobs.filter((j) => j.job.employer_id === employerId)
    .map((j) => withCompanyName(j.job))
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
}

export function listJsonPublicJobs(): JobSearchResult[] {
  return readJobs()
    .jobs.filter((j) => j.job.status === "active")
    .map((j) => {
      const employer = getJsonEmployerById(j.job.employer_id);
      return {
        ...withCompanyName(j.job),
        distance_m: null,
        employer_actively_hiring: employer?.actively_hiring ?? false,
      };
    });
}

/** Geocode and persist any active jobs missing map coordinates. */
export async function hydrateJsonJobLocations(): Promise<JobSearchResult[]> {
  const { ensureLocationCoords } = await import("@/lib/mock/ensure-location");
  const db = readJobs();
  let changed = false;

  for (const row of db.jobs) {
    if (row.job.status !== "active") continue;
    if (row.job.location_lat != null && row.job.location_lng != null) continue;
    const hydrated = await ensureLocationCoords(row.job);
    if (
      hydrated.location_lat !== row.job.location_lat ||
      hydrated.location_lng !== row.job.location_lng
    ) {
      row.job = { ...row.job, ...hydrated };
      changed = true;
    }
  }

  if (changed) writeJobs(db);
  return listJsonPublicJobs();
}

export function createJsonJob(
  employerId: number,
  input: JobInput
): Job {
  const db = readJobs();
  const stamp = nowIso();
  const status = input.status ?? "draft";
  const job: Job = {
    id: nextNumericId(
      db.jobs.map((j) => j.job),
      JOB_ID_MIN
    ),
    employer_id: employerId,
    title: input.title,
    description: input.description ?? null,
    job_type: input.job_type ?? null,
    location_lat: input.location_lat ?? null,
    location_lng: input.location_lng ?? null,
    postcode: input.postcode ?? null,
    address_text: input.address_text ?? null,
    salary_min: input.salary_min ?? null,
    salary_max: input.salary_max ?? null,
    salary_type: input.salary_type ?? null,
    requirements: input.requirements ?? null,
    status,
    published_at: status === "active" ? new Date(stamp) : null,
    expires_at: input.expires_at ? new Date(input.expires_at) : null,
    created_at: new Date(stamp),
    updated_at: new Date(stamp),
  };

  db.jobs.push({ job, skills: [] });
  writeJobs(db);
  return withCompanyName(job);
}

export function updateJsonJob(id: number, input: JobInput): Job {
  const db = readJobs();
  const index = db.jobs.findIndex((j) => j.job.id === id);
  if (index < 0) throw new Error("Job not found");

  const current = db.jobs[index]!;
  const stamp = nowIso();
  const status = input.status ?? current.job.status;
  const updated: Job = {
    ...current.job,
    title: input.title ?? current.job.title,
    description:
      input.description !== undefined
        ? input.description
        : current.job.description,
    job_type:
      input.job_type !== undefined ? input.job_type : current.job.job_type,
    location_lat:
      input.location_lat !== undefined
        ? input.location_lat
        : current.job.location_lat,
    location_lng:
      input.location_lng !== undefined
        ? input.location_lng
        : current.job.location_lng,
    postcode:
      input.postcode !== undefined ? input.postcode : current.job.postcode,
    address_text:
      input.address_text !== undefined
        ? input.address_text
        : current.job.address_text,
    salary_min:
      input.salary_min !== undefined
        ? input.salary_min
        : current.job.salary_min,
    salary_max:
      input.salary_max !== undefined
        ? input.salary_max
        : current.job.salary_max,
    salary_type:
      input.salary_type !== undefined
        ? input.salary_type
        : current.job.salary_type,
    requirements:
      input.requirements !== undefined
        ? input.requirements
        : current.job.requirements,
    status,
    published_at:
      status === "active" && !current.job.published_at
        ? new Date(stamp)
        : current.job.published_at,
    expires_at:
      input.expires_at !== undefined
        ? input.expires_at
          ? new Date(input.expires_at)
          : null
        : current.job.expires_at,
    updated_at: new Date(stamp),
  };

  db.jobs[index] = { ...current, job: updated };
  writeJobs(db);
  return withCompanyName(updated);
}

export function setJsonJobSkills(
  jobId: number,
  skills: { skill_id: number; required?: boolean }[]
) {
  const db = readJobs();
  const index = db.jobs.findIndex((j) => j.job.id === jobId);
  if (index < 0) return;

  db.jobs[index] = {
    ...db.jobs[index]!,
    skills: skills.map((skill, i) => ({
      id: i + 1,
      job_id: jobId,
      skill_id: skill.skill_id,
      required: skill.required ?? true,
    })),
  };
  writeJobs(db);
}
