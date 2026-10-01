import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api/auth";
import { isRemoteDatabaseConfigured } from "@/lib/db/config";
import { createRegistrationAttempt } from "@/lib/db/repositories/registration-attempts";

const schema = z
  .object({
    name: z.string().trim().max(100).nullable().optional(),
    email: z.string().trim().max(255).nullable().optional(),
    phone: z.string().trim().max(100).nullable().optional(),
    city: z.string().trim().max(100).nullable().optional(),
    district: z.string().trim().max(100).nullable().optional(),
    error: z.string().trim().min(1).max(2000),
    locale: z.string().trim().max(10).optional(),
  })
  .refine((value) => Boolean(value.name?.trim() || value.email?.trim() || value.phone?.trim()), {
    message: "Contact information is required",
  });

export async function POST(request: Request) {
  if (!isRemoteDatabaseConfigured()) {
    return jsonError("Registration attempts are unavailable", 503);
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid registration attempt");

  const attempt = await createRegistrationAttempt({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    city: parsed.data.city,
    district: parsed.data.district,
    errorMessage: parsed.data.error,
    locale: parsed.data.locale,
  });

  return NextResponse.json({ id: attempt.id }, { status: 201 });
}
