import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { BillingPlans } from "@/components/billing/billing-plans";
import { PageHeader } from "@/components/ui/forms";
import { getUserById } from "@/lib/db/repositories/users";
import { isStripeConfigured } from "@/lib/stripe/client";

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/sign-in`);

  const t = await getTranslations("billing");
  const user = await getUserById(Number(session.user.id));

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <BillingPlans
        currentTier={session.user.tier}
        hasStripeCustomer={Boolean(user?.stripe_customer_id)}
        stripeConfigured={isStripeConfigured()}
        success={query.success === "1"}
        canceled={query.canceled === "1"}
      />
    </div>
  );
}
