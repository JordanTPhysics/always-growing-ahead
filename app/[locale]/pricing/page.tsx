import { getTranslations, setRequestLocale } from "next-intl/server";
import { PricingTiers } from "@/components/pricing/pricing-tiers";
import { PageHeader } from "@/components/ui/forms";
import { PageSection } from "@/components/ui/card";
import { isActiveLocale, type ActiveLocale } from "@/lib/i18n/locales";

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale: ActiveLocale = isActiveLocale(localeParam)
    ? localeParam
    : "en";
  setRequestLocale(locale);

  const t = await getTranslations("pricing");

  return (
    <PageSection>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <PricingTiers />
    </PageSection>
  );
}
