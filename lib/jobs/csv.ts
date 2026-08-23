import type { JobStatus, JobType, SalaryType } from "@/lib/db/types";
import {
  blankToNull,
  csvEscape,
  normalizeHeader,
  parseCsv,
  parseEnum,
  parseOptionalCoord,
  parseOptionalInt,
  parseSkillNames,
} from "@/lib/csv";

export type JobCsvInput = {
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

export const JOB_CSV_MAX_ROWS = 200;
export const JOB_CSV_MAX_BYTES = 2 * 1024 * 1024;

/** Headers that map onto `jobs` columns. `skills` is a convenience for `job_skills`. */
export const JOB_CSV_HEADERS = [
  "title",
  "description",
  "job_type",
  "postcode",
  "address_text",
  "location_lat",
  "location_lng",
  "salary_min",
  "salary_max",
  "salary_type",
  "requirements",
  "status",
  "expires_at",
  "skills",
] as const;

export type JobCsvHeader = (typeof JOB_CSV_HEADERS)[number];

const JOB_TYPES: JobType[] = [
  "full-time",
  "part-time",
  "contract",
  "temporary",
  "apprenticeship",
];

const SALARY_TYPES: SalaryType[] = ["hourly", "daily", "annual"];
const JOB_STATUSES: JobStatus[] = ["draft", "active", "closed", "expired"];

const HEADER_ALIASES: Record<string, JobCsvHeader> = {
  title: "title",
  job_title: "title",
  description: "description",
  job_type: "job_type",
  postcode: "postcode",
  address_text: "address_text",
  address: "address_text",
  location_lat: "location_lat",
  lat: "location_lat",
  location_lng: "location_lng",
  lng: "location_lng",
  salary_min: "salary_min",
  salary_max: "salary_max",
  salary_type: "salary_type",
  requirements: "requirements",
  status: "status",
  expires_at: "expires_at",
  skills: "skills",
};

export type ParsedJobCsvRow = {
  line: number;
  input: JobCsvInput;
  skillNames: string[];
};

export type JobCsvRowError = {
  line: number;
  error: string;
};

export function parseJobCsv(text: string): {
  rows: ParsedJobCsvRow[];
  errors: JobCsvRowError[];
  error?: string;
} {
  const table = parseCsv(text);
  if (table.length === 0) {
    return { rows: [], errors: [], error: "CSV file is empty" };
  }

  const headerCells = table[0] ?? [];
  const indexByField = new Map<JobCsvHeader, number>();
  for (let i = 0; i < headerCells.length; i++) {
    const mapped = HEADER_ALIASES[normalizeHeader(headerCells[i] ?? "")];
    if (mapped) indexByField.set(mapped, i);
  }

  if (!indexByField.has("title")) {
    return {
      rows: [],
      errors: [],
      error: `Missing required header: title. Expected: ${JOB_CSV_HEADERS.join(", ")}`,
    };
  }

  const dataRows = table.slice(1);
  if (dataRows.length > JOB_CSV_MAX_ROWS) {
    return {
      rows: [],
      errors: [],
      error: `Too many rows (max ${JOB_CSV_MAX_ROWS})`,
    };
  }

  const rows: ParsedJobCsvRow[] = [];
  const errors: JobCsvRowError[] = [];

  dataRows.forEach((cells, offset) => {
    const line = offset + 2;
    const get = (field: JobCsvHeader) => {
      const index = indexByField.get(field);
      return index == null ? undefined : cells[index];
    };

    const title = blankToNull(get("title"));
    if (!title) {
      errors.push({ line, error: "title is required" });
      return;
    }
    if (title.length > 255) {
      errors.push({ line, error: "title must be 255 characters or fewer" });
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

    const jobType = parseEnum(blankToNull(get("job_type")), JOB_TYPES, "job_type");
    if (!jobType.ok) {
      errors.push({ line, error: jobType.error });
      return;
    }

    const salaryType = parseEnum(
      blankToNull(get("salary_type")),
      SALARY_TYPES,
      "salary_type"
    );
    if (!salaryType.ok) {
      errors.push({ line, error: salaryType.error });
      return;
    }

    const status = parseEnum(blankToNull(get("status")), JOB_STATUSES, "status");
    if (!status.ok) {
      errors.push({ line, error: status.error });
      return;
    }

    const salaryMin = parseOptionalInt(blankToNull(get("salary_min")), "salary_min");
    if (!salaryMin.ok) {
      errors.push({ line, error: salaryMin.error });
      return;
    }

    const salaryMax = parseOptionalInt(blankToNull(get("salary_max")), "salary_max");
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
      input: {
        title,
        description: blankToNull(get("description")),
        job_type: jobType.value,
        postcode,
        address_text: address,
        location_lat: lat.value,
        location_lng: lng.value,
        salary_min: salaryMin.value,
        salary_max: salaryMax.value,
        salary_type: salaryType.value,
        requirements: blankToNull(get("requirements")),
        status: status.value ?? "draft",
        expires_at: blankToNull(get("expires_at")),
      },
    });
  });

  return { rows, errors };
}

export function buildJobCsvTemplate(): string {
  const sample = [
    [
      "Warehouse Operative",
      "Pick, pack and dispatch orders on a busy shift.",
      "full-time",
      "NG1 5FW",
      "Nottingham City Centre",
      "",
      "",
      "24000",
      "28000",
      "annual",
      "Able to lift 15kg and work on a night shift.",
      "active",
      "2026-12-31",
      "Forklift|Warehouse Picking",
    ],
    [
      "Care Assistant",
      "Support residents with daily living in a residential home.",
      "part-time",
      "NG7 6LH",
      "Hyson Green",
      "",
      "",
      "12",
      "14",
      "hourly",
      "Care Certificate preferred.",
      "draft",
      "",
      "Care Certificate|First Aid",
    ],
  ];

  return [
    JOB_CSV_HEADERS.join(","),
    ...sample.map((row) => row.map(csvEscape).join(",")),
  ].join("\n");
}
