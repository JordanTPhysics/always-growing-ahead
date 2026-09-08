import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, PageSection } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/forms";
import { Link } from "@/lib/i18n/navigation";
import { getUserAccountSummary } from "@/lib/db/repositories/chat";
import { isAdmin } from "@/lib/db/repositories/users";

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminUserAccountPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id: rawId } = await params;
  const session = await auth();
  if (!session?.user?.id || !(await isAdmin(Number(session.user.id)))) {
    redirect(`/${locale}`);
  }

  const userId = Number(rawId);
  if (!Number.isInteger(userId) || userId < 1) notFound();

  const user = await getUserAccountSummary(userId);
  if (!user) notFound();

  const t = await getTranslations("admin");
  const rows: { label: string; value: string }[] = [
    { label: t("account.email"), value: user.email },
    { label: t("account.username"), value: user.username || "—" },
    { label: t("account.phone"), value: user.phone || "—" },
    { label: t("account.city"), value: user.city || "—" },
    { label: t("account.district"), value: user.district || "—" },
    { label: t("account.tier"), value: user.subscription_tier },
    { label: t("account.role"), value: user.role },
    {
      label: t("account.verified"),
      value: user.email_verified_at
        ? t("account.verifiedYes")
        : t("account.verifiedNo"),
    },
    { label: t("account.created"), value: formatDate(user.created_at) },
  ];

  return (
    <PageSection>
      <PageHeader
        title={t("account.title")}
        subtitle={t("account.subtitle", { email: user.email })}
        actions={
          <Button asChild variant="secondary">
            <Link href="/admin?tab=chat">{t("account.backToChat")}</Link>
          </Button>
        }
      />
      <Card elevation="nested" className="mt-6 p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-sm text-muted">{row.label}</dt>
              <dd className="mt-1 font-medium text-text">{row.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex flex-wrap gap-2">
          {user.worker_profile_id ? (
            <Button asChild>
              <Link href={`/workers/${user.worker_profile_id}`}>
                {t("account.viewWorker")}
              </Link>
            </Button>
          ) : null}
          {user.employer_profile_id ? (
            <Button asChild variant="secondary">
              <Link href={`/employers/${user.employer_profile_id}`}>
                {t("account.viewEmployer")}
              </Link>
            </Button>
          ) : null}
        </div>
        {!user.worker_profile_id && !user.employer_profile_id ? (
          <p className="mt-4 text-sm text-muted">{t("account.noProfiles")}</p>
        ) : null}
      </Card>
    </PageSection>
  );
}
