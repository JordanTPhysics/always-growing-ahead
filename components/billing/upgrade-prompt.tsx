"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import { buttonPrimaryClassName } from "@/components/ui/forms";

type Props = {
  title?: string;
  description: string;
  requiredTier?: "basic" | "advanced";
};

export function UpgradePrompt({
  title,
  description,
  requiredTier = "basic",
}: Props) {
  const t = useTranslations("billing");

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-5">
      <h2 className="text-lg font-medium text-text">
        {title ?? t("upgradeTitle")}
      </h2>
      <p className="text-sm text-muted">{description}</p>
      <p className="text-xs text-muted">
        {requiredTier === "advanced"
          ? t("requiresAdvanced")
          : t("requiresBasic")}
      </p>
      <Link href="/billing" className={buttonPrimaryClassName}>
        {t("viewPlans")}
      </Link>
    </div>
  );
}
