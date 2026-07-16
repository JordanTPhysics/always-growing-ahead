import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api/auth";
import { canViewContactInfo } from "@/lib/entitlements";
import { logContact } from "@/lib/db/repositories/contacts";
import { getJobById } from "@/lib/db/repositories/jobs";
import { getEmployerById } from "@/lib/db/repositories/employers";
import {
  getWorkerById,
  getWorkerByUserId,
} from "@/lib/db/repositories/workers";
import { getUserById } from "@/lib/db/repositories/users";
import { createNotification } from "@/lib/db/repositories/notifications";
import { dispatchPushToUser } from "@/lib/notifications/push-dispatch";
import {
  getMockJobById,
  getMockWorkerById,
  isMockMapDataEnabled,
} from "@/lib/mock/nottingham";
import { getJsonJobById } from "@/lib/mock/jobs-store";
import {
  getJsonEmployerById,
  getJsonWorkerById,
  getJsonWorkerByUserId,
} from "@/lib/mock/profiles-store";
import { getMockUserById } from "@/lib/mock/test-accounts";

const schema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("job"),
    jobId: z.number().int().positive(),
  }),
  z.object({
    target: z.literal("worker"),
    workerId: z.number().int().positive(),
    jobId: z.number().int().positive().optional().nullable(),
  }),
]);

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  if (!session.user.isEmailVerified) {
    return jsonError("Verify your email before viewing contact info", 403);
  }

  if (!canViewContactInfo(session.user.tier)) {
    return jsonError("Basic subscription required to view contact info", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const viewerId = Number(session.user.id);
  const mock = isMockMapDataEnabled();

  if (parsed.data.target === "job") {
    return revealJobContact(parsed.data.jobId, viewerId, mock);
  }

  return revealWorkerContact(
    parsed.data.workerId,
    viewerId,
    parsed.data.jobId ?? null,
    mock
  );
}

async function revealJobContact(
  jobId: number,
  viewerId: number,
  mock: boolean
) {
  if (mock) {
    const job =
      getJsonJobById(jobId)?.job ?? getMockJobById(jobId) ?? null;
    if (!job || job.status !== "active") {
      return jsonError("Job not found", 404);
    }

    const viewerWorker = getJsonWorkerByUserId(viewerId);
    if (!viewerWorker) {
      return jsonError("Create a worker profile before contacting employers", 400);
    }

    const employer = getJsonEmployerById(job.employer_id);
    const account = getMockUserById(employer?.user_id ?? 1);

    return NextResponse.json({
      email:
        employer?.contact_email ??
        account?.email ??
        "contact@example.com",
      phone: employer?.contact_phone ?? account?.phone ?? null,
      linkedinUrl: employer?.linkedin_url ?? null,
      companyName: employer?.company_name ?? job.company_name ?? null,
    });
  }

  const job = await getJobById(jobId);
  if (!job || job.status !== "active") {
    return jsonError("Job not found", 404);
  }

  const viewerWorker = await getWorkerByUserId(viewerId);
  if (!viewerWorker) {
    return jsonError("Create a worker profile before contacting employers", 400);
  }

  const employer = await getEmployerById(job.employer_id);
  if (!employer) return jsonError("Employer not found", 404);

  const contactUser = await getUserById(employer.user_id);
  if (!contactUser) return jsonError("Contact not found", 404);

  await logContact({
    job_id: job.id,
    worker_id: viewerWorker.id,
    initiated_by: "worker",
  });
  await createNotification({
    userId: employer.user_id,
    type: "contact_reveal",
    title: "Your job contact was revealed",
    body: "A worker has revealed the contact details for your job.",
    linkUrl: `/jobs/${job.id}`,
  });
  void dispatchPushToUser(employer.user_id, {
    title: "Your job contact was revealed",
    body: "A worker has revealed the contact details for your job.",
    linkUrl: `/jobs/${job.id}`,
  });

  return NextResponse.json({
    email: employer.contact_email ?? contactUser.email,
    phone: employer.contact_phone ?? contactUser.phone,
    linkedinUrl: employer.linkedin_url ?? null,
    companyName: employer.company_name,
  });
}

async function revealWorkerContact(
  workerId: number,
  viewerId: number,
  jobId: number | null,
  mock: boolean
) {
  if (mock) {
    const row = getJsonWorkerById(workerId);
    const mockWorker = row?.profile ?? getMockWorkerById(workerId);
    if (!mockWorker || mockWorker.visibility !== "public") {
      return jsonError("Worker not found", 404);
    }
    if (mockWorker.user_id === viewerId) {
      return jsonError("Cannot reveal your own contact info this way", 400);
    }

    const account = getMockUserById(mockWorker.user_id);
    return NextResponse.json({
      email:
        mockWorker.contact_email ??
        account?.email ??
        `worker-${mockWorker.id}@aga.test`,
      phone: mockWorker.contact_phone ?? account?.phone ?? null,
      linkedinUrl: mockWorker.linkedin_url ?? null,
    });
  }

  const worker = await getWorkerById(workerId);
  if (!worker || worker.visibility !== "public") {
    return jsonError("Worker not found", 404);
  }

  if (worker.user_id === viewerId) {
    return jsonError("Cannot reveal your own contact info this way", 400);
  }

  const contactUser = await getUserById(worker.user_id);
  if (!contactUser) return jsonError("Contact not found", 404);

  if (jobId != null) {
    const job = await getJobById(jobId);
    if (!job) return jsonError("Job not found", 404);
    const employer = await getEmployerById(job.employer_id);
    if (!employer || employer.user_id !== viewerId) {
      return jsonError("Job not found", 404);
    }
  }

  await logContact({
    job_id: jobId,
    worker_id: worker.id,
    initiated_by: "employer",
  });
  await createNotification({
    userId: worker.user_id,
    type: "contact_reveal",
    title: "Your contact details were revealed",
    body: "An employer has revealed your contact details.",
    linkUrl: `/workers/${worker.id}`,
  });
  void dispatchPushToUser(worker.user_id, {
    title: "Your contact details were revealed",
    body: "An employer has revealed your contact details.",
    linkUrl: `/workers/${worker.id}`,
  });

  return NextResponse.json({
    email: worker.contact_email ?? contactUser.email,
    phone: worker.contact_phone ?? contactUser.phone,
    linkedinUrl: worker.linkedin_url ?? null,
  });
}
