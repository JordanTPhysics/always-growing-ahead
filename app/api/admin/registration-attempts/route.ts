import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/auth";
import {
  listRegistrationAttempts,
  updateRegistrationAttemptStatus,
} from "@/lib/db/repositories/registration-attempts";
import type { RegistrationAttemptStatus } from "@/lib/db/types";

const statuses = ["new", "contacted", "resolved"] as const;

const updateSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(statuses),
});

function parseStatus(value: string | null): RegistrationAttemptStatus | null {
  if (!value) return null;
  return statuses.includes(value as RegistrationAttemptStatus)
    ? (value as RegistrationAttemptStatus)
    : null;
}

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const requested = new URL(request.url).searchParams.get("status");
  const status = parseStatus(requested);
  if (requested && !status) return jsonError("Invalid status");

  const attempts = await listRegistrationAttempts(status);
  return NextResponse.json({ attempts });
}

export async function PATCH(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid registration attempt");

  const attempt = await updateRegistrationAttemptStatus(
    parsed.data.id,
    parsed.data.status
  );
  if (!attempt) return jsonError("Registration attempt not found", 404);
  return NextResponse.json({ attempt });
}
