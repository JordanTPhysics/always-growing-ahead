import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api/auth";
import { getUserById } from "@/lib/db/repositories/users";
import { appBaseUrl, getStripe, isStripeConfigured } from "@/lib/stripe/client";

const schema = z.object({
  locale: z.string().min(2).max(10).optional(),
});

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  if (!isStripeConfigured()) {
    return jsonError("Stripe is not configured", 503);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) return jsonError("Invalid input");

  const user = await getUserById(Number(session.user.id));
  if (!user) return jsonError("User not found", 404);
  if (!user.stripe_customer_id) {
    return jsonError("No billing account yet. Subscribe to a plan first.", 400);
  }

  const locale = parsed.data.locale ?? "en";
  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${appBaseUrl()}/${locale}/billing`,
  });

  return NextResponse.json({ url: portal.url });
}
