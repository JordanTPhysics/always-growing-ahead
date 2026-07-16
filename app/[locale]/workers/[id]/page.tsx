import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicWorkerBundle } from "@/lib/db/repositories/workers";
import {
  getMockWorkerById,
  isMockMapDataEnabled,
} from "@/lib/mock/nottingham";
import { getJsonWorkerById } from "@/lib/mock/profiles-store";
import { stripProfileContact } from "@/lib/profiles/contact";
import { PageHeader } from "@/components/ui/forms";
import { ContactReveal } from "@/components/billing/contact-reveal";

export default async function WorkerPublicPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("worker-profile");
  const workerId = Number(id);

  let profile;
  let skills;
  let experience;
  let qualifications;

  if (isMockMapDataEnabled()) {
    const row = getJsonWorkerById(workerId);
    const mockWorker = row?.profile ?? getMockWorkerById(workerId);
    if (!mockWorker || mockWorker.visibility !== "public") notFound();
    profile = stripProfileContact(mockWorker);
    skills = row?.skills ?? [];
    experience = row?.experience ?? [];
    qualifications = row?.qualifications ?? [];
  } else {
    const bundle = await getPublicWorkerBundle(workerId);
    if (!bundle) notFound();
    profile = bundle.profile;
    skills = bundle.skills;
    experience = bundle.experience;
    qualifications = bundle.qualifications;
  }

  return (
    <article className="space-y-6">
      <PageHeader
        title={profile.headline ?? t("title")}
        subtitle={profile.bio ?? undefined}
      />

      <div className="space-y-4 rounded-lg border border-border bg-surface p-5">
        {profile.postcode || profile.address_text ? (
          <p className="text-sm text-muted">
            {[profile.address_text, profile.postcode].filter(Boolean).join(", ")}
          </p>
        ) : null}

        {skills.length > 0 ? (
          <div>
            <h2 className="mb-2 font-medium">{t("skills")}</h2>
            <ul className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <li
                  key={skill.id}
                  className="rounded-md border border-border px-3 py-1 text-sm"
                >
                  {skill.skill_name ?? `Skill #${skill.skill_id}`}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {experience.length > 0 ? (
          <div className="space-y-3">
            <h2 className="font-medium">{t("experience")}</h2>
            {experience.map((entry) => (
              <div key={entry.id} className="border-t border-border pt-3 text-sm">
                <p className="font-medium">{entry.job_title}</p>
                <p className="text-muted">{entry.employer_name}</p>
                {entry.description ? (
                  <p className="mt-1 whitespace-pre-wrap">{entry.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {qualifications.length > 0 ? (
          <div className="space-y-3">
            <h2 className="font-medium">{t("qualifications")}</h2>
            {qualifications.map((entry) => (
              <div key={entry.id} className="border-t border-border pt-3 text-sm">
                <p className="font-medium">{entry.qualification_name}</p>
                <p className="text-muted">
                  {[entry.institution, entry.year_awarded]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <ContactReveal target="worker" workerId={workerId} />
    </article>
  );
}
