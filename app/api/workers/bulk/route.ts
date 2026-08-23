import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { requireAdmin } from "@/lib/api/admin";
import { listSkills } from "@/lib/db/repositories/skills";
import { getUserByEmail } from "@/lib/db/repositories/users";
import {
  createWorkerProfile,
  getWorkerByUserId,
  setWorkerSkills,
} from "@/lib/db/repositories/workers";
import {
  buildWorkerCsvTemplate,
  WORKER_CSV_MAX_BYTES,
  parseWorkerCsv,
  type WorkerCsvInput,
} from "@/lib/workers/csv";
import { ensureLocationCoords } from "@/lib/mock/ensure-location";
import { isMockMapDataEnabled } from "@/lib/mock/nottingham";
import {
  createJsonWorkerProfile,
  getJsonWorkerByUserId,
  setJsonWorkerSkills,
} from "@/lib/mock/profiles-store";
import type { Skill } from "@/lib/db/types";

export const runtime = "nodejs";

function skillMap(catalog: Skill[]) {
  const map = new Map<string, Skill>();
  for (const skill of catalog) {
    map.set(skill.name.trim().toLowerCase(), skill);
  }
  return map;
}

async function locateRow(
  input: WorkerCsvInput,
  cache: Map<string, WorkerCsvInput>
): Promise<WorkerCsvInput> {
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
  const { error } = await requireAdmin();
  if (error) return error;

  return new NextResponse(buildWorkerCsvTemplate(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="workers-bulk-sample.csv"',
    },
  });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return jsonError("Upload a CSV file as `file`");
  }
  if (file.size > WORKER_CSV_MAX_BYTES) {
    return jsonError("CSV file is too large (max 2MB)");
  }

  const text = await file.text();
  const parsed = parseWorkerCsv(text);
  if (parsed.error) return jsonError(parsed.error);

  const mock = isMockMapDataEnabled();
  const catalog = mock ? [] : await listSkills();
  const skillsByName = skillMap(catalog);
  const geoCache = new Map<string, WorkerCsvInput>();

  const created: { line: number; id: number; headline: string | null }[] = [];
  const failed = [...parsed.errors];
  const warnings: { line: number; message: string }[] = [];

  for (const row of parsed.rows) {
    try {
      let userId: number | null = null;
      if (row.userEmail) {
        const user = await getUserByEmail(row.userEmail);
        if (!user) {
          failed.push({
            line: row.line,
            error: `No user account found for ${row.userEmail}`,
          });
          continue;
        }
        const existing = mock
          ? getJsonWorkerByUserId(user.id)
          : await getWorkerByUserId(user.id);
        if (existing) {
          failed.push({
            line: row.line,
            error: `${row.userEmail} already has a worker profile`,
          });
          continue;
        }
        userId = user.id;
      }

      const located = await locateRow(row.input, geoCache);
      const profile = mock
        ? createJsonWorkerProfile(userId, located)
        : await createWorkerProfile(userId, located);

      const unknown: string[] = [];
      const skills = row.skillNames.flatMap((name) => {
        const match = skillsByName.get(name.toLowerCase());
        if (!match) {
          unknown.push(name);
          return [];
        }
        return [{ skill_id: match.id }];
      });

      if (skills.length > 0) {
        if (mock) setJsonWorkerSkills(profile.id, skills);
        else await setWorkerSkills(profile.id, skills);
      }
      if (unknown.length > 0 && catalog.length > 0) {
        warnings.push({
          line: row.line,
          message: `Unknown skills skipped: ${unknown.join(", ")}`,
        });
      }

      created.push({
        line: row.line,
        id: profile.id,
        headline: profile.headline,
      });
    } catch (err) {
      failed.push({
        line: row.line,
        error: err instanceof Error ? err.message : "Failed to create worker",
      });
    }
  }

  return NextResponse.json({ created, failed, warnings });
}
