import type {
  JobSearchFilters,
  JobSearchResult,
  JobType,
  WorkerSearchFilters,
  WorkerSearchResult,
} from "@/lib/db/types";
import { isRemoteDatabaseConfigured } from "@/lib/db/config";
import { NOTTINGHAM_CENTER } from "@/lib/search/constants";
import { hydrateJsonJobLocations } from "@/lib/mock/jobs-store";
import { hydrateJsonWorkerLocations } from "@/lib/mock/profiles-store";

function offset(
  lat: number,
  lng: number,
  dLat: number,
  dLng: number
): { lat: number; lng: number } {
  return { lat: lat + dLat, lng: lng + dLng };
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const now = new Date();
const daysAgo = (n: number) =>
  new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

const C = NOTTINGHAM_CENTER;

const MOCK_JOBS: JobSearchResult[] = [
  {
    id: 9001,
    employer_id: 1,
    title: "Warehouse Operative",
    description: "Pick and pack shifts at a busy distribution centre.",
    job_type: "full-time",
    ...coords(0.01, 0.02),
    postcode: "NG1 1AA",
    address_text: "Near Lace Market, Nottingham",
    salary_min: 24000,
    salary_max: 27000,
    salary_type: "annual",
    requirements: "Forklift licence preferred",
    status: "active",
    published_at: daysAgo(2),
    expires_at: null,
    created_at: daysAgo(3),
    updated_at: daysAgo(2),
    company_name: "Trent Logistics",
    distance_m: null,
  },
  {
    id: 9002,
    employer_id: 1,
    title: "Care Assistant",
    description: "Support residents in a residential care home.",
    job_type: "part-time",
    ...coords(0.025, -0.015),
    postcode: "NG5 1AB",
    address_text: "Sherwood, Nottingham",
    salary_min: 12,
    salary_max: 14,
    salary_type: "hourly",
    requirements: "DBS check required",
    status: "active",
    published_at: daysAgo(1),
    expires_at: null,
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
    company_name: "Greenwood Care",
    distance_m: null,
  },
  {
    id: 9003,
    employer_id: 2,
    title: "Kitchen Porter",
    description: "Evening shifts in a city-centre restaurant kitchen.",
    job_type: "temporary",
    ...coords(-0.008, 0.012),
    postcode: "NG1 5FS",
    address_text: "City Centre, Nottingham",
    salary_min: 11,
    salary_max: 13,
    salary_type: "hourly",
    requirements: null,
    status: "active",
    published_at: daysAgo(5),
    expires_at: null,
    created_at: daysAgo(5),
    updated_at: daysAgo(5),
    company_name: "Castle Kitchen Co",
    distance_m: null,
  },
  {
    id: 9004,
    employer_id: 2,
    title: "Construction Labourer",
    description: "Site labour on a residential build in Beeston.",
    job_type: "contract",
    ...coords(-0.035, -0.04),
    postcode: "NG9 2AB",
    address_text: "Beeston, Nottingham",
    salary_min: 140,
    salary_max: 160,
    salary_type: "daily",
    requirements: "CSCS card",
    status: "active",
    published_at: daysAgo(4),
    expires_at: null,
    created_at: daysAgo(4),
    updated_at: daysAgo(4),
    company_name: "Midlands Build Ltd",
    distance_m: null,
  },
  {
    id: 9005,
    employer_id: 3,
    title: "Retail Sales Assistant",
    description: "Weekend and weekday retail floor cover.",
    job_type: "part-time",
    ...coords(0.005, -0.03),
    postcode: "NG7 1QY",
    address_text: "Lenton, Nottingham",
    salary_min: 12,
    salary_max: 12,
    salary_type: "hourly",
    requirements: null,
    status: "active",
    published_at: daysAgo(0),
    expires_at: null,
    created_at: daysAgo(0),
    updated_at: daysAgo(0),
    company_name: "Queen's Road Retail",
    distance_m: null,
  },
  {
    id: 9006,
    employer_id: 3,
    title: "Delivery Driver",
    description: "Van delivery routes across Greater Nottingham.",
    job_type: "full-time",
    ...coords(0.04, 0.01),
    postcode: "NG3 5DX",
    address_text: "Mapperley, Nottingham",
    salary_min: 28000,
    salary_max: 32000,
    salary_type: "annual",
    requirements: "Full UK licence",
    status: "active",
    published_at: daysAgo(6),
    expires_at: null,
    created_at: daysAgo(6),
    updated_at: daysAgo(6),
    company_name: "Swift Parcel Notts",
    distance_m: null,
  },
  {
    id: 9007,
    employer_id: 4,
    title: "Apprentice Electrician",
    description: "Level 3 apprenticeship with a local contractor.",
    job_type: "apprenticeship",
    ...coords(-0.02, 0.035),
    postcode: "NG2 7AA",
    address_text: "West Bridgford",
    salary_min: 18000,
    salary_max: 22000,
    salary_type: "annual",
    requirements: "GCSE maths & English",
    status: "active",
    published_at: daysAgo(8),
    expires_at: null,
    created_at: daysAgo(8),
    updated_at: daysAgo(8),
    company_name: "Circuit Works",
    distance_m: null,
  },
  {
    id: 9008,
    employer_id: 4,
    title: "Office Administrator",
    description: "Reception and admin support for a growing SME.",
    job_type: "full-time",
    ...coords(0.015, -0.005),
    postcode: "NG1 2AB",
    address_text: "Old Market Square area",
    salary_min: 23000,
    salary_max: 26000,
    salary_type: "annual",
    requirements: "MS Office",
    status: "active",
    published_at: daysAgo(3),
    expires_at: null,
    created_at: daysAgo(3),
    updated_at: daysAgo(3),
    company_name: "Hockley Hub",
    distance_m: null,
  },
  {
    id: 9009,
    employer_id: 5,
    title: "Security Officer",
    description: "Night security at a retail park.",
    job_type: "full-time",
    ...coords(-0.045, 0.02),
    postcode: "NG8 3AA",
    address_text: "Wollaton / Bilborough",
    salary_min: 26000,
    salary_max: 29000,
    salary_type: "annual",
    requirements: "SIA licence",
    status: "active",
    published_at: daysAgo(7),
    expires_at: null,
    created_at: daysAgo(7),
    updated_at: daysAgo(7),
    company_name: "SafeGuard East Midlands",
    distance_m: null,
  },
  {
    id: 9010,
    employer_id: 5,
    title: "Bar Staff",
    description: "Busy weekend evenings — tips on top of hourly rate.",
    job_type: "part-time",
    ...coords(-0.002, 0.008),
    postcode: "NG1 6AJ",
    address_text: "Hockley nightlife strip",
    salary_min: 11,
    salary_max: 13,
    salary_type: "hourly",
    requirements: null,
    status: "active",
    published_at: daysAgo(1),
    expires_at: null,
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
    company_name: "Canal Side Bars",
    distance_m: null,
  },
  {
    id: 9011,
    employer_id: 6,
    title: "Teaching Assistant",
    description: "Primary school support role, term-time only.",
    job_type: "part-time",
    ...coords(0.03, 0.03),
    postcode: "NG4 1BB",
    address_text: "Carlton, Nottingham",
    salary_min: 20000,
    salary_max: 22000,
    salary_type: "annual",
    requirements: "Experience with children",
    status: "active",
    published_at: daysAgo(9),
    expires_at: null,
    created_at: daysAgo(9),
    updated_at: daysAgo(9),
    company_name: "Carlton Primary Trust",
    distance_m: null,
  },
  {
    id: 9012,
    employer_id: 6,
    title: "Cleaner",
    description: "Early morning commercial cleaning rounds.",
    job_type: "temporary",
    ...coords(0.018, -0.025),
    postcode: "NG7 6AA",
    address_text: "Radford, Nottingham",
    salary_min: 11,
    salary_max: 12,
    salary_type: "hourly",
    requirements: null,
    status: "active",
    published_at: daysAgo(2),
    expires_at: null,
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
    company_name: "Sparkle Services",
    distance_m: null,
  },
];

const MOCK_WORKERS: WorkerSearchResult[] = [
  {
    id: 8001,
    user_id: 1,
    headline: "Experienced warehouse operative",
    bio: "3 years pick/pack and FLT experience.",
    profile_photo_url: null,
    cv_file_url: null,
    ...coords(0.012, 0.018),
    postcode: "NG1 3AA",
    address_text: "Sneinton",
    desired_job_types: ["full-time", "temporary"],
    desired_salary_min: 25000,
    desired_salary_max: 30000,
    availability: "immediate",
    visibility: "public",
    actively_looking: false,
    contact_email: null,
    contact_phone: null,
    linkedin_url: null,
    created_at: daysAgo(10),
    updated_at: daysAgo(2),
    distance_m: null,
    top_skills: "Forklift, Warehouse",
  },
  {
    id: 8002,
    user_id: 2,
    headline: "Healthcare support worker",
    bio: "Looking for part-time care roles near Sherwood.",
    profile_photo_url: null,
    cv_file_url: null,
    ...coords(0.022, -0.012),
    postcode: "NG5 2CD",
    address_text: "Sherwood",
    desired_job_types: ["part-time"],
    desired_salary_min: 12,
    desired_salary_max: 15,
    availability: "2_weeks",
    visibility: "public",
    actively_looking: false,
    contact_email: null,
    contact_phone: null,
    linkedin_url: null,
    created_at: daysAgo(8),
    updated_at: daysAgo(1),
    distance_m: null,
    top_skills: "Care, First Aid",
  },
  {
    id: 8003,
    user_id: 3,
    headline: "Hospitality all-rounder",
    bio: "Bar, floor, and kitchen experience.",
    profile_photo_url: null,
    cv_file_url: null,
    ...coords(-0.006, 0.01),
    postcode: "NG1 5BB",
    address_text: "City Centre",
    desired_job_types: ["part-time", "temporary"],
    desired_salary_min: 11,
    desired_salary_max: 14,
    availability: "immediate",
    visibility: "public",
    actively_looking: false,
    contact_email: null,
    contact_phone: null,
    linkedin_url: null,
    created_at: daysAgo(4),
    updated_at: daysAgo(0),
    distance_m: null,
    top_skills: "Bar, Customer Service",
  },
  {
    id: 8004,
    user_id: 4,
    headline: "CSCS labourer",
    bio: "Available for short-notice site work.",
    profile_photo_url: null,
    cv_file_url: null,
    ...coords(-0.032, -0.038),
    postcode: "NG9 1EE",
    address_text: "Beeston",
    desired_job_types: ["contract", "temporary"],
    desired_salary_min: 140,
    desired_salary_max: 180,
    availability: "immediate",
    visibility: "public",
    actively_looking: false,
    contact_email: null,
    contact_phone: null,
    linkedin_url: null,
    created_at: daysAgo(12),
    updated_at: daysAgo(3),
    distance_m: null,
    top_skills: "CSCS, Groundworks",
  },
  {
    id: 8005,
    user_id: 5,
    headline: "Retail supervisor",
    bio: "5 years high-street retail management.",
    profile_photo_url: null,
    cv_file_url: null,
    ...coords(0.004, -0.028),
    postcode: "NG7 2FF",
    address_text: "Lenton",
    desired_job_types: ["full-time"],
    desired_salary_min: 26000,
    desired_salary_max: 32000,
    availability: "1_month",
    visibility: "public",
    actively_looking: false,
    contact_email: null,
    contact_phone: null,
    linkedin_url: null,
    created_at: daysAgo(15),
    updated_at: daysAgo(5),
    distance_m: null,
    top_skills: "Retail, Leadership",
  },
  {
    id: 8006,
    user_id: 6,
    headline: "Van driver (cat B)",
    bio: "Clean licence, local knowledge of Notts.",
    profile_photo_url: null,
    cv_file_url: null,
    ...coords(0.038, 0.008),
    postcode: "NG3 6HH",
    address_text: "Mapperley",
    desired_job_types: ["full-time", "contract"],
    desired_salary_min: 27000,
    desired_salary_max: 33000,
    availability: "immediate",
    visibility: "public",
    actively_looking: false,
    contact_email: null,
    contact_phone: null,
    linkedin_url: null,
    created_at: daysAgo(6),
    updated_at: daysAgo(1),
    distance_m: null,
    top_skills: "Driving, Delivery",
  },
  {
    id: 8007,
    user_id: 7,
    headline: "Electrical apprentice seeking sponsor",
    bio: "Eager to complete NVQ with a local firm.",
    profile_photo_url: null,
    cv_file_url: null,
    ...coords(-0.018, 0.032),
    postcode: "NG2 6JJ",
    address_text: "West Bridgford",
    desired_job_types: ["apprenticeship"],
    desired_salary_min: 16000,
    desired_salary_max: 20000,
    availability: "2_weeks",
    visibility: "public",
    actively_looking: false,
    contact_email: null,
    contact_phone: null,
    linkedin_url: null,
    created_at: daysAgo(20),
    updated_at: daysAgo(4),
    distance_m: null,
    top_skills: "Electrics, Maths",
  },
  {
    id: 8008,
    user_id: 8,
    headline: "Admin & reception",
    bio: "Organised, reliable, great phone manner.",
    profile_photo_url: null,
    cv_file_url: null,
    ...coords(0.014, -0.004),
    postcode: "NG1 2CC",
    address_text: "Lace Market",
    desired_job_types: ["full-time", "part-time"],
    desired_salary_min: 22000,
    desired_salary_max: 26000,
    availability: "immediate",
    visibility: "public",
    actively_looking: false,
    contact_email: null,
    contact_phone: null,
    linkedin_url: null,
    created_at: daysAgo(9),
    updated_at: daysAgo(2),
    distance_m: null,
    top_skills: "Admin, Excel",
  },
  {
    id: 8009,
    user_id: 9,
    headline: "SIA security officer",
    bio: "Door and static site experience.",
    profile_photo_url: null,
    cv_file_url: null,
    ...coords(-0.042, 0.018),
    postcode: "NG8 4KK",
    address_text: "Wollaton",
    desired_job_types: ["full-time", "temporary"],
    desired_salary_min: 25000,
    desired_salary_max: 30000,
    availability: "immediate",
    visibility: "public",
    actively_looking: false,
    contact_email: null,
    contact_phone: null,
    linkedin_url: null,
    created_at: daysAgo(11),
    updated_at: daysAgo(0),
    distance_m: null,
    top_skills: "SIA, Security",
  },
  {
    id: 8010,
    user_id: 10,
    headline: "Chef de partie",
    bio: "Looking for evening kitchen roles in the city.",
    profile_photo_url: null,
    cv_file_url: null,
    ...coords(-0.001, 0.006),
    postcode: "NG1 6LL",
    address_text: "Hockley",
    desired_job_types: ["full-time", "part-time"],
    desired_salary_min: 28000,
    desired_salary_max: 34000,
    availability: "2_weeks",
    visibility: "public",
    actively_looking: false,
    contact_email: null,
    contact_phone: null,
    linkedin_url: null,
    created_at: daysAgo(7),
    updated_at: daysAgo(3),
    distance_m: null,
    top_skills: "Cooking, Kitchen",
  },
  {
    id: 8011,
    user_id: 11,
    headline: "Teaching assistant (primary)",
    bio: "SEN experience, DBS on file.",
    profile_photo_url: null,
    cv_file_url: null,
    ...coords(0.028, 0.028),
    postcode: "NG4 2MM",
    address_text: "Carlton",
    desired_job_types: ["part-time", "contract"],
    desired_salary_min: 20000,
    desired_salary_max: 24000,
    availability: "1_month",
    visibility: "public",
    actively_looking: false,
    contact_email: null,
    contact_phone: null,
    linkedin_url: null,
    created_at: daysAgo(14),
    updated_at: daysAgo(6),
    distance_m: null,
    top_skills: "Education, SEN",
  },
  {
    id: 8012,
    user_id: 12,
    headline: "Commercial cleaner",
    bio: "Reliable early starts, own transport.",
    profile_photo_url: null,
    cv_file_url: null,
    ...coords(0.016, -0.022),
    postcode: "NG7 5NN",
    address_text: "Radford",
    desired_job_types: ["temporary", "part-time"],
    desired_salary_min: 11,
    desired_salary_max: 13,
    availability: "immediate",
    visibility: "public",
    actively_looking: false,
    contact_email: null,
    contact_phone: null,
    linkedin_url: null,
    created_at: daysAgo(5),
    updated_at: daysAgo(1),
    distance_m: null,
    top_skills: "Cleaning",
  },
];

for (const worker of MOCK_WORKERS) {
  worker.actively_looking = worker.id % 2 === 1;
}

function coords(dLat: number, dLng: number) {
  const p = offset(C.latitude, C.longitude, dLat, dLng);
  return { location_lat: p.lat, location_lng: p.lng };
}

function withDistance<
  T extends { location_lat: number | null; location_lng: number | null },
>(
  items: T[],
  lat?: number,
  lng?: number
): (T & { distance_m: number | null })[] {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return items.map((item) => ({ ...item, distance_m: null }));
  }
  return items.map((item) => {
    if (item.location_lat == null || item.location_lng == null) {
      return { ...item, distance_m: null };
    }
    return {
      ...item,
      distance_m: haversineMeters(
        lat,
        lng,
        Number(item.location_lat),
        Number(item.location_lng)
      ),
    };
  });
}

