import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { getEmployerById } from "@/lib/db/repositories/employers";
import { canViewContactInfo } from "@/lib/entitlements";
import { stripProfileContact } from "@/lib/profiles/contact";
import { Link } from "@/lib/i18n/navigation";
import { authHref } from "@/lib/auth/continue-path";
import { PageHeader } from "@/components/ui/forms";
import { Button } from "@/components/ui/button";
import { Card, PageSection } from "@/components/ui/card";
import { FavouriteButton } from "@/components/favourites/favourite-button";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import {
  ContactChannels,
  WebsiteLink,
} from "@/components/profile/contact-channels";

export default async function EmployerPublicPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employer-profile");
  const billing = await getTranslations("billing");
  const employerId = Number(id);
  const session = await auth();

  const profile = await getEmployerById(employerId);

  if (!profile) notFound();

  const publicProfile = stripProfileContact(profile);
  const hasContact = Boolean(
    profile.contact_email || profile.contact_phone || profile.linkedin_url
  );
  const subscribed = Boolean(
    session?.user && canViewContactInfo(session.user.tier)
  );
  const canViewContact = subscribed && Boolean(session?.user.isEmailVerified);

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
        {publicProfile.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicProfile.logo_url}
            alt=""
            className="h-16 w-16 rounded-md object-cover"
          />
        ) : null}
        {publicProfile.address_text || publicProfile.postcode ? (
          <p className="text-sm text-muted">
            {publicProfile.address_text ?? publicProfile.postcode}
          </p>
        ) : null}
        {publicProfile.company_description ? (
          <p className="whitespace-pre-wrap text-muted">
            {publicProfile.company_description}
          </p>
        ) : (
          <p className="text-sm text-muted">{t("empty")}</p>
        )}
        {publicProfile.website_url ? (
          <WebsiteLink url={publicProfile.website_url} />
        ) : null}
      </Card>

      {hasContact && canViewContact ? (
        <Card elevation="nested" className="space-y-3 p-5">
          <h2 className="font-medium">{billing("contactDetails")}</h2>
          <ContactChannels
            email={profile.contact_email}
            phone={profile.contact_phone}
            linkedinUrl={profile.linkedin_url}
          />
        </Card>
      ) : null}

      {hasContact && !session?.user ? (
        <Card elevation="nested" className="space-y-3 p-5">
          <p className="text-sm text-muted">{billing("signInToContact")}</p>
          <Button asChild>
            <Link href={authHref("/sign-in", { paid: true, next: `/employers/${id}` })}>
              {billing("signIn")}
            </Link>
          </Button>
        </Card>
      ) : null}

      {hasContact && session?.user && !subscribed ? (
        <UpgradePrompt
          description={billing("contactLocked")}
          requiredTier="basic"
        />
      ) : null}

      {hasContact && subscribed && !session?.user.isEmailVerified ? (
        <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted">
          {billing("verifyEmailFirst")}
        </p>
      ) : null}
    </PageSection>
  );
}
