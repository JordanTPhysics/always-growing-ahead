import type {
  Availability,
  JobType,
  Visibility,
} from "@/lib/db/types";
import {
  blankToNull,
  csvEscape,
  normalizeHeader,
  parseCsv,
  parseEnum,
  parseOptionalBoolean,
  parseOptionalCoord,
  parseOptionalInt,
  parseSkillNames,
} from "@/lib/csv";

export type WorkerCsvInput = {
  headline?: string | null;
  bio?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  postcode?: string | null;
  address_text?: string | null;
  desired_job_types?: JobType[] | null;
  desired_salary_min?: number | null;
  desired_salary_max?: number | null;
  availability?: Availability | null;
  visibility?: Visibility;
  actively_looking?: boolean;
  contact_email?: string | null;
  contact_phone?: string | null;
  linkedin_url?: string | null;
};

export const WORKER_CSV_MAX_ROWS = 200;
export const WORKER_CSV_MAX_BYTES = 2 * 1024 * 1024;

/** Headers that map onto `worker_profiles`. `skills` and `user_email` are conveniences. */
export const WORKER_CSV_HEADERS = [
  "headline",
  "bio",
  "postcode",
  "address_text",
  "location_lat",
  "location_lng",
  "desired_job_types",
  "desired_salary_min",
  "desired_salary_max",
  "availability",
  "visibility",
  "actively_looking",
  "contact_email",
  "contact_phone",
  "linkedin_url",
  "skills",
  "user_email",
] as const;

export type WorkerCsvHeader = (typeof WORKER_CSV_HEADERS)[number];

const JOB_TYPES: JobType[] = [
  "full-time",
  "part-time",
  "contract",
  "temporary",
  "apprenticeship",
];

const AVAILABILITY: Availability[] = [
  "immediate",
  "2_weeks",
  "1_month",
  "not_looking",
];

const VISIBILITY: Visibility[] = ["public", "hidden"];

const HEADER_ALIASES: Record<string, WorkerCsvHeader> = {
  headline: "headline",
  bio: "bio",
  postcode: "postcode",
  address_text: "address_text",
  address: "address_text",
  location_lat: "location_lat",
  lat: "location_lat",
  location_lng: "location_lng",
  lng: "location_lng",
  desired_job_types: "desired_job_types",
  desired_salary_min: "desired_salary_min",
  desired_salary_max: "desired_salary_max",
  availability: "availability",
  visibility: "visibility",
  actively_looking: "actively_looking",
  contact_email: "contact_email",
  contact_phone: "contact_phone",
  linkedin_url: "linkedin_url",
  skills: "skills",
  user_email: "user_email",
};

export type ParsedWorkerCsvRow = {
  line: number;
  input: WorkerCsvInput;
  skillNames: string[];
  userEmail: string | null;
};

export type WorkerCsvRowError = {
  line: number;
  error: string;
};

function parseJobTypes(
  value: string | null
): { ok: true; value: JobType[] | null } | { ok: false; error: string } {
  const names = parseSkillNames(value);
  if (names.length === 0) return { ok: true, value: null };
  const invalid = names.filter((name) => !(JOB_TYPES as string[]).includes(name));
  if (invalid.length > 0) {
    return {
      ok: false,
      error: `desired_job_types must be pipe-separated values from: ${JOB_TYPES.join(", ")}`,
    };
  }
  return { ok: true, value: names as JobType[] };
}

