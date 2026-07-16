import type {
  Availability,
  EmployerProfile,
  JobType,
  Proficiency,
  Visibility,
  WorkerExperience,
  WorkerProfile,
  WorkerQualification,
  WorkerSearchResult,
  WorkerSkill,
} from "@/lib/db/types";
import { ensureDemoJsonSeeded } from "@/lib/mock/demo-seed";
import { nextNumericId, readJsonFile, writeJsonFile } from "@/lib/mock/json-db";

const WORKERS_FILE = "workers.json";
const EMPLOYERS_FILE = "employers.json";

/** Avoid colliding with hardcoded Nottingham mock IDs (8xxx / 9xxx). */
const WORKER_ID_MIN = 10001;
const EMPLOYER_ID_MIN = 10001;

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

export type EmployerProfileInput = {
  company_name?: string | null;
  company_description?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  linkedin_url?: string | null;
};

export type StoredWorkerRecord = {
  profile: WorkerProfile;
  skills: WorkerSkill[];
  experience: WorkerExperience[];
  qualifications: WorkerQualification[];
};

type WorkersDb = { workers: StoredWorkerRecord[] };
type EmployersDb = { employers: EmployerProfile[] };

function nowIso() {
  return new Date().toISOString();
}

function readWorkers(): WorkersDb {
  ensureDemoJsonSeeded();
  return readJsonFile<WorkersDb>(WORKERS_FILE, { workers: [] });
}

function writeWorkers(db: WorkersDb) {
  writeJsonFile(WORKERS_FILE, db);
}

function readEmployers(): EmployersDb {
  ensureDemoJsonSeeded();
  return readJsonFile<EmployersDb>(EMPLOYERS_FILE, { employers: [] });
}

function writeEmployers(db: EmployersDb) {
  writeJsonFile(EMPLOYERS_FILE, db);
}

function reviveWorkerProfile(profile: WorkerProfile): WorkerProfile {
  return {
    ...profile,
    contact_email: profile.contact_email ?? null,
    contact_phone: profile.contact_phone ?? null,
    linkedin_url: profile.linkedin_url ?? null,
    created_at: new Date(profile.created_at),
    updated_at: new Date(profile.updated_at),
  };
}

function reviveEmployerProfile(profile: EmployerProfile): EmployerProfile {
  return {
    ...profile,
    contact_email: profile.contact_email ?? null,
    contact_phone: profile.contact_phone ?? null,
    linkedin_url: profile.linkedin_url ?? null,
    created_at: new Date(profile.created_at),
    updated_at: profile.updated_at
      ? new Date(profile.updated_at)
      : new Date(profile.created_at),
  };
}

export function getJsonWorkerByUserId(
  userId: number
): StoredWorkerRecord | null {
  const row = readWorkers().workers.find((w) => w.profile.user_id === userId);
  if (!row) return null;
  return {
    ...row,
    profile: reviveWorkerProfile(row.profile),
  };
}

export function getJsonWorkerById(id: number): StoredWorkerRecord | null {
  const row = readWorkers().workers.find((w) => w.profile.id === id);
  if (!row) return null;
  return {
    ...row,
    profile: reviveWorkerProfile(row.profile),
  };
}

export function createJsonWorkerProfile(
  userId: number,
  input: WorkerProfileInput = {}
): WorkerProfile {
  const db = readWorkers();
  if (db.workers.some((w) => w.profile.user_id === userId)) {
    throw new Error("Worker profile already exists");
  }

  const stamp = nowIso();
  const profile: WorkerProfile = {
    id: nextNumericId(
      db.workers.map((w) => w.profile),
      WORKER_ID_MIN
    ),
    user_id: userId,
    headline: input.headline ?? null,
    bio: input.bio ?? null,
    profile_photo_url: input.profile_photo_url ?? null,
    cv_file_url: input.cv_file_url ?? null,
    location_lat: input.location_lat ?? null,
    location_lng: input.location_lng ?? null,
    postcode: input.postcode ?? null,
    address_text: input.address_text ?? null,
    desired_job_types: input.desired_job_types ?? null,
    desired_salary_min: input.desired_salary_min ?? null,
    desired_salary_max: input.desired_salary_max ?? null,
    availability: input.availability ?? null,
    visibility: input.visibility ?? "public",
    contact_email: input.contact_email ?? null,
    contact_phone: input.contact_phone ?? null,
    linkedin_url: input.linkedin_url ?? null,
    created_at: new Date(stamp),
    updated_at: new Date(stamp),
  };

  db.workers.push({
    profile,
    skills: [],
    experience: [],
    qualifications: [],
  });
  writeWorkers(db);
  return reviveWorkerProfile(profile);
}

