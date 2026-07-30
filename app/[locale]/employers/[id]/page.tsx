import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getEmployerById } from "@/lib/db/repositories/employers";
import { getJsonEmployerById } from "@/lib/mock/profiles-store";
import { isMockMapDataEnabled } from "@/lib/mock/nottingham";
import { stripProfileContact } from "@/lib/profiles/contact";
import { PageHeader } from "@/components/ui/forms";
import { Card, PageSection } from "@/components/ui/card";
import { FavouriteButton } from "@/components/favourites/favourite-button";

export default async function EmployerPublicPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employer-profile");
  const employerId = Number(id);

  const profile = isMockMapDataEnabled()
    ? getJsonEmployerById(employerId)
    : await getEmployerById(employerId);

  if (!profile) notFound();

  const publicProfile = stripProfileContact(profile);

  return (
    <PageSection>
      <PageHeader
        title={publicProfile.company_name ?? t("title")}
        subtitle={publicProfile.company_description ?? undefined}
        actions={
          <FavouriteButton targetType="employer" targetId={publicProfile.id} />
        }
      />

      <Card elevation="nested" className="space-y-4 p-5">
        <div className="flex flex-wrap items-start gap-4">
          {publicProfile.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={publicProfile.logo_url}
              alt=""
              className="h-16 w-16 rounded-md object-cover"
            />
          ) : null}
          {publicProfile.website_url ? (
            <a
              href={publicProfile.website_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-muted underline"
            >
              {publicProfile.website_url}
            </a>
          ) : null}
        </div>
        {publicProfile.company_description ? (
          <p className="whitespace-pre-wrap text-muted">
            {publicProfile.company_description}
          </p>
        ) : (
          <p className="text-sm text-muted">{t("empty")}</p>
        )}
      </Card>
    </PageSection>
  );
}
