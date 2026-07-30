"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, PageSection } from "@/components/ui/card";
import {
  Field,
  FormModeTabs,
  PageHeader,
  inputClassName,
  type FormMode,
} from "@/components/ui/forms";
import { EmployerJobsPanel } from "@/components/profile/employer-jobs-panel";
import { FavouritesPanel } from "@/components/favourites/favourites-panel";

export function EmployerProfileForm() {
  const t = useTranslations("employer-profile");
  const tCommon = useTranslations("common");
  const [mode, setMode] = useState<FormMode>("edit");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [activelyHiring, setActivelyHiring] = useState(false);

  useEffect(() => {
    fetch("/api/employers?mine=1")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setExists(true);
          setCompanyName(data.profile.company_name ?? "");
          setDescription(data.profile.company_description ?? "");
          setWebsite(data.profile.website_url ?? "");
          setLogoUrl(data.profile.logo_url ?? "");
          setContactEmail(data.profile.contact_email ?? "");
          setContactPhone(data.profile.contact_phone ?? "");
          setLinkedinUrl(data.profile.linkedin_url ?? "");
          setActivelyHiring(data.profile.actively_hiring ?? false);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/employers", {
      method: exists ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: companyName || null,
        company_description: description || null,
        website_url: website || null,
        logo_url: logoUrl || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        linkedin_url: linkedinUrl || null,
        actively_hiring: activelyHiring,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? tCommon("status.error"));
      return;
    }
    setExists(true);
    setMessage(tCommon("status.saved"));
  }

  if (loading) return <p className="text-muted">{tCommon("status.loading")}</p>;

  const preview = (
    <Card elevation="nested" className="space-y-4 p-5">
      <div className="flex flex-wrap items-start gap-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="h-16 w-16 rounded-md object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            {companyName || t("title")}
          </h2>
          {website ? (
            <a
              href={website}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm text-muted underline"
            >
              {website}
            </a>
          ) : null}
        </div>
      </div>
      {description ? (
        <p className="whitespace-pre-wrap text-muted">{description}</p>
      ) : (
        <p className="text-sm text-muted">{t("empty")}</p>
      )}
      {(contactEmail || contactPhone || linkedinUrl) && (
        <div className="border-t border-border pt-4 text-sm">
          <h3 className="mb-1 font-medium">{t("contactSection")}</h3>
          <p className="mb-3 text-muted">{t("contactHint")}</p>
          {contactEmail ? (
            <p>
              <span className="text-muted">{t("contactEmail")}: </span>
              {contactEmail}
            </p>
          ) : null}
          {contactPhone ? (
            <p>
              <span className="text-muted">{t("contactPhone")}: </span>
              {contactPhone}
            </p>
          ) : null}
          {linkedinUrl ? (
            <p>
              <span className="text-muted">{t("linkedinUrl")}: </span>
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {linkedinUrl}
              </a>
            </p>
          ) : null}
        </div>
      )}
    </Card>
  );

  const editor = (
    <form onSubmit={onSave} className="space-y-6">
      <Card elevation="nested" className="space-y-4 p-5">
        <Field label={t("companyName")}>
          <input
            className={inputClassName}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />
        </Field>
        <Field label={t("companyDescription")}>
          <textarea
            className={inputClassName}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field label={t("website")}>
          <input
            className={inputClassName}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </Field>
        <Field label={t("logoUrl")}>
          <input
            className={inputClassName}
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />
        </Field>
        <Field label={t("activelyHiring")}>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={activelyHiring}
              onChange={(e) => setActivelyHiring(e.target.checked)}
              className="size-4 rounded border-border"
            />
            <span>{t("activelyHiringHint")}</span>
          </label>
        </Field>
        <div className="space-y-3 border-t border-border pt-4">
          <div>
            <h3 className="font-medium">{t("contactSection")}</h3>
            <p className="mt-1 text-sm text-muted">{t("contactHint")}</p>
          </div>
          <Field label={t("contactEmail")}>
            <input
              type="email"
              className={inputClassName}
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </Field>
          <Field label={t("contactPhone")}>
            <input
              type="tel"
              className={inputClassName}
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </Field>
          <Field label={t("linkedinUrl")}>
            <input
              type="url"
              className={inputClassName}
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://www.linkedin.com/in/…"
            />
          </Field>
        </div>
      </Card>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}
      <Button type="submit" disabled={saving}>
        {saving
          ? tCommon("status.loading")
          : exists
            ? t("updateCta")
            : t("createCta")}
      </Button>
    </form>
  );

  return (
    <PageSection>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <Button asChild variant="secondary">
            <Link href="/workers">{tCommon("nav.hire")}</Link>
          </Button>
        }
      />
      <FormModeTabs
        mode={mode}
        onChange={setMode}
        previewLabel={tCommon("actions.preview")}
        editLabel={tCommon("actions.edit")}
      />
      {mode === "preview" ? preview : editor}
      <EmployerJobsPanel enabled={exists} />
      <FavouritesPanel />
    </PageSection>
  );
}
