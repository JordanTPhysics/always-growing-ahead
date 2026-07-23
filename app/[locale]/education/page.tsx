import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { EducationLibrary } from "@/components/education/education-library";
import { PageHeader } from "@/components/ui/forms";
import { PageSection } from "@/components/ui/card";
import { listPublishedEducationResources } from "@/lib/db/repositories/education";
import { canViewEducation } from "@/lib/entitlements";
import { isActiveLocale, type ActiveLocale } from "@/lib/i18n/locales";

export default async function EducationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale: ActiveLocale = isActiveLocale(localeParam)
    ? localeParam
    : "en";
  setRequestLocale(locale);

  const [t, resources, session] = await Promise.all([
    getTranslations("education"),
    listPublishedEducationResources(),
    auth(),
  ]);

  const tier = session?.user?.tier ?? "none";

  return (
    <PageSection>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      {canViewEducation(tier) ? (
        <EducationLibrary locale={locale} resources={resources} />
      ) : (
        <UpgradePrompt
          title={t("upgradeTitle")}
          description={t("upgradeBody")}
        />
      )}
    </PageSection>
  );
}
