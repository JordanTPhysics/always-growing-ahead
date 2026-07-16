import type { Tier } from "@/lib/entitlements";

export type PaidTier = Exclude<Tier, "none">;

export function priceIdForTier(tier: PaidTier): string {
  const priceId =
    tier === "basic"
      ? process.env.STRIPE_PRICE_ID_BASIC
      : process.env.STRIPE_PRICE_ID_ADVANCED;
  if (!priceId) {
    throw new Error(`Missing Stripe price id for tier: ${tier}`);
  }
  return priceId;
}

export function tierFromPriceId(priceId: string): PaidTier | null {
  if (priceId === process.env.STRIPE_PRICE_ID_BASIC) return "basic";
  if (priceId === process.env.STRIPE_PRICE_ID_ADVANCED) return "advanced";
  return null;
}
