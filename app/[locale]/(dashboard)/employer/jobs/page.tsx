import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/lib/i18n/routing";
import { getEmployerByUserId } from "@/lib/db/repositories/employers";
import { listJobsByEmployer } from "@/lib/db/repositories/jobs";
import { listJsonJobsByEmployer } from "@/lib/mock/jobs-store";
import { isMockMapDataEnabled } from "@/lib/mock/nottingham";
import { getJsonEmployerByUserId } from "@/lib/mock/profiles-store";
import { PageHeader } from "@/components/ui/forms";
import { Button } from "@/components/ui/button";
import { Card, PageSection } from "@/components/ui/card";
import { canPostJobs } from "@/lib/entitlements";

export default async function EmployerJobsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/sign-in`);

  const t = await getTranslations("jobs");
  const tEmployer = await getTranslations("employer-profile");
  const tBilling = await getTranslations("billing");
  const mock = isMockMapDataEnabled();
  const userId = Number(session.user.id);
  const employer = mock
    ? getJsonEmployerByUserId(userId)
    : await getEmployerByUserId(userId);
  const jobs = employer
    ? mock
      ? listJsonJobsByEmployer(employer.id)
      : await listJobsByEmployer(employer.id)
    : [];
  const canPost = mock || canPostJobs(session.user.tier);

  return (
    <PageSection>
      <PageHeader
        title={t("myJobsTitle")}
        actions={
          employer && canPost ? (
            <Button asChild>
              <Link href="/employer/jobs/new">{t("createTitle")}</Link>
            </Button>
          ) : employer && !canPost ? (
            <Button asChild>
              <Link href="/billing">{tBilling("upgradeToPostCta")}</Link>
            </Button>
          ) : null
        }
      />

      {!employer ? (
        <Card elevation="nested" className="p-5">
          <p className="text-muted">{tEmployer("neededForJobs")}</p>
          <Link
            href="/employer/profile"
            className="mt-4 inline-flex text-muted underline"
          >
            {tEmployer("createCta")}
          </Link>
        </Card>
      ) : !canPost ? (
        <p className="rounded-md bg-background-soft px-3 py-2 text-sm text-muted">
          {tBilling("upgradeToPostBody")}
        </p>
      ) : null}

      {employer && jobs.length === 0 ? (
        <p className="text-muted">{t("emptyMine")}</p>
      ) : employer && jobs.length > 0 ? (
        <Card elevation="nested" className="divide-y divide-border overflow-hidden">
          <ul>
            {jobs.map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
              >
                <div>
                  <p className="font-medium">{job.title}</p>
                  <p className="text-sm text-muted">
                    {t(`statuses.${job.status}`)}
                    {job.postcode ? ` · ${job.postcode}` : ""}
                  </p>
                </div>
                <div className="flex gap-3 text-sm">
                  <Link href={`/jobs/${job.id}`} className="text-muted underline">
                    {t("viewJob")}
                  </Link>
                  {canPost ? (
                    <Link
                      href={`/employer/jobs/${job.id}/edit`}
                      className="text-muted underline"
                    >
                      Edit
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </PageSection>
  );
}
