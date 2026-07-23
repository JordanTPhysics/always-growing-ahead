import { getTranslations, setRequestLocale } from "next-intl/server";
import { HelpContent } from "@/components/help/help-content";
import { PageHeader } from "@/components/ui/forms";
import { PageSection } from "@/components/ui/card";
import { isActiveLocale, type ActiveLocale } from "@/lib/i18n/locales";

export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale: ActiveLocale = isActiveLocale(localeParam)
    ? localeParam
    : "en";
  setRequestLocale(locale);

  const t = await getTranslations("help");

  return (
    <PageSection>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <HelpContent />
    </PageSection>
  );
}
