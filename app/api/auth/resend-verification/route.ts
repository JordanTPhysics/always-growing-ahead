import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api/auth";
import { resendVerificationEmail } from "@/lib/auth/email-verification";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid email");

  try {
    await resendVerificationEmail(parsed.data.email.trim().toLowerCase());
  } catch (err) {
    console.error("Failed to resend verification email", err);
    return jsonError("Could not send verification email");
  }

  return NextResponse.json({ ok: true });
}
