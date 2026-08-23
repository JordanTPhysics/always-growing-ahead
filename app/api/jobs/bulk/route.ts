import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api/auth";
import { canPostJobs, type Tier } from "@/lib/entitlements";
import { getEmployerByUserId } from "@/lib/db/repositories/employers";
import { createJob, setJobSkills } from "@/lib/db/repositories/jobs";
import { listSkills } from "@/lib/db/repositories/skills";
import {
  buildJobCsvTemplate,
  JOB_CSV_MAX_BYTES,
  parseJobCsv,
  type JobCsvInput,
} from "@/lib/jobs/csv";
import { ensureLocationCoords } from "@/lib/mock/ensure-location";
import {
  createJsonJob,
  setJsonJobSkills,
} from "@/lib/mock/jobs-store";
import { isMockMapDataEnabled } from "@/lib/mock/nottingham";
import { getJsonEmployerByUserId } from "@/lib/mock/profiles-store";
import type { Skill } from "@/lib/db/types";

export const runtime = "nodejs";

function assertCanPostJobs(session: {
  user: { tier: Tier; isEmailVerified: boolean };
}) {
  if (isMockMapDataEnabled()) return null;
  if (!session.user.isEmailVerified) {
    return jsonError("Verify your email before posting jobs", 403);
  }
  if (!canPostJobs(session.user.tier)) {
    return jsonError("Advanced subscription required to post jobs", 403);
  }
  return null;
}

function skillMap(catalog: Skill[]) {
  const map = new Map<string, Skill>();
  for (const skill of catalog) {
    map.set(skill.name.trim().toLowerCase(), skill);
  }
  return map;
}

async function locateRow(
  input: JobCsvInput,
  cache: Map<string, JobCsvInput>
): Promise<JobCsvInput> {
  if (
    input.location_lat != null &&
    input.location_lng != null &&
    Number.isFinite(input.location_lat) &&
    Number.isFinite(input.location_lng)
  ) {
    return input;
  }
  const key = (input.postcode || input.address_text || "").trim().toUpperCase();
  if (!key) return input;
  const cached = cache.get(key);
  if (cached) {
    return {
      ...input,
      location_lat: input.location_lat ?? cached.location_lat,
      location_lng: input.location_lng ?? cached.location_lng,
      postcode: input.postcode || cached.postcode,
      address_text: input.address_text || cached.address_text,
    };
  }
  const located = await ensureLocationCoords(input);
  cache.set(key, located);
  return located;
}

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  return new NextResponse(buildJobCsvTemplate(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="jobs-bulk-sample.csv"',
    },
  });
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const denied = assertCanPostJobs(session);
  if (denied) return denied;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return jsonError("Upload a CSV file as `file`");
  }
  if (file.size > JOB_CSV_MAX_BYTES) {
    return jsonError("CSV file is too large (max 2MB)");
  }

  const text = await file.text();
  const parsed = parseJobCsv(text);
  if (parsed.error) return jsonError(parsed.error);

  const userId = Number(session.user.id);
  const mock = isMockMapDataEnabled();
  const employer = mock
    ? getJsonEmployerByUserId(userId)
    : await getEmployerByUserId(userId);
  if (!employer) {
    return jsonError("Create an employer profile first", 400);
  }

  const catalog = mock ? [] : await listSkills();
  const skillsByName = skillMap(catalog);
  const geoCache = new Map<string, JobCsvInput>();

  const created: { line: number; id: number; title: string }[] = [];
  const failed = [...parsed.errors];
  const warnings: { line: number; message: string }[] = [];

  for (const row of parsed.rows) {
    try {
      const located = await locateRow(row.input, geoCache);
      const job = mock
        ? createJsonJob(employer.id, located)
        : await createJob(employer.id, located);

      const unknown: string[] = [];
      const skills = row.skillNames.flatMap((name) => {
        const match = skillsByName.get(name.toLowerCase());
        if (!match) {
          unknown.push(name);
          return [];
        }
        return [{ skill_id: match.id, required: true }];
      });

      if (skills.length > 0) {
        if (mock) setJsonJobSkills(job.id, skills);
        else await setJobSkills(job.id, skills);
      }
      if (unknown.length > 0 && catalog.length > 0) {
        warnings.push({
          line: row.line,
          message: `Unknown skills skipped: ${unknown.join(", ")}`,
        });
      }

      created.push({ line: row.line, id: job.id, title: job.title });
    } catch (err) {
      failed.push({
        line: row.line,
        error: err instanceof Error ? err.message : "Failed to create job",
      });
    }
  }

  return NextResponse.json({
    employer_id: employer.id,
    created,
    failed,
    warnings,
  });
}
