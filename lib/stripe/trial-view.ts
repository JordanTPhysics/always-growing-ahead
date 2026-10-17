import type { BillingPeriod } from "@/lib/stripe/billing-period";
import type { PaidTier } from "@/lib/stripe/prices";

export type TrialView = {
  status: "active" | "cancelled";
  tier: PaidTier;
  period: BillingPeriod;
  endsAt: string;
};
