import type { Tier } from "@/lib/entitlements";
import type { BillingPeriod } from "@/lib/stripe/billing-period";

export type PaidTier = Exclude<Tier, "none">;
export type { BillingPeriod };

export function priceIdForTier(
  tier: PaidTier,
  period: BillingPeriod = "yearly"
): string {
  const priceId =
    tier === "basic"
      ? period === "monthly"
        ? process.env.STRIPE_PRICE_ID_BASIC_MONTHLY
        : process.env.STRIPE_PRICE_ID_BASIC
      : period === "monthly"
        ? process.env.STRIPE_PRICE_ID_ADVANCED_MONTHLY
        : process.env.STRIPE_PRICE_ID_ADVANCED;
  if (!priceId) {
    throw new Error(`Missing Stripe price id for ${tier} ${period}`);
  }
  return priceId;
}

export function tierFromPriceId(priceId: string): PaidTier | null {
  if (
    priceId === process.env.STRIPE_PRICE_ID_BASIC ||
    priceId === process.env.STRIPE_PRICE_ID_BASIC_MONTHLY
  ) {
    return "basic";
  }
  if (
    priceId === process.env.STRIPE_PRICE_ID_ADVANCED ||
    priceId === process.env.STRIPE_PRICE_ID_ADVANCED_MONTHLY
  ) {
    return "advanced";
  }
  return null;
}
