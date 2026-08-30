export type BillingPeriod = "monthly" | "yearly";

export const YEARLY_GBP_BY_PAID_TIER = {
  basic: 10,
  advanced: 100,
} as const;

export function parseBillingPeriod(value: string | undefined): BillingPeriod {
  return value === "monthly" ? "monthly" : "yearly";
}

export function gbpForPeriod(yearlyGbp: number, period: BillingPeriod): number {
  if (yearlyGbp === 0) return 0;
  return period === "yearly" ? yearlyGbp : yearlyGbp / 10;
}

export function formatGbp(amount: number): string {
  const formatted = Number.isInteger(amount)
    ? amount.toString()
    : amount.toFixed(2).replace(/\.?0+$/, "");
  return `£${formatted}`;
}
