import Stripe from "stripe";
import { appBaseUrl } from "@/lib/app-url";

export { appBaseUrl };

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!stripe) {
    stripe = new Stripe(key, {
      apiVersion: "2026-06-24.dahlia",
      typescript: true,
    });
  }
  return stripe;
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_ID_BASIC &&
      process.env.STRIPE_PRICE_ID_ADVANCED &&
      process.env.STRIPE_PRICE_ID_BASIC_MONTHLY &&
      process.env.STRIPE_PRICE_ID_ADVANCED_MONTHLY
  );
}
