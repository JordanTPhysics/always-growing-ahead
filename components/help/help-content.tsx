import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/lib/i18n/navigation";
import { HelpQueryForm } from "@/components/help/help-query-form";
import { getUserById } from "@/lib/db/repositories/users";
import { Button } from "../ui/button";

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
        <h3 className="text-2xl font-semibold text-foreground">
          {t("tutorialsTitle")}
        </h3>
        <div className="grid gap-8">
          {tutorialKeys.map((key) => {
            const steps = tutorialSteps(key, t);
            return (
              <div key={key}>
                <h4 className="text-lg font-semibold text-white">
                  {t(`tutorialItems.${key}.title`)}
                </h4>
                <div className="h-[1px] w-full mx-auto bg-white"></div>
                <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm leading-6 text-white/90">
                  {steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-2xl font-semibold text-foreground">{t("faqTitle")}</h3>
        <div>
          {faqKeys.map((key) => (
            <details key={key} className="group border-b border-white/15">
              <summary className="cursor-pointer list-none py-3 text-base font-medium text-white marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-3">
                  {t(`faqItems.${key}.question`)}
                  <span
                    aria-hidden="true"
                    className="text-foreground transition-transform group-open:rotate-180"
                  >
                    ▾
                  </span>
                </span>
              </summary>
              <div className="pb-3 text-sm leading-6 text-white/90">
                {t(`faqItems.${key}.answer`)}
              </div>
            </details>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl text-sm text-white/90">{t("educationCta")}</p>
        <div className="flex flex-wrap gap-4">
          <Button variant="accent">
            <Link href="/pricing">{t("pricingLink")}</Link>
          </Button>
          <Button variant="secondary">
            <Link href="/education">{t("educationLink")}</Link>
          </Button>
        </div>
      </div>

      <HelpQueryForm prefill={prefill} />
    </div>
  );
}