export function parseWorkerCsv(text: string): {
  rows: ParsedWorkerCsvRow[];
  errors: WorkerCsvRowError[];
  error?: string;
} {
  const table = parseCsv(text);
  if (table.length === 0) {
    return { rows: [], errors: [], error: "CSV file is empty" };
  }

  const headerCells = table[0] ?? [];
  const indexByField = new Map<WorkerCsvHeader, number>();
  for (let i = 0; i < headerCells.length; i++) {
    const mapped = HEADER_ALIASES[normalizeHeader(headerCells[i] ?? "")];
    if (mapped) indexByField.set(mapped, i);
  }

  if (!indexByField.has("headline")) {
    return {
      rows: [],
      errors: [],
      error: `Missing required header: headline. Expected: ${WORKER_CSV_HEADERS.join(", ")}`,
    };
  }

  const dataRows = table.slice(1);
  if (dataRows.length > WORKER_CSV_MAX_ROWS) {
    return {
      rows: [],
      errors: [],
      error: `Too many rows (max ${WORKER_CSV_MAX_ROWS})`,
    };
  }

  const rows: ParsedWorkerCsvRow[] = [];
  const errors: WorkerCsvRowError[] = [];

  dataRows.forEach((cells, offset) => {
    const line = offset + 2;
    const get = (field: WorkerCsvHeader) => {
      const index = indexByField.get(field);
      return index == null ? undefined : cells[index];
    };

    const headline = blankToNull(get("headline"));
    if (!headline) {
      errors.push({ line, error: "headline is required" });
      return;
    }
    if (headline.length > 255) {
      errors.push({ line, error: "headline must be 255 characters or fewer" });
      return;
    }

    const contactEmail = blankToNull(get("contact_email"));
    if (contactEmail && contactEmail.length > 255) {
      errors.push({ line, error: "contact_email must be 255 characters or fewer" });
      return;
    }

    const contactPhone = blankToNull(get("contact_phone"));
    if (contactPhone && contactPhone.length > 30) {
      errors.push({ line, error: "contact_phone must be 30 characters or fewer" });
      return;
    }

    const linkedin = blankToNull(get("linkedin_url"));
    if (linkedin && linkedin.length > 500) {
      errors.push({ line, error: "linkedin_url must be 500 characters or fewer" });
      return;
    }

    const postcode = blankToNull(get("postcode"));
    if (postcode && postcode.length > 10) {
      errors.push({ line, error: "postcode must be 10 characters or fewer" });
      return;
    }

    const address = blankToNull(get("address_text"));
    if (address && address.length > 255) {
      errors.push({ line, error: "address_text must be 255 characters or fewer" });
      return;
    }

    const userEmail = blankToNull(get("user_email"));
    if (userEmail && !userEmail.includes("@")) {
      errors.push({ line, error: "user_email must be a valid email" });
      return;
    }

    const jobTypes = parseJobTypes(blankToNull(get("desired_job_types")));
    if (!jobTypes.ok) {
      errors.push({ line, error: jobTypes.error });
      return;
    }

    const availability = parseEnum(
      blankToNull(get("availability")),
      AVAILABILITY,
      "availability"
    );
    if (!availability.ok) {
      errors.push({ line, error: availability.error });
      return;
    }

    const visibility = parseEnum(
      blankToNull(get("visibility")),
      VISIBILITY,
      "visibility"
    );
    if (!visibility.ok) {
      errors.push({ line, error: visibility.error });
      return;
    }

    const looking = parseOptionalBoolean(
      blankToNull(get("actively_looking")),
      "actively_looking"
    );
    if (!looking.ok) {
      errors.push({ line, error: looking.error });
      return;
    }

    const salaryMin = parseOptionalInt(
      blankToNull(get("desired_salary_min")),
      "desired_salary_min"
    );
    if (!salaryMin.ok) {
      errors.push({ line, error: salaryMin.error });
      return;
    }

    const salaryMax = parseOptionalInt(
      blankToNull(get("desired_salary_max")),
      "desired_salary_max"
    );
    if (!salaryMax.ok) {
      errors.push({ line, error: salaryMax.error });
      return;
    }

    const lat = parseOptionalCoord(
      blankToNull(get("location_lat")),
      "location_lat",
      -90,
      90
    );
    if (!lat.ok) {
      errors.push({ line, error: lat.error });
      return;
    }

    const lng = parseOptionalCoord(
      blankToNull(get("location_lng")),
      "location_lng",
      -180,
      180
    );
    if (!lng.ok) {
      errors.push({ line, error: lng.error });
      return;
    }

    rows.push({
      line,
      skillNames: parseSkillNames(blankToNull(get("skills"))),
      userEmail,
      input: {
        headline,
        bio: blankToNull(get("bio")),
        postcode,
        address_text: address,
        location_lat: lat.value,
        location_lng: lng.value,
        desired_job_types: jobTypes.value,
        desired_salary_min: salaryMin.value,
        desired_salary_max: salaryMax.value,
        availability: availability.value ?? "immediate",
        visibility: visibility.value ?? "public",
        actively_looking: looking.value ?? true,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        linkedin_url: linkedin,
      },
    });
  });

  return { rows, errors };
}

export function buildWorkerCsvTemplate(): string {
  const sample = [
    [
      "Warehouse picker",
      "Experienced picker looking for night shifts.",
      "NG1 5FW",
      "Nottingham City Centre",
      "",
      "",
      "full-time|part-time",
      "24000",
      "28000",
      "immediate",
      "public",
      "true",
      "picker@example.com",
      "07700900001",
      "",
      "Forklift|Warehouse Picking",
      "",
    ],
    [
      "Care assistant",
      "Residential care experience, available days.",
      "NG7 6LH",
      "Hyson Green",
      "",
      "",
      "part-time",
      "",
      "",
      "2_weeks",
      "public",
      "true",
      "care@example.com",
      "07700900002",
      "",
      "Care Certificate|First Aid",
      "",
    ],
  ];

  return [
    WORKER_CSV_HEADERS.join(","),
    ...sample.map((row) => row.map(csvEscape).join(",")),
  ].join("\n");
}
