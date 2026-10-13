import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { requireAdmin } from "@/lib/api/admin";
import { upsertDirectoryEmployer } from "@/lib/db/repositories/employers";
import {
  buildBusinessCsvTemplate,
  BUSINESS_CSV_MAX_BYTES,
  parseBusinessCsv,
  type BusinessCsvInput,
} from "@/lib/employers/csv";
import { ensureLocationCoords } from "@/lib/mock/ensure-location";
import { isMockMapDataEnabled } from "@/lib/mock/nottingham";
import { upsertJsonDirectoryEmployer } from "@/lib/mock/profiles-store";

export const runtime = "nodejs";

async function locateRow(
  input: BusinessCsvInput,
  cache: Map<string, BusinessCsvInput>
): Promise<BusinessCsvInput> {
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

  return new NextResponse(buildBusinessCsvTemplate(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="businesses-bulk-sample.csv"',
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
  if (file.size > BUSINESS_CSV_MAX_BYTES) {
    return jsonError("CSV file is too large (max 2MB)");
  }

  const text = await file.text();
  const parsed = parseBusinessCsv(text);
  if (parsed.error) return jsonError(parsed.error);

  const mock = isMockMapDataEnabled();
  const geoCache = new Map<string, BusinessCsvInput>();

  const created: { line: number; id: number; company_name: string }[] = [];
  const updated: { line: number; id: number; company_name: string }[] = [];
  const failed = [...parsed.errors];
  const warnings: { line: number; message: string }[] = [];

  for (const row of parsed.rows) {
    try {
      const located = await locateRow(row.input, geoCache);
      const saved = mock
        ? upsertJsonDirectoryEmployer(located)
        : await upsertDirectoryEmployer(located);

      if (
        located.location_lat == null ||
        located.location_lng == null ||
        !Number.isFinite(located.location_lat) ||
        !Number.isFinite(located.location_lng)
      ) {
        warnings.push({
          line: row.line,
          message:
            "No coordinates, so this business will not appear on the map",
        });
      }

      const record = {
        line: row.line,
        id: saved.profile.id,
        company_name: saved.profile.company_name ?? located.company_name,
      };
      if (saved.created) created.push(record);
      else updated.push(record);
    } catch (err) {
      failed.push({
        line: row.line,
        error: err instanceof Error ? err.message : "Failed to save business",
      });
    }
  }

  return NextResponse.json({ created, updated, failed, warnings });
}
