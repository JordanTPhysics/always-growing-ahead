"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Field, PageHeader, inputClassName } from "@/components/ui/forms";
import { Button } from "@/components/ui/button";
import { PageSection } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setPending(false);
    if (!res.ok) {
      setError(t("forgotPasswordFailed"));
      return;
    }
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-md">
      <PageSection>
        {sent ? (
          <>
            <PageHeader
              title={t("checkEmailTitle")}
              subtitle={t("forgotPasswordSent")}
            />
            <p className="text-sm text-muted">
              <Link href="/sign-in" className="text-muted underline">
                {t("submitSignIn")}
              </Link>
            </p>
          </>
        ) : (
          <>
            <PageHeader
              title={t("forgotPasswordTitle")}
              subtitle={t("forgotPasswordSubtitle")}
            />
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label={t("email")}>
                <input
                  className={inputClassName}
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? tCommon("status.loading") : t("forgotPasswordSubmit")}
              </Button>
              <p className="text-sm text-muted">
                <Link href="/sign-in" className="text-muted underline">
                  {t("submitSignIn")}
                </Link>
              </p>
            </form>
          </>
        )}
      </PageSection>
    </div>
  );
}
