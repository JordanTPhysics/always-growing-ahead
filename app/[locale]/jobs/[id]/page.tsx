import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getJobById, listJobSkills } from "@/lib/db/repositories/jobs";
import { getJsonJobById } from "@/lib/mock/jobs-store";
import { isMockMapDataEnabled } from "@/lib/mock/nottingham";
import { PageHeader } from "@/components/ui/forms";
import { Card, PageSection } from "@/components/ui/card";
import { ContactReveal } from "@/components/billing/contact-reveal";
import { FavouriteButton } from "@/components/favourites/favourite-button";
import { Link } from "@/lib/i18n/routing";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("jobs");
  const jobId = Number(id);

  const mockRow = isMockMapDataEnabled() ? getJsonJobById(jobId) : null;
  const job = mockRow?.job ?? (await getJobById(jobId));
  if (!job) notFound();

  const skills =
    mockRow?.skills.map((skill) => ({
      ...skill,
      skill_name: `Skill #${skill.skill_id}`,
    })) ?? (await listJobSkills(job.id));

  return (
    <PageSection>
      <PageHeader
        title={job.title}
        subtitle={
          [job.postcode, job.address_text].filter(Boolean).join(", ") ||
          (job.job_type ? t(`jobTypes.${job.job_type}`) : undefined)
        }
        actions={<FavouriteButton targetType="job" targetId={job.id} />}
      />

      {job.company_name ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            href={`/employers/${job.employer_id}`}
            className="font-medium text-text underline-offset-2 hover:underline"
          >
            {job.company_name}
          </Link>
          <FavouriteButton targetType="employer" targetId={job.employer_id} />
        </div>
      ) : null}

      <Card elevation="nested" className="space-y-4 p-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {job.job_type ? (
            <div>
              <dt className="text-muted">{t("jobType")}</dt>
              <dd>{t(`jobTypes.${job.job_type}`)}</dd>
            </div>
          ) : null}
          {job.postcode || job.address_text ? (
            <div>
              <dt className="text-muted">{t("address")}</dt>
              <dd>
                {[job.address_text, job.postcode].filter(Boolean).join(", ")}
              </dd>
            </div>
          ) : null}
          {job.salary_min != null || job.salary_max != null ? (
            <div>
              <dt className="text-muted">Salary</dt>
              <dd>
                £{job.salary_min ?? "—"}–£{job.salary_max ?? "—"}
                {job.salary_type ? ` / ${t(`salaryTypes.${job.salary_type}`)}` : ""}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted">{t("status")}</dt>
            <dd>{t(`statuses.${job.status}`)}</dd>
          </div>
        </dl>

        {job.description ? (
          <div className="space-y-2">
            <h2 className="font-medium">{t("description")}</h2>
            <p className="whitespace-pre-wrap text-muted">{job.description}</p>
          </div>
        ) : null}

        {job.requirements ? (
          <div className="space-y-2">
            <h2 className="font-medium">{t("requirements")}</h2>
            <p className="whitespace-pre-wrap text-muted">{job.requirements}</p>
          </div>
        ) : null}

        {skills.length > 0 ? (
          <div className="space-y-2">
            <h2 className="font-medium">{t("skills")}</h2>
            <ul className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <li
                  key={skill.id}
                  className="rounded-md border border-border px-3 py-1 text-sm"
                >
                  {skill.skill_name}
                  {skill.required ? ` · ${t("requiredSkill")}` : ` · ${t("niceToHave")}`}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      {job.status === "active" ? (
        <ContactReveal target="job" jobId={job.id} />
      ) : null}
    </PageSection>
  );
}
