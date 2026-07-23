import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api/auth";
import { canPostJobs, type Tier } from "@/lib/entitlements";
import { getEmployerByUserId } from "@/lib/db/repositories/employers";
import {
  createJob,
  getJobById,
  listActiveJobs,
  listJobSkills,
  listJobsByEmployer,
  searchJobs,
  setJobSkills,
  updateJob,
} from "@/lib/db/repositories/jobs";
import type { JobType } from "@/lib/db/types";
import {
  createJsonJob,
  getJsonJobById,
  listJsonJobsByEmployer,
  setJsonJobSkills,
  updateJsonJob,
} from "@/lib/mock/jobs-store";
import { ensureLocationCoords } from "@/lib/mock/ensure-location";
import {
  isMockMapDataEnabled,
  searchMockJobs,
} from "@/lib/mock/nottingham";
import { getJsonEmployerByUserId } from "@/lib/mock/profiles-store";

const jobTypes = z.enum([
  "full-time",
  "part-time",
  "contract",
  "temporary",
  "apprenticeship",
]);

const jobSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  job_type: jobTypes.optional().nullable(),
  location_lat: z.number().min(-90).max(90).optional().nullable(),
  location_lng: z.number().min(-180).max(180).optional().nullable(),
  postcode: z.string().max(10).optional().nullable(),
  address_text: z.string().max(255).optional().nullable(),
  salary_min: z.number().int().optional().nullable(),
  salary_max: z.number().int().optional().nullable(),
  salary_type: z.enum(["hourly", "daily", "annual"]).optional().nullable(),
  requirements: z.string().optional().nullable(),
  status: z.enum(["draft", "active", "closed", "expired"]).optional(),
  expires_at: z.string().optional().nullable(),
  skills: z
    .array(
      z.object({
        skill_id: z.number().int().positive(),
        required: z.boolean().optional(),
      })
    )
    .optional(),
});

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const mine = searchParams.get("mine");
  const mock = isMockMapDataEnabled();

  if (id) {
    if (mock) {
      const row = getJsonJobById(Number(id));
      if (!row) return jsonError("Job not found", 404);
      return NextResponse.json({ job: row.job, skills: row.skills });
    }
    const job = await getJobById(Number(id));
    if (!job) return jsonError("Job not found", 404);
    const skills = await listJobSkills(job.id);
    return NextResponse.json({ job, skills });
  }

  if (mine === "1") {
    const { session, error } = await requireSession();
    if (error) return error;
    const userId = Number(session.user.id);
    if (mock) {
      const employer = getJsonEmployerByUserId(userId);
      if (!employer) return NextResponse.json({ jobs: [] });
      return NextResponse.json({
        jobs: listJsonJobsByEmployer(employer.id),
      });
    }
    const employer = await getEmployerByUserId(userId);
    if (!employer) return NextResponse.json({ jobs: [] });
    const jobs = await listJobsByEmployer(employer.id);
    return NextResponse.json({ jobs });
  }

  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius");
  const jobType = searchParams.get("jobType");
  const salaryMin = searchParams.get("salaryMin");
  const salaryMax = searchParams.get("salaryMax");
  const postedWithinDays = searchParams.get("postedWithinDays");
  const skillIds = searchParams.get("skillIds");
  const field = searchParams.get("field");
  const hasSearch =
    lat ||
    lng ||
    radius ||
    field ||
    jobType ||
    salaryMin ||
    salaryMax ||
    postedWithinDays ||
    skillIds;

  if (hasSearch) {
    if (mock) {
      const jobs = await searchMockJobs({
        lat: lat != null ? Number(lat) : undefined,
        lng: lng != null ? Number(lng) : undefined,
        radiusMeters:
          radius === "nationwide" || radius == null
            ? null
            : Number(radius),
        field: field?.trim() || undefined,
        jobType: (jobType as JobType | null) || undefined,
        salaryMin: salaryMin != null ? Number(salaryMin) : undefined,
        salaryMax: salaryMax != null ? Number(salaryMax) : undefined,
        postedWithinDays:
          postedWithinDays != null ? Number(postedWithinDays) : undefined,
      });
      return NextResponse.json({ jobs });
    }

    const jobs = await searchJobs({
      lat: lat != null ? Number(lat) : undefined,
      lng: lng != null ? Number(lng) : undefined,
      radiusMeters:
        radius === "nationwide" || radius == null
          ? null
          : Number(radius),
      field: field?.trim() || undefined,
      jobType: (jobType as JobType | null) || undefined,
      salaryMin: salaryMin != null ? Number(salaryMin) : undefined,
      salaryMax: salaryMax != null ? Number(salaryMax) : undefined,
      postedWithinDays:
        postedWithinDays != null ? Number(postedWithinDays) : undefined,
      skillIds: skillIds
        ? skillIds
            .split(",")
            .map((sid) => Number(sid))
            .filter((sid) => Number.isFinite(sid) && sid > 0)
        : undefined,
    });
    return NextResponse.json({ jobs });
  }

  if (mock) {
    return NextResponse.json({ jobs: await searchMockJobs({}) });
  }

  const jobs = await listActiveJobs();
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const denied = assertCanPostJobs(session);
  if (denied) return denied;

  const userId = Number(session.user.id);
  const body = await request.json().catch(() => null);
  const parsed = jobSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { skills, ...jobInput } = parsed.data;

  if (isMockMapDataEnabled()) {
    const employer = getJsonEmployerByUserId(userId);
    if (!employer) {
      return jsonError("Create an employer profile first", 400);
    }
    const located = await ensureLocationCoords(jobInput);
    const job = createJsonJob(employer.id, located);
    if (skills) setJsonJobSkills(job.id, skills);
    return NextResponse.json({ job }, { status: 201 });
  }

  const employer = await getEmployerByUserId(userId);
  if (!employer) {
    return jsonError("Create an employer profile first", 400);
  }

  const job = await createJob(employer.id, jobInput);
  if (skills) await setJobSkills(job.id, skills);

  return NextResponse.json({ job }, { status: 201 });
}

export async function PUT(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const denied = assertCanPostJobs(session);
  if (denied) return denied;

  const userId = Number(session.user.id);
  const body = await request.json().catch(() => null);
  const parsed = jobSchema
    .extend({ id: z.number().int().positive() })
    .safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { skills, id, ...jobInput } = parsed.data;

  if (isMockMapDataEnabled()) {
    const employer = getJsonEmployerByUserId(userId);
    if (!employer) return jsonError("Employer profile not found", 404);
    const existing = getJsonJobById(id);
    if (!existing || existing.job.employer_id !== employer.id) {
      return jsonError("Job not found", 404);
    }
    const located = await ensureLocationCoords({
      ...existing.job,
      ...jobInput,
    });
    const job = updateJsonJob(id, located);
    if (skills) setJsonJobSkills(job.id, skills);
    return NextResponse.json({ job });
  }

  const employer = await getEmployerByUserId(userId);
  if (!employer) return jsonError("Employer profile not found", 404);

  const existing = await getJobById(id);
  if (!existing || existing.employer_id !== employer.id) {
    return jsonError("Job not found", 404);
  }

  const job = await updateJob(id, jobInput);
  if (skills) await setJobSkills(job.id, skills);

  return NextResponse.json({ job });
}
