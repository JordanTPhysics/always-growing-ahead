import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { PageHeader } from "@/components/ui/forms";
import { Button } from "@/components/ui/button";
import { PageSection } from "@/components/ui/card";
import { consumeVerificationToken } from "@/lib/auth/email-verification";
import { isActiveLocale, type ActiveLocale } from "@/lib/i18n/locales";

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale: ActiveLocale = isActiveLocale(localeParam)
    ? localeParam
    : "en";
  setRequestLocale(locale);

  const { token } = await searchParams;
  const t = await getTranslations("auth");
  const result = await consumeVerificationToken(token ?? "");

  const title = result.ok
    ? t("verifySuccessTitle")
    : result.reason === "expired"
      ? t("verifyExpiredTitle")
      : t("verifyInvalidTitle");
  const subtitle = result.ok
    ? t("verifySuccessBody")
    : result.reason === "expired"
      ? t("verifyExpiredBody")
      : t("verifyInvalidBody");

  return (
    <div className="mx-auto max-w-md">
      <PageSection>
        <PageHeader title={title} subtitle={subtitle} />
        <Button asChild className="w-full">
          <Link href="/sign-in">{t("submitSignIn")}</Link>
        </Button>
      </PageSection>
    </div>
  );
}
