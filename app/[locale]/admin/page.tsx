import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { PageHeader } from "@/components/ui/forms";
import { PageSection } from "@/components/ui/card";
import { isAdmin } from "@/lib/db/repositories/users";

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id || !(await isAdmin(Number(session.user.id)))) {
    redirect(`/${locale}`);
  }

  const { tab } = await searchParams;
  const t = await getTranslations("admin");
  return (
    <PageSection>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <AdminDashboard initialTab={tab === "chat" ? "chat" : "access"} />
    </PageSection>
  );
}
