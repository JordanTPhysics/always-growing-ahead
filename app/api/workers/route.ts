import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api/auth";
import { canCreateWorkerProfile } from "@/lib/entitlements";
import {
  createWorkerProfile,
  getPublicWorkerBundle,
  getWorkerByUserId,
  listWorkerExperience,
  listWorkerQualifications,
  listWorkerSkills,
  replaceWorkerExperience,
  replaceWorkerQualifications,
  searchPublicWorkers,
  setWorkerSkills,
  updateWorkerProfile,
} from "@/lib/db/repositories/workers";
import type { Availability, JobType } from "@/lib/db/types";
import {
  isMockMapDataEnabled,
  searchMockWorkers,
} from "@/lib/mock/nottingham";
import {
  createJsonWorkerProfile,
  getJsonWorkerById,
  getJsonWorkerByUserId,
  replaceJsonWorkerExperience,
  replaceJsonWorkerQualifications,
  setJsonWorkerSkills,
  updateJsonWorkerProfile,
} from "@/lib/mock/profiles-store";
import { ensureLocationCoords } from "@/lib/mock/ensure-location";
import { stripProfileContact } from "@/lib/profiles/contact";

const jobTypes = z.enum([
  "full-time",
  "part-time",
  "contract",
  "temporary",
  "apprenticeship",
]);

const profileSchema = z.object({
  headline: z.string().max(255).optional().nullable(),
  bio: z.string().optional().nullable(),
  profile_photo_url: z.string().max(500).optional().nullable(),
  cv_file_url: z.string().max(500).optional().nullable(),
  location_lat: z.number().min(-90).max(90).optional().nullable(),
  location_lng: z.number().min(-180).max(180).optional().nullable(),
  postcode: z.string().max(10).optional().nullable(),
  address_text: z.string().max(255).optional().nullable(),
  desired_job_types: z.array(jobTypes).optional().nullable(),
  desired_salary_min: z.number().int().optional().nullable(),
  desired_salary_max: z.number().int().optional().nullable(),
  availability: z
    .enum(["immediate", "2_weeks", "1_month", "not_looking"])
    .optional()
    .nullable(),
  visibility: z.enum(["public", "hidden"]).optional(),
  contact_email: z.string().max(255).optional().nullable(),
  contact_phone: z.string().max(30).optional().nullable(),
  linkedin_url: z.string().max(500).optional().nullable(),
  skills: z
    .array(
      z.object({
        skill_id: z.number().int().positive(),
        proficiency: z
          .enum(["beginner", "intermediate", "advanced", "expert"])
          .optional()
          .nullable(),
      })
    )
    .optional(),
  experience: z
    .array(
      z.object({
        job_title: z.string().max(255).nullable().default(null),
        employer_name: z.string().max(255).nullable().default(null),
        start_date: z.string().nullable().default(null),
        end_date: z.string().nullable().default(null),
        description: z.string().nullable().default(null),
      })
    )
    .optional(),
  qualifications: z
    .array(
      z.object({
        qualification_name: z.string().max(255).nullable().default(null),
        institution: z.string().max(255).nullable().default(null),
        year_awarded: z
          .number()
          .int()
          .min(1950)
          .max(2100)
          .nullable()
          .default(null),
        certificate_file_url: z.string().max(500).nullable().default(null),
      })
    )
    .optional(),
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

    if (mock) {
      const row = getJsonWorkerByUserId(userId);
      if (!row) return NextResponse.json({ profile: null });
      return NextResponse.json({
        profile: row.profile,
        skills: row.skills,
        experience: row.experience,
        qualifications: row.qualifications,
      });
    }

    const profile = await getWorkerByUserId(userId);
    if (!profile) return NextResponse.json({ profile: null });
    const [skills, experience, qualifications] = await Promise.all([
      listWorkerSkills(profile.id),
      listWorkerExperience(profile.id),
      listWorkerQualifications(profile.id),
    ]);
    return NextResponse.json({ profile, skills, experience, qualifications });
  }

  if (id) {
    if (mock) {
      const row = getJsonWorkerById(Number(id));
      if (!row || row.profile.visibility !== "public") {
        return jsonError("Worker not found", 404);
      }
      return NextResponse.json({
        profile: stripProfileContact(row.profile),
        skills: row.skills,
        experience: row.experience,
        qualifications: row.qualifications,
      });
    }

    const bundle = await getPublicWorkerBundle(Number(id));
    if (!bundle) return jsonError("Worker not found", 404);
    return NextResponse.json(bundle);
  }

  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius");
  const jobType = searchParams.get("jobType");
  const availability = searchParams.get("availability");
  const skillIds = searchParams.get("skillIds");
  const field = searchParams.get("field");
  const search = searchParams.get("search");

  if (
    search === "1" ||
    lat ||
    lng ||
    radius ||
    field ||
    jobType ||
    availability ||
    skillIds
  ) {
    if (mock) {
      const workers = await searchMockWorkers({
        lat: lat != null ? Number(lat) : undefined,
        lng: lng != null ? Number(lng) : undefined,
        radiusMeters:
          radius === "nationwide" || radius == null
            ? null
            : Number(radius),
        field: field?.trim() || undefined,
        jobType: (jobType as JobType | null) || undefined,
        availability: (availability as Availability | null) || undefined,
      });
      return NextResponse.json({ workers });
    }

    const workers = await searchPublicWorkers({
      lat: lat != null ? Number(lat) : undefined,
      lng: lng != null ? Number(lng) : undefined,
      radiusMeters:
        radius === "nationwide" || radius == null
          ? null
          : Number(radius),
      field: field?.trim() || undefined,
      jobType: (jobType as JobType | null) || undefined,
      availability: (availability as Availability | null) || undefined,
      skillIds: skillIds
        ? skillIds
            .split(",")
            .map((sid) => Number(sid))
            .filter((sid) => Number.isFinite(sid) && sid > 0)
        : undefined,
    });
    return NextResponse.json({ workers });
  }

  return jsonError("Specify id, mine=1, or search=1");
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  if (!canCreateWorkerProfile(session.user.tier)) {
    return jsonError("Basic subscription required to create a worker profile", 403);
  }

  const userId = Number(session.user.id);
  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");

  const { skills, experience, qualifications, ...profileInput } = parsed.data;

  if (isMockMapDataEnabled()) {
    if (getJsonWorkerByUserId(userId)) {
      return jsonError("Worker profile already exists", 409);
    }
    const located = await ensureLocationCoords(profileInput);
    const profile = createJsonWorkerProfile(userId, located);
    if (skills) setJsonWorkerSkills(profile.id, skills);
    if (experience) replaceJsonWorkerExperience(profile.id, experience);
    if (qualifications) {
      replaceJsonWorkerQualifications(profile.id, qualifications);
    }
    return NextResponse.json({ profile }, { status: 201 });
  }

  const existing = await getWorkerByUserId(userId);
  if (existing) return jsonError("Worker profile already exists", 409);

  const profile = await createWorkerProfile(userId, profileInput);

  if (skills) await setWorkerSkills(profile.id, skills);
  if (experience) await replaceWorkerExperience(profile.id, experience);
  if (qualifications) await replaceWorkerQualifications(profile.id, qualifications);

  return NextResponse.json({ profile }, { status: 201 });
}

