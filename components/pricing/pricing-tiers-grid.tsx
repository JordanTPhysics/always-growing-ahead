"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import {
  formatGbp,
  gbpForPeriod,
  type BillingPeriod,
} from "@/lib/stripe/billing-period";
import { Button } from "@/components/ui/button";
import { PillToggle } from "@/components/ui/pill-toggle";
import { cn } from "@/lib/utils";

export type PricingTierData = {
  key: "free" | "worker" | "employer";
  name: string;
  summary: string;
  features: string[];
  yearlyPrice: number;
  isCurrent: boolean;
  isPaid: boolean;
  isHighlighted: boolean;
  isSignedIn: boolean;
};

type Props = {
  tiers: PricingTierData[];
};

const pricingButtonClassName =
  "mt-auto border-border bg-white shadow-button hover:bg-white/90 hover:shadow-button-hover";

export function PricingTiersGrid({ tiers }: Props) {
  const t = useTranslations("pricing");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("yearly");

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <PillToggle
          value={billingPeriod}
          onChange={setBillingPeriod}
          ariaLabel={t("billingToggleLabel")}
          options={[
            { value: "monthly", label: t("billingMonthly") },
            { value: "yearly", label: t("billingYearly") },
          ]}
        />
      </div>

      <div
        className="pricing-tiers-grid grid gap-4 lg:grid-cols-3"
        data-billing-period={billingPeriod}
      >
        {tiers.map((tier) => (
          <div
            key={tier.key}
            className={cn(
              "pricing-card flex flex-col rounded-lg border border-border p-5 shadow-panel-sm",
              `pricing-card-${tier.key}`,
              tier.isHighlighted && "pricing-card-highlighted ring-2 ring-[var(--pricing-ring)]"
            )}
          >
            <div className="pricing-card-content">
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="pricing-card-title text-xl font-semibold">{tier.name}</h2>
                  {tier.isCurrent ? (
                    <span className="pricing-card-badge rounded-full px-2 py-0.5 text-xs font-medium">
                      {t("currentPlan")}
                    </span>
                  ) : null}
                </div>
                <p
                  key={billingPeriod}
                  className="pricing-card-price pricing-price-animate mt-2 text-3xl font-semibold tracking-tight"
                >
                  {formatGbp(gbpForPeriod(tier.yearlyPrice, billingPeriod))}
                  {tier.isPaid ? (
                    <span className="pricing-card-muted text-base font-normal">
                      {" "}
                      {t(billingPeriod === "yearly" ? "perYear" : "perMonth")}
                    </span>
                  ) : null}
                </p>
                <p className="pricing-card-muted mt-2 text-sm">{tier.summary}</p>
              </div>

              <ul className="pricing-card-muted flex-1 space-y-2 text-sm">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span aria-hidden="true" className="pricing-card-accent">
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {tier.key === "free" ? (
                tier.isCurrent ? (
                  <p className="pricing-card-muted text-sm font-medium">{t("currentPlan")}</p>
                ) : (
                  <Button asChild variant="secondary" className={pricingButtonClassName}>
                    <Link href="/sign-up">{t("getStarted")}</Link>
                  </Button>
                )
              ) : tier.isSignedIn ? (
                tier.isCurrent ? (
                  <Button asChild variant="secondary" className={pricingButtonClassName}>
                    <Link href={`/billing?period=${billingPeriod}`}>{t("managePlan")}</Link>
                  </Button>
                ) : (
                  <Button asChild variant="secondary" className={pricingButtonClassName}>
                    <Link href={`/billing?period=${billingPeriod}`}>{t("subscribe")}</Link>
                  </Button>
                )
              ) : (
                <Button asChild variant="secondary" className={pricingButtonClassName}>
                  <Link href="/sign-in">{t("signInToSubscribe")}</Link>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
