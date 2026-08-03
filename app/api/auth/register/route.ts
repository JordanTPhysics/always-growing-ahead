import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  createUser,
  getUserByEmail,
  getUserByUsername,
} from "@/lib/db/repositories/users";
import { jsonError } from "@/lib/api/auth";
import { isValidCity, isValidDistrict } from "@/lib/locations/uk-locations";

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
  phone: z.string().trim().min(7).max(30),
  city: z.string().trim().min(1),
  district: z.string().trim().min(1),
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
  if (!isValidCity(city)) {
    return jsonError("Please select a valid city");
  }
  if (!isValidDistrict(city, district)) {
    return jsonError("Please select a valid district for the chosen city");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  // Phase 1: mark verified so contact/posting flows can be exercised before email provider lands.
  const user = await createUser({
    email,
    passwordHash,
    username,
    phone: parsed.data.phone.trim(),
    city,
    district,
    preferredLocale: parsed.data.preferredLocale ?? "en",
    emailVerifiedAt: new Date(),
  });

  return NextResponse.json({
    id: user.id,
    email: user.email,
  });
}
