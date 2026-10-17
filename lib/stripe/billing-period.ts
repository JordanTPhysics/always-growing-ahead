export type BillingPeriod = "monthly" | "yearly";

export type PlanPrices = {
  monthly: number;
  yearly: number;
};

export const GBP_BY_PAID_TIER = {
  basic: { monthly: 1.99, yearly: 19.99 },
  advanced: { monthly: 6.99, yearly: 69.99 },
} as const satisfies Record<string, PlanPrices>;

export function parseBillingPeriod(value: string | undefined): BillingPeriod {
  return value === "monthly" ? "monthly" : "yearly";
}

export function gbpForPeriod(prices: PlanPrices, period: BillingPeriod): number {
  return prices[period];
}

export function formatGbp(amount: number): string {
  const formatted = Number.isInteger(amount)
    ? amount.toString()
    : amount.toFixed(2).replace(/\.?0+$/, "");
  return `£${formatted}`;
}
