import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import type { Tier } from "@/lib/entitlements";
import {
  PricingTiersGrid,
  type PricingTierData,
} from "@/components/pricing/pricing-tiers-grid";

const tierKeys = ["free", "worker", "employer"] as const;

const tierToInternal: Record<(typeof tierKeys)[number], Tier> = {
  free: "none",
  worker: "basic",
  employer: "advanced",
};

const tierYearlyPrice: Record<(typeof tierKeys)[number], number> = {
  free: 0,
  worker: 10,
  employer: 100,
};

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

  const tiers: PricingTierData[] = tierKeys.map((key) => {
    const internalTier = tierToInternal[key];
    return {
      key,
      name: t(`tiers.${key}.name`),
      summary: t(`tiers.${key}.summary`),
      features: tierFeatures(key, t),
      yearlyPrice: tierYearlyPrice[key],
      isCurrent: currentTier === internalTier,
      isPaid: key !== "free",
      isHighlighted: key === "worker",
      isSignedIn: Boolean(session),
    };
  });

  return <PricingTiersGrid tiers={tiers} />;
}
