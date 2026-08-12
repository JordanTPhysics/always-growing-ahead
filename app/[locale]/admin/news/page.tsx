import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminNewsPanel } from "@/components/admin/admin-news-panel";
import { PageSection } from "@/components/ui/card";
import { isAdmin } from "@/lib/db/repositories/users";

export default async function AdminNewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id || !(await isAdmin(Number(session.user.id)))) {
    redirect(`/${locale}`);
  }

  return (
    <PageSection>
      <AdminNewsPanel />
    </PageSection>
  );
}
