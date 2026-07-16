import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { JobForm } from "@/components/job/job-form";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { canPostJobs } from "@/lib/entitlements";
import { isMockMapDataEnabled } from "@/lib/mock/nottingham";

export default async function NewJobPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/sign-in`);

  if (!isMockMapDataEnabled() && !canPostJobs(session.user.tier)) {
    const t = await getTranslations("billing");
    return (
      <UpgradePrompt
        title={t("upgradeToPostTitle")}
        description={t("upgradeToPostBody")}
        requiredTier="advanced"
      />
    );
  }

  return <JobForm />;
}
