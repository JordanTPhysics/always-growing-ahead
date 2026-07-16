import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api/auth";
import {
  createEmployerProfile,
  getEmployerById,
  getEmployerByUserId,
  updateEmployerProfile,
} from "@/lib/db/repositories/employers";
import { isMockMapDataEnabled } from "@/lib/mock/nottingham";
import {
  createJsonEmployerProfile,
  getJsonEmployerById,
  getJsonEmployerByUserId,
  updateJsonEmployerProfile,
} from "@/lib/mock/profiles-store";
import { stripProfileContact } from "@/lib/profiles/contact";

const schema = z.object({
  company_name: z.string().max(255).optional().nullable(),
  company_description: z.string().optional().nullable(),
  logo_url: z.string().max(500).optional().nullable(),
  website_url: z.string().max(500).optional().nullable(),
  contact_email: z.string().max(255).optional().nullable(),
  contact_phone: z.string().max(30).optional().nullable(),
  linkedin_url: z.string().max(500).optional().nullable(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const mine = searchParams.get("mine");
  const mock = isMockMapDataEnabled();

  if (mine === "1") {
    const { session, error } = await requireSession();
    if (error) return error;
    const userId = Number(session.user.id);
    const profile = mock
      ? getJsonEmployerByUserId(userId)
      : await getEmployerByUserId(userId);
    return NextResponse.json({ profile });
  }

  if (id) {
    const profile = mock
      ? getJsonEmployerById(Number(id))
      : await getEmployerById(Number(id));
    if (!profile) return jsonError("Employer not found", 404);
    return NextResponse.json({ profile: stripProfileContact(profile) });
  }

  return jsonError("Specify id or mine=1");
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const userId = Number(session.user.id);
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid input");

  if (isMockMapDataEnabled()) {
    if (getJsonEmployerByUserId(userId)) {
      return jsonError("Employer profile already exists", 409);
    }
    const profile = createJsonEmployerProfile(userId, parsed.data);
    return NextResponse.json({ profile }, { status: 201 });
  }

  const existing = await getEmployerByUserId(userId);
  if (existing) return jsonError("Employer profile already exists", 409);

  const profile = await createEmployerProfile(userId, parsed.data);
  return NextResponse.json({ profile }, { status: 201 });
}

export async function PUT(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const userId = Number(session.user.id);
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid input");

  if (isMockMapDataEnabled()) {
    const existing = getJsonEmployerByUserId(userId);
    if (!existing) return jsonError("Employer profile not found", 404);
    const profile = updateJsonEmployerProfile(existing.id, parsed.data);
    return NextResponse.json({ profile });
  }

  const existing = await getEmployerByUserId(userId);
  if (!existing) return jsonError("Employer profile not found", 404);

  const profile = await updateEmployerProfile(existing.id, parsed.data);
  return NextResponse.json({ profile });
}