export function updateJsonWorkerProfile(
  id: number,
  input: WorkerProfileInput
): WorkerProfile {
  const db = readWorkers();
  const index = db.workers.findIndex((w) => w.profile.id === id);
  if (index < 0) throw new Error("Worker profile not found");

  const current = db.workers[index]!;
  const updated: WorkerProfile = {
    ...current.profile,
    headline: input.headline !== undefined ? input.headline : current.profile.headline,
    bio: input.bio !== undefined ? input.bio : current.profile.bio,
    profile_photo_url:
      input.profile_photo_url !== undefined
        ? input.profile_photo_url
        : current.profile.profile_photo_url,
    cv_file_url:
      input.cv_file_url !== undefined
        ? input.cv_file_url
        : current.profile.cv_file_url,
    location_lat:
      input.location_lat !== undefined
        ? input.location_lat
        : current.profile.location_lat,
    location_lng:
      input.location_lng !== undefined
        ? input.location_lng
        : current.profile.location_lng,
    postcode:
      input.postcode !== undefined ? input.postcode : current.profile.postcode,
    address_text:
      input.address_text !== undefined
        ? input.address_text
        : current.profile.address_text,
    desired_job_types:
      input.desired_job_types !== undefined
        ? input.desired_job_types
        : current.profile.desired_job_types,
    desired_salary_min:
      input.desired_salary_min !== undefined
        ? input.desired_salary_min
        : current.profile.desired_salary_min,
    desired_salary_max:
      input.desired_salary_max !== undefined
        ? input.desired_salary_max
        : current.profile.desired_salary_max,
    availability:
      input.availability !== undefined
        ? input.availability
        : current.profile.availability,
    visibility: input.visibility ?? current.profile.visibility,
    contact_email:
      input.contact_email !== undefined
        ? input.contact_email
        : current.profile.contact_email,
    contact_phone:
      input.contact_phone !== undefined
        ? input.contact_phone
        : current.profile.contact_phone,
    linkedin_url:
      input.linkedin_url !== undefined
        ? input.linkedin_url
        : current.profile.linkedin_url,
    updated_at: new Date(nowIso()),
  };

  db.workers[index] = { ...current, profile: updated };
  writeWorkers(db);
  return reviveWorkerProfile(updated);
}

export function setJsonWorkerSkills(
  workerId: number,
  skills: { skill_id: number; proficiency?: Proficiency | null }[]
) {
  const db = readWorkers();
  const index = db.workers.findIndex((w) => w.profile.id === workerId);
  if (index < 0) return;

  db.workers[index] = {
    ...db.workers[index]!,
    skills: skills.map((skill, i) => ({
      id: i + 1,
      worker_id: workerId,
      skill_id: skill.skill_id,
      proficiency: skill.proficiency ?? null,
    })),
  };
  writeWorkers(db);
}

export function replaceJsonWorkerExperience(
  workerId: number,
  experience: Omit<WorkerExperience, "id" | "worker_id">[]
) {
  const db = readWorkers();
  const index = db.workers.findIndex((w) => w.profile.id === workerId);
  if (index < 0) return;

  db.workers[index] = {
    ...db.workers[index]!,
    experience: experience.map((entry, i) => ({
      id: i + 1,
      worker_id: workerId,
      job_title: entry.job_title ?? null,
      employer_name: entry.employer_name ?? null,
      start_date: entry.start_date ?? null,
      end_date: entry.end_date ?? null,
      description: entry.description ?? null,
    })),
  };
  writeWorkers(db);
}

