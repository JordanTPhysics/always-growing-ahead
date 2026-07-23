import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/lib/i18n/routing";
import { Button } from "@/components/ui/button";
import type { Tier } from "@/lib/entitlements";
import { cn } from "@/lib/utils";

const tierKeys = ["free", "worker", "employer"] as const;

const tierToInternal: Record<(typeof tierKeys)[number], Tier> = {
  free: "none",
  worker: "basic",
  employer: "advanced",
};

const tierCardClassName: Record<(typeof tierKeys)[number], string> = {
  free: "pricing-card-free",
  worker: "pricing-card-worker",
  employer: "pricing-card-employer",
};

const pricingButtonClassName =
  "mt-auto border-border bg-white text-text shadow-button hover:bg-white/90 hover:shadow-button-hover";

function tierFeatures(
  key: (typeof tierKeys)[number],
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  const prefix = `tiers.${key}` as const;
  const features: string[] = [];
  for (let i = 1; i <= 8; i += 1) {
    const featureKey = `${prefix}.feature${i}` as "tiers.free.feature1";
    if (!t.has(featureKey)) break;
    features.push(t(featureKey));
  }
  return features;
}

export async function PricingTiers() {
  const t = await getTranslations("pricing");
  const session = await auth();
  const currentTier = (session?.user?.tier as Tier | undefined) ?? "none";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {tierKeys.map((key) => {
        const internalTier = tierToInternal[key];
        const isCurrent = currentTier === internalTier;
        const isPaid = key !== "free";
        const isHighlighted = key === "worker";

        return (
          <div
            key={key}
            className={cn(
              "flex flex-col gap-4 rounded-lg border border-border p-5 text-text shadow-panel-sm",
              tierCardClassName[key],
              isHighlighted && "ring-2 ring-accent"
            )}
          >
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-xl font-semibold text-text">
                  {t(`tiers.${key}.name`)}
                </h2>
                {isCurrent ? (
                  <span className="rounded-full bg-background-soft px-2 py-0.5 text-xs font-medium text-muted">
                    {t("currentPlan")}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-text">
                {t(`tiers.${key}.price`)}
                {isPaid ? (
                  <span className="text-base font-normal text-muted">
                    {" "}
                    {t("perYear")}
                  </span>
                ) : null}
              </p>
              <p className="mt-2 text-sm text-muted">
                {t(`tiers.${key}.summary`)}
              </p>
            </div>

            <ul className="flex-1 space-y-2 text-sm text-muted">
              {tierFeatures(key, t).map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span aria-hidden="true" className="text-accent">
                    ✓
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {key === "free" ? (
              isCurrent ? (
                <p className="text-sm font-medium text-muted">{t("currentPlan")}</p>
              ) : (
                <Button asChild variant="secondary" className={pricingButtonClassName}>
                  <Link href="/sign-up">{t("getStarted")}</Link>
                </Button>
              )
            ) : session ? (
              isCurrent ? (
                <Button asChild variant="secondary" className={pricingButtonClassName}>
                  <Link href="/billing">{t("managePlan")}</Link>
                </Button>
              ) : (
                <Button asChild variant="secondary" className={pricingButtonClassName}>
                  <Link href="/billing">{t("subscribe")}</Link>
                </Button>
              )
            ) : (
              <Button asChild variant="secondary" className={pricingButtonClassName}>
                <Link href="/sign-in">{t("signInToSubscribe")}</Link>
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
