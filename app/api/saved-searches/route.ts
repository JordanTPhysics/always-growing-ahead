import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api/auth";
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearchesForUser,
} from "@/lib/db/repositories/saved-searches";

const kindSchema = z.enum(["jobs", "workers"]);
const createSchema = z.object({
  kind: kindSchema,
  name: z.string().trim().min(1).max(100),
  filters: z.record(z.string(), z.unknown()),
});

export async function GET(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const kind = kindSchema.safeParse(new URL(request.url).searchParams.get("kind"));
  if (!kind.success && new URL(request.url).searchParams.has("kind")) {
    return jsonError("Invalid search kind");
  }

  const savedSearches = await listSavedSearchesForUser(
    Number(session.user.id),
    kind.success ? kind.data : undefined
  );
  return NextResponse.json({ savedSearches });
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid saved search");

  const savedSearch = await createSavedSearch({
    userId: Number(session.user.id),
    ...parsed.data,
  });
  return NextResponse.json({ savedSearch }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) return jsonError("Invalid saved search");

  await deleteSavedSearch(id, Number(session.user.id));
  return NextResponse.json({ ok: true });
}
