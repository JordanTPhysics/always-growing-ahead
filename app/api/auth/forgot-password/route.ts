import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api/auth";
import { sendPasswordResetEmail } from "@/lib/auth/password-reset";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid email");

  try {
    await sendPasswordResetEmail(parsed.data.email.trim().toLowerCase());
  } catch (err) {
    console.error("Failed to send password reset email", err);
    return jsonError("Could not send reset email");
  }

  return NextResponse.json({ ok: true });
}
