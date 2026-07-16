import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createUser, getUserByEmail } from "@/lib/db/repositories/users";
import { jsonError } from "@/lib/api/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().max(30).optional().nullable(),
  preferredLocale: z.string().max(10).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await getUserByEmail(email);
  if (existing) {
    return jsonError("Email already registered", 409);
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  // Phase 1: mark verified so contact/posting flows can be exercised before email provider lands.
  const user = await createUser({
    email,
    passwordHash,
    preferredLocale: parsed.data.preferredLocale ?? "en",
    emailVerifiedAt: new Date(),
  });

  if (parsed.data.phone) {
    const { updateUserPhone } = await import("@/lib/db/repositories/users");
    await updateUserPhone(user.id, parsed.data.phone);
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
  });
}
