import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  createUser,
  getUserByEmail,
  getUserByUsername,
} from "@/lib/db/repositories/users";
import { sendVerificationEmail } from "@/lib/auth/email-verification";
import { jsonError } from "@/lib/api/auth";
import { normalizeUkPostcode } from "@/lib/validation/fields";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Username may only contain letters, numbers, and underscores"
  );

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: usernameSchema.optional().nullable(),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null))
    .refine(
      (value) =>
        value === null ||
        (value.length >= 7 &&
          /^[+]?[\d\s().-]+$/.test(value) &&
          value.replace(/\D/g, "").length >= 7),
      { message: "Enter a valid phone number" }
    ),
  city: z.string().trim().min(1).max(100),
  district: z.string().trim().min(1).max(100),
  postcode: z.string().trim().min(1).max(10),
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

  const username = parsed.data.username?.trim().toLowerCase() ?? null;
  if (username) {
    const taken = await getUserByUsername(username);
    if (taken) {
      return jsonError("Username already taken", 409);
    }
  }

  const city = parsed.data.city.trim();
  const district = parsed.data.district.trim();
  const postcode = normalizeUkPostcode(parsed.data.postcode);
  if (!postcode) {
    return jsonError("Enter a valid UK postcode");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await createUser({
    email,
    passwordHash,
    username,
    phone: parsed.data.phone,
    city,
    district,
    postcode,
    preferredLocale: parsed.data.preferredLocale ?? "en",
  });

  try {
    await sendVerificationEmail({
      userId: user.id,
      email: user.email,
      locale: parsed.data.preferredLocale ?? "en",
    });
  } catch (err) {
    console.error("Failed to send verification email", err);
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    verificationRequired: true,
  });
}
