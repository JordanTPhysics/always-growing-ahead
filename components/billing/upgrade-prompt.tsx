"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

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
    <Card elevation="nested" className="space-y-3 p-5">
      <CardTitle className="text-lg font-medium">
        {title ?? t("upgradeTitle")}
      </CardTitle>
      <CardDescription>{description}</CardDescription>
      <p className="text-xs text-muted">
        {requiredTier === "advanced"
          ? t("requiresAdvanced")
          : t("requiresBasic")}
      </p>
      <Button asChild>
        <Link href="/pricing">{t("viewPlans")}</Link>
      </Button>
    </Card>
  );
}
