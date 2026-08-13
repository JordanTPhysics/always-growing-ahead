import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/lib/i18n/navigation";
import { Card } from "@/components/ui/card";
import { HelpQueryForm } from "@/components/help/help-query-form";
import { getUserById } from "@/lib/db/repositories/users";

const tutorialKeys = [
  "account",
  "findJobs",
  "workerProfile",
  "hireWorkers",
  "postJobs",
  "billing",
] as const;

const faqKeys = [
  "whatIsAga",
  "freeSearch",
  "plans",
  "revealContact",
  "contactShared",
  "verifyEmail",
  "language",
  "moreGuides",
] as const;

function tutorialSteps(key: (typeof tutorialKeys)[number], t: Awaited<ReturnType<typeof getTranslations>>) {
  const prefix = `tutorialItems.${key}` as const;
  const steps: string[] = [];
  for (let i = 1; i <= 6; i += 1) {
    const stepKey = `${prefix}.step${i}` as "tutorialItems.account.step1";
    if (!t.has(stepKey)) break;
    steps.push(t(stepKey));
  }
  return steps;
}

export async function HelpContent() {
  const t = await getTranslations("help");
  const session = await auth();
  let prefill: { name: string; email: string; phone: string } | null = null;
  if (session?.user?.id) {
    const user = await getUserById(Number(session.user.id));
    if (user) {
      prefill = {
        name: user.username ?? "",
        email: user.email,
        phone: user.phone ?? "",
      };
    }
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-text">{t("tutorialsTitle")}</h2>
        <div className="grid gap-4">
          {tutorialKeys.map((key) => {
            const steps = tutorialSteps(key, t);
            return (
              <Card key={key} elevation="nested" className="p-5">
                <h3 className="text-lg font-semibold text-text">
                  {t(`tutorialItems.${key}.title`)}
                </h3>
                <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm leading-6 text-muted">
                  {steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-text">{t("faqTitle")}</h2>
        <div className="space-y-3">
          {faqKeys.map((key) => (
            <details
              key={key}
              className="group rounded-md border border-border bg-surface open:shadow-panel"
            >
              <summary className="cursor-pointer list-none px-4 py-3 text-base font-medium text-text marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-3">
                  {t(`faqItems.${key}.question`)}
                  <span
                    aria-hidden="true"
                    className="text-muted transition-transform group-open:rotate-180"
                  >
                    ▾
                  </span>
                </span>
              </summary>
              <div className="border-t border-border px-4 py-3 text-sm leading-6 text-muted">
                {t(`faqItems.${key}.answer`)}
              </div>
            </details>
          ))}
        </div>
      </section>

      <Card elevation="nested" className="flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="max-w-2xl text-sm text-muted">{t("educationCta")}</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/pricing">{t("pricingLink")}</Link>
          <Link href="/education">{t("educationLink")}</Link>
        </div>
      </Card>

      <HelpQueryForm prefill={prefill} />
    </div>
  );
}
