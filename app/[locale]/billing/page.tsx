import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { BillingPlans } from "@/components/billing/billing-plans";
import { PageHeader } from "@/components/ui/forms";
import { PageSection } from "@/components/ui/card";
import { getTrialForUser } from "@/lib/db/repositories/trials";
import { getUserById } from "@/lib/db/repositories/users";
import { isStripeConfigured } from "@/lib/stripe/client";
import { parseBillingPeriod } from "@/lib/stripe/billing-period";
import { toTrialView } from "@/lib/stripe/trial";

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    success?: string;
    canceled?: string;
    period?: string;
    trial?: string;
  }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/sign-in`);

  const t = await getTranslations("billing");
  const user = await getUserById(Number(session.user.id));
  const trialRow = user ? await getTrialForUser(user.id) : null;

  return (
    <PageSection>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <BillingPlans
        currentTier={user?.subscription_tier ?? session.user.tier}
        hasStripeCustomer={Boolean(user?.stripe_customer_id)}
        stripeConfigured={isStripeConfigured()}
        initialPeriod={parseBillingPeriod(query.period)}
        success={query.success === "1"}
        canceled={query.canceled === "1"}
        trial={toTrialView(trialRow)}
        trialAvailable={!trialRow}
        trialStarted={query.success === "1" && query.trial === "1"}
      />
    </PageSection>
  );
}