export function replaceJsonWorkerQualifications(
  workerId: number,
  qualifications: Omit<WorkerQualification, "id" | "worker_id">[]
) {
  const db = readWorkers();
  const index = db.workers.findIndex((w) => w.profile.id === workerId);
  if (index < 0) return;

  db.workers[index] = {
    ...db.workers[index]!,
    qualifications: qualifications.map((entry, i) => ({
      id: i + 1,
      worker_id: workerId,
      qualification_name: entry.qualification_name ?? null,
      institution: entry.institution ?? null,
      year_awarded: entry.year_awarded ?? null,
      certificate_file_url: entry.certificate_file_url ?? null,
    })),
  };
  writeWorkers(db);
}

export function listJsonPublicWorkers(): WorkerSearchResult[] {
  return readWorkers()
    .workers.filter((w) => w.profile.visibility === "public")
    .map((w) => {
      const profile = reviveWorkerProfile(w.profile);
      const {
        contact_email: _e,
        contact_phone: _p,
        linkedin_url: _l,
        ...publicProfile
      } = profile;
      return {
        ...publicProfile,
        contact_email: null,
        contact_phone: null,
        linkedin_url: null,
        distance_m: null,
        top_skills: null,
      };
    });
}

/** Geocode and persist any public workers missing map coordinates. */
export async function hydrateJsonWorkerLocations(): Promise<
  WorkerSearchResult[]
> {
  const { ensureLocationCoords } = await import("@/lib/mock/ensure-location");
  const db = readWorkers();
  let changed = false;

  for (const row of db.workers) {
    if (row.profile.visibility !== "public") continue;
    if (row.profile.location_lat != null && row.profile.location_lng != null) {
      continue;
    }
    const hydrated = await ensureLocationCoords(row.profile);
    if (
      hydrated.location_lat !== row.profile.location_lat ||
      hydrated.location_lng !== row.profile.location_lng
    ) {
      row.profile = { ...row.profile, ...hydrated };
      changed = true;
    }
  }

  if (changed) writeWorkers(db);
  return listJsonPublicWorkers();
}

export function getJsonEmployerByUserId(
  userId: number
): EmployerProfile | null {
  const row = readEmployers().employers.find((e) => e.user_id === userId);
  return row ? reviveEmployerProfile(row) : null;
}

export function getJsonEmployerById(id: number): EmployerProfile | null {
  const row = readEmployers().employers.find((e) => e.id === id);
  return row ? reviveEmployerProfile(row) : null;
}

export function createJsonEmployerProfile(
  userId: number,
  input: EmployerProfileInput = {}
): EmployerProfile {
  const db = readEmployers();
  if (db.employers.some((e) => e.user_id === userId)) {
    throw new Error("Employer profile already exists");
  }

  const stamp = nowIso();
  const profile: EmployerProfile = {
    id: nextNumericId(db.employers, EMPLOYER_ID_MIN),
    user_id: userId,
    company_name: input.company_name ?? null,
    company_description: input.company_description ?? null,
    logo_url: input.logo_url ?? null,
    website_url: input.website_url ?? null,
    contact_email: input.contact_email ?? null,
    contact_phone: input.contact_phone ?? null,
    linkedin_url: input.linkedin_url ?? null,
    created_at: new Date(stamp),
    updated_at: new Date(stamp),
  };

  db.employers.push(profile);
  writeEmployers(db);
  return reviveEmployerProfile(profile);
}

export function updateJsonEmployerProfile(
  id: number,
  input: EmployerProfileInput
): EmployerProfile {
  const db = readEmployers();
  const index = db.employers.findIndex((e) => e.id === id);
  if (index < 0) throw new Error("Employer profile not found");

  const current = db.employers[index]!;
  const updated: EmployerProfile = {
    ...current,
    company_name:
      input.company_name !== undefined
        ? input.company_name
        : current.company_name,
    company_description:
      input.company_description !== undefined
        ? input.company_description
        : current.company_description,
    logo_url: input.logo_url !== undefined ? input.logo_url : current.logo_url,
    website_url:
      input.website_url !== undefined ? input.website_url : current.website_url,
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
    updated_at: new Date(nowIso()),
  };

  db.employers[index] = updated;
  writeEmployers(db);
  return reviveEmployerProfile(updated);
}
