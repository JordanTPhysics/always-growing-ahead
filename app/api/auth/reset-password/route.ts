import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api/auth";
import { resetPasswordWithToken } from "@/lib/auth/password-reset";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid input");

  const result = await resetPasswordWithToken({
    token: parsed.data.token,
    password: parsed.data.password,
  });

  if (!result.ok) {
    return jsonError(
      result.reason === "expired" ? "expired" : "invalid",
      400
    );
  }

  return NextResponse.json({ ok: true });
}