function withinRadius<T extends { distance_m: number | null }>(
  items: T[],
  radiusMeters?: number | null
): T[] {
  if (radiusMeters == null || !Number.isFinite(radiusMeters)) return items;
  return items.filter(
    (item) => item.distance_m != null && item.distance_m <= radiusMeters
  );
}

export function isMockMapDataEnabled(): boolean {
  const flag =
    process.env.USE_MOCK_MAP_DATA ?? process.env.NEXT_PUBLIC_USE_MOCK_MAP_DATA;
  if (flag === "1" || flag === "true") return true;
  return !isRemoteDatabaseConfigured();
}

export function getMockWorkerById(id: number): WorkerSearchResult | null {
  return MOCK_WORKERS.find((worker) => worker.id === id) ?? null;
}

export function getMockJobById(id: number): JobSearchResult | null {
  return MOCK_JOBS.find((job) => job.id === id) ?? null;
}

export async function searchMockJobs(
  filters: JobSearchFilters = {}
): Promise<JobSearchResult[]> {
  const persisted = await hydrateJsonJobLocations();
  const byId = new Map<number, JobSearchResult>();
  for (const job of [...MOCK_JOBS, ...persisted]) {
    byId.set(job.id, job);
  }

  let jobs = withDistance([...byId.values()], filters.lat, filters.lng);
  jobs = withinRadius(jobs, filters.radiusMeters);

  if (filters.field?.trim()) {
    const term = filters.field.trim().toLowerCase();
    jobs = jobs.filter((j) => j.title.toLowerCase().includes(term));
  }
  if (filters.jobType) {
    jobs = jobs.filter((j) => j.job_type === filters.jobType);
  }
  if (filters.salaryMin != null) {
    jobs = jobs.filter(
      (j) => j.salary_max == null || j.salary_max >= filters.salaryMin!
    );
  }
  if (filters.salaryMax != null) {
    jobs = jobs.filter(
      (j) => j.salary_min == null || j.salary_min <= filters.salaryMax!
    );
  }
  if (filters.postedWithinDays != null && filters.postedWithinDays > 0) {
    const cutoff = daysAgo(filters.postedWithinDays);
    jobs = jobs.filter(
      (j) => j.published_at != null && j.published_at >= cutoff
    );
  }

  jobs.sort((a, b) => (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity));
  return jobs.slice(0, filters.limit ?? 100).map((job) => ({
    ...job,
    employer_actively_hiring:
      job.employer_actively_hiring ?? job.id % 2 === 1,
  }));
}

export async function searchMockWorkers(
  filters: WorkerSearchFilters = {}
): Promise<WorkerSearchResult[]> {
  const persisted = await hydrateJsonWorkerLocations();
  const byId = new Map<number, WorkerSearchResult>();
  for (const worker of [...MOCK_WORKERS, ...persisted]) {
    byId.set(worker.id, worker);
  }

  let workers = withDistance([...byId.values()], filters.lat, filters.lng);
  workers = withinRadius(workers, filters.radiusMeters);

  if (filters.field?.trim()) {
    const term = filters.field.trim().toLowerCase();
    workers = workers.filter((w) =>
      w.headline?.toLowerCase().includes(term)
    );
  }
  if (filters.jobType) {
    workers = workers.filter((w) =>
      (w.desired_job_types as JobType[] | null)?.includes(filters.jobType!)
    );
  }
  if (filters.availability) {
    workers = workers.filter((w) => w.availability === filters.availability);
  }

  workers.sort(
    (a, b) => (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity)
  );
  return workers.slice(0, filters.limit ?? 100).map((worker) => ({
    ...worker,
    actively_looking: worker.actively_looking ?? worker.id % 2 === 1,
    contact_email: null,
    contact_phone: null,
    linkedin_url: null,
  }));
}
