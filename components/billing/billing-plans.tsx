"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import type { Tier } from "@/lib/entitlements";
import {
  buttonPrimaryClassName,
  buttonSecondaryClassName,
} from "@/components/ui/forms";

type Props = {
  currentTier: Tier;
  hasStripeCustomer: boolean;
  stripeConfigured: boolean;
  success?: boolean;
  canceled?: boolean;
};

export function BillingPlans({
  currentTier,
  hasStripeCustomer,
  stripeConfigured,
  success,
  canceled,
}: Props) {
  const t = useTranslations("billing");
  const locale = useLocale();
  const { data: session, update } = useSession();
  const liveTier = (session?.user?.tier as Tier | undefined) ?? currentTier;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"basic" | "advanced" | "portal" | null>(
    null
  );

  useEffect(() => {
    if (success) {
      void update();
    }
  }, [success, update]);

  async function startCheckout(tier: "basic" | "advanced") {
    setLoading(tier);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("checkoutFailed"));
        return;
      }
      window.location.href = data.url;
    } catch {
      setError(t("checkoutFailed"));
    } finally {
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("portalFailed"));
        return;
      }
      window.location.href = data.url;
    } catch {
      setError(t("portalFailed"));
    } finally {
      setLoading(null);
    }
  }

  const plans = [
    {
      id: "basic" as const,
      name: t("tiers.basic"),
      price: t("prices.basic"),
      features: [
        t("features.search"),
        t("features.workerProfile"),
        t("features.contact"),
      ],
    },
    {
      id: "advanced" as const,
      name: t("tiers.advanced"),
      price: t("prices.advanced"),
      features: [
        t("features.search"),
        t("features.workerProfile"),
        t("features.contact"),
        t("features.postJobs"),
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {success ? (
        <p className="rounded-md bg-background-soft px-3 py-2 text-sm text-muted">
          {t("checkoutSuccess")}
        </p>
      ) : null}
      {canceled ? (
        <p className="rounded-md border border-border px-3 py-2 text-sm text-muted">
          {t("checkoutCanceled")}
        </p>
      ) : null}
      {!stripeConfigured ? (
        <p className="rounded-md border border-border px-3 py-2 text-sm text-muted">
          {t("stripeNotConfigured")}
        </p>
      ) : null}

      <p className="text-sm text-muted">
        {t("currentPlan")}:{" "}
        <span className="font-medium text-text">
          {t(`tiers.${liveTier}`)}
        </span>
      </p>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent = liveTier === plan.id;
          const isDowngrade =
            liveTier === "advanced" && plan.id === "basic";
          const needsPortal =
            liveTier === "basic" || liveTier === "advanced";

          return (
            <div
              key={plan.id}
              className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5"
            >
              <div>
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                <p className="mt-1 text-muted">{plan.price}</p>
              </div>
              <ul className="space-y-2 text-sm text-muted">
                {plan.features.map((feature) => (
                  <li key={feature}>· {feature}</li>
                ))}
              </ul>
              {isCurrent ? (
                <p className="mt-auto text-sm font-medium text-muted">
                  {t("currentBadge")}
                </p>
              ) : needsPortal ? (
                <button
                  type="button"
                  className={`${buttonSecondaryClassName} mt-auto`}
                  disabled={!stripeConfigured || loading !== null}
                  onClick={() => void openPortal()}
                >
                  {loading === "portal"
                    ? t("openingPortal")
                    : isDowngrade
                      ? t("changePlan")
                      : t("upgradeViaPortal")}
                </button>
              ) : (
                <button
                  type="button"
                  className={`${buttonPrimaryClassName} mt-auto`}
                  disabled={!stripeConfigured || loading !== null}
                  onClick={() => void startCheckout(plan.id)}
                >
                  {loading === plan.id ? t("redirecting") : t("subscribe")}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {hasStripeCustomer ? (
        <button
          type="button"
          className={buttonSecondaryClassName}
          disabled={!stripeConfigured || loading !== null}
          onClick={() => void openPortal()}
        >
          {loading === "portal" ? t("openingPortal") : t("manageBilling")}
        </button>
      ) : null}
    </div>
  );
}
