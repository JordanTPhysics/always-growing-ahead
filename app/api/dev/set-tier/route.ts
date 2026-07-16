import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api/auth";
import { updateUserTier } from "@/lib/db/repositories/users";
import type { Tier } from "@/lib/entitlements";

const schema = z.object({
  tier: z.enum(["none", "basic", "advanced"]),
});

/** Local/dev helper until Stripe (Phase 3). Disabled in production. */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return jsonError("Not available", 404);
  }

  const { session, error } = await requireSession();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid tier");

  await updateUserTier(Number(session.user.id), parsed.data.tier as Tier);
  return NextResponse.json({ ok: true, tier: parsed.data.tier });
}
