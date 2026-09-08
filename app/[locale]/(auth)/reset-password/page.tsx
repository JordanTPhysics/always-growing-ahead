import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { PageHeader } from "@/components/ui/forms";
import { Button } from "@/components/ui/button";
import { PageSection } from "@/components/ui/card";
import { peekPasswordResetToken } from "@/lib/auth/password-reset";
import { isActiveLocale, type ActiveLocale } from "@/lib/i18n/locales";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
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
  const result = await peekPasswordResetToken(token ?? "");
  const expired = !result.ok && result.reason === "expired";

  return (
    <div className="mx-auto max-w-md">
      <PageSection>
        {result.ok && token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <>
            <PageHeader
              title={expired ? t("resetExpiredTitle") : t("resetInvalidTitle")}
              subtitle={
                expired ? t("resetExpiredBody") : t("resetInvalidBody")
              }
            />
            <Button asChild className="w-full">
              <Link href="/forgot-password">{t("forgotPasswordTitle")}</Link>
            </Button>
          </>
        )}
      </PageSection>
    </div>
  );
}
