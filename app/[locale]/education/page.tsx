import { getTranslations, setRequestLocale } from "next-intl/server";
import { EducationHub } from "@/components/education/education-hub";
import { PageHeader } from "@/components/ui/forms";
import { PageSection } from "@/components/ui/card";
import { requireAuthOrSignUp } from "@/lib/auth/require-auth";
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

  await requireAuthOrSignUp(locale, "education");
  const t = await getTranslations("education");

  return (
    <PageSection className="lg:flex lg:flex-1 lg:flex-col lg:max-w-3/4 lg:max-h-3/4 mx-auto">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <EducationHub />
    </PageSection>
  );
}
