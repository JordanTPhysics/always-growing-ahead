import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { WorkerProfileForm } from "@/components/profile/worker-profile-form";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { canCreateWorkerProfile } from "@/lib/entitlements";

export default async function WorkerProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/sign-in`);

  if (!canCreateWorkerProfile(session.user.tier)) {
    const t = await getTranslations("billing");
    return (
      <UpgradePrompt
        title={t("upgradeToProfileTitle")}
        description={t("upgradeToProfileBody")}
        requiredTier="basic"
      />
    );
  }

  return <WorkerProfileForm />;
}
