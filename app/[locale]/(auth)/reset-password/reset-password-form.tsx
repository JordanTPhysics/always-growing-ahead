"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Field, PageHeader, inputClassName } from "@/components/ui/forms";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setPending(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(
        data.error === "expired"
          ? t("resetExpiredBody")
          : t("resetInvalidBody")
      );
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <>
        <PageHeader
          title={t("resetPasswordSuccessTitle")}
          subtitle={t("resetPasswordSuccessBody")}
        />
        <Button asChild className="w-full">
          <Link href="/sign-in">{t("submitSignIn")}</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t("resetPasswordTitle")} />
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t("password")}>
          <input
            className={inputClassName}
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label={t("confirmPassword")}>
          <input
            className={inputClassName}
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? tCommon("status.loading") : t("resetPasswordSubmit")}
        </Button>
      </form>
    </>
  );
}
