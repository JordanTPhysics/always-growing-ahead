import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAuthOrSignUp } from "@/lib/auth/require-auth";
import { JobForm } from "@/components/job/job-form";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { canPostJobs } from "@/lib/entitlements";
import { isMockMapDataEnabled } from "@/lib/mock/nottingham";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireAuthOrSignUp(locale);

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

  return <JobForm jobId={Number(id)} />;
}
