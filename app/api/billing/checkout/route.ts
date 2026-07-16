import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api/auth";
import {
  getUserById,
  setStripeCustomerId,
} from "@/lib/db/repositories/users";
import { getLatestSubscriptionForUser } from "@/lib/db/repositories/subscriptions";
import { appBaseUrl, getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { priceIdForTier, type PaidTier } from "@/lib/stripe/prices";

const schema = z.object({
  tier: z.enum(["basic", "advanced"]),
  locale: z.string().min(2).max(10).optional(),
});

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  if (!isStripeConfigured()) {
    return jsonError("Stripe is not configured", 503);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid tier");

  const tier = parsed.data.tier as PaidTier;
  const locale = parsed.data.locale ?? "en";
  const userId = Number(session.user.id);
  const user = await getUserById(userId);
  if (!user) return jsonError("User not found", 404);

  const existing = await getLatestSubscriptionForUser(userId);
  if (
    existing &&
    (existing.status === "active" || existing.status === "past_due")
  ) {
    return jsonError(
      "You already have a subscription. Use the billing portal to change plans.",
      409
    );
  }

  const stripe = getStripe();
  let customerId = user.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: String(user.id) },
    });
    customerId = customer.id;
    await setStripeCustomerId(user.id, customerId);
  }

  const base = appBaseUrl();
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceIdForTier(tier), quantity: 1 }],
    success_url: `${base}/${locale}/billing?success=1`,
    cancel_url: `${base}/${locale}/billing?canceled=1`,
    metadata: {
      userId: String(user.id),
      tier,
    },
    subscription_data: {
      metadata: {
        userId: String(user.id),
        tier,
      },
    },
  });

  if (!checkout.url) return jsonError("Failed to create checkout session", 500);
  return NextResponse.json({ url: checkout.url });
}