export async function PUT(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  if (!canCreateWorkerProfile(session.user.tier)) {
    return jsonError("Basic subscription required to edit a worker profile", 403);
  }

  const userId = Number(session.user.id);
  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");

  const { skills, experience, qualifications, ...profileInput } = parsed.data;

  if (isMockMapDataEnabled()) {
    const existing = getJsonWorkerByUserId(userId);
    if (!existing) return jsonError("Worker profile not found", 404);
    const located = await ensureLocationCoords({
      ...existing.profile,
      ...profileInput,
    });
    const profile = updateJsonWorkerProfile(existing.profile.id, located);
    if (skills) setJsonWorkerSkills(profile.id, skills);
    if (experience) replaceJsonWorkerExperience(profile.id, experience);
    if (qualifications) {
      replaceJsonWorkerQualifications(profile.id, qualifications);
    }
    return NextResponse.json({ profile });
  }

  const existing = await getWorkerByUserId(userId);
  if (!existing) return jsonError("Worker profile not found", 404);

  const profile = await updateWorkerProfile(existing.id, profileInput);

  if (skills) await setWorkerSkills(profile.id, skills);
  if (experience) await replaceWorkerExperience(profile.id, experience);
  if (qualifications) await replaceWorkerQualifications(profile.id, qualifications);

  return NextResponse.json({ profile });
}
