"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import { useSession } from "next-auth/react";
import {
  buttonPrimaryClassName,
  buttonSecondaryClassName,
} from "@/components/ui/forms";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { canViewContactInfo, type Tier } from "@/lib/entitlements";
import { track } from "@/lib/analytics/track";

type ContactPayload = {
  email: string;
  phone: string | null;
  linkedinUrl?: string | null;
  companyName?: string | null;
};

type Props =
  | { target: "job"; jobId: number }
  | { target: "worker"; workerId: number; jobId?: number | null };

export function ContactReveal(props: Props) {
  const t = useTranslations("billing");
  const { data: session, status } = useSession();
  const [contact, setContact] = useState<ContactPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (status === "loading") {
    return <p className="text-sm text-muted">{t("loadingContact")}</p>;
  }

  if (!session?.user) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-surface p-5">
        <p className="text-sm text-muted">{t("signInToContact")}</p>
        <Link href="/sign-in" className={buttonPrimaryClassName}>
          {t("signIn")}
        </Link>
      </div>
    );
  }

  const tier = session.user.tier as Tier;
  if (!canViewContactInfo(tier)) {
    return (
      <UpgradePrompt
        description={t("contactLocked")}
        requiredTier="basic"
      />
    );
  }

  if (!session.user.isEmailVerified) {
    return (
      <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted">
        {t("verifyEmailFirst")}
      </p>
    );
  }

  async function reveal() {
    setLoading(true);
    setError(null);
    try {
      const body =
        props.target === "job"
          ? { target: "job", jobId: props.jobId }
          : {
              target: "worker",
              workerId: props.workerId,
              jobId: props.jobId ?? null,
            };

      const res = await fetch("/api/contacts/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("revealFailed"));
        return;
      }
      setContact(data as ContactPayload);
      track("contact_reveal", { target: props.target });
    } catch {
      setError(t("revealFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (contact) {
    return (
      <div className="space-y-2 rounded-lg border border-border bg-surface p-5">
        <h2 className="font-medium">{t("contactDetails")}</h2>
        {contact.companyName ? (
          <p className="text-sm text-muted">{contact.companyName}</p>
        ) : null}
        <p className="text-sm">
          <span className="text-muted">{t("email")}: </span>
          <a className="text-muted underline" href={`mailto:${contact.email}`}>
            {contact.email}
          </a>
        </p>
        {contact.phone ? (
          <p className="text-sm">
            <span className="text-muted">{t("phone")}: </span>
            <a className="text-muted underline" href={`tel:${contact.phone}`}>
              {contact.phone}
            </a>
          </p>
        ) : (
          <p className="text-sm text-muted">{t("noPhone")}</p>
        )}
        {contact.linkedinUrl ? (
          <p className="text-sm">
            <span className="text-muted">{t("linkedin")}: </span>
            <a
              className="text-muted underline"
              href={contact.linkedinUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t("linkedinProfile")}
            </a>
          </p>
        ) : (
          <p className="text-sm text-muted">{t("noLinkedin")}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-5">
      <h2 className="font-medium">{t("contactTitle")}</h2>
      <p className="text-sm text-muted">{t("contactHint")}</p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        className={buttonSecondaryClassName}
        disabled={loading}
        onClick={() => void reveal()}
      >
        {loading ? t("revealing") : t("revealContact")}
      </button>
      <p className="text-xs text-muted">
        {t("currentPlan")}: {t(`tiers.${tier}`)} ·{" "}
        <Link href="/billing" className="underline">
          {t("manageBilling")}
        </Link>
      </p>
    </div>
  );
}
