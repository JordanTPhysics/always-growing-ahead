"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { Field, PageHeader, inputClassName } from "@/components/ui/forms";
import { Button } from "@/components/ui/button";
import { PageSection } from "@/components/ui/card";

export default function SignInPage() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setPending(false);
    if (result?.error) {
      setError(t("invalidCredentials"));
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md">
      <PageSection>
        <PageHeader title={t("signInTitle")} />
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
          <Field label={t("password")}>
            <input
              className={inputClassName}
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {resendMessage ? (
            <p className="text-sm text-muted">{resendMessage}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? tCommon("status.loading") : t("submitSignIn")}
          </Button>
          <button
            type="button"
            className="w-full text-sm text-muted underline"
            disabled={resendPending || !email.trim()}
            onClick={() => {
              void (async () => {
                setResendPending(true);
                setResendMessage(null);
                const res = await fetch("/api/auth/resend-verification", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email }),
                });
                setResendPending(false);
                setResendMessage(
                  res.ok ? t("resendSent") : t("resendFailed")
                );
              })();
            }}
          >
            {resendPending ? tCommon("status.loading") : t("resendEmail")}
          </button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => signIn("google")}
          >
            {t("google")}
          </Button>
          <p className="text-sm text-muted">
            {t("noAccount")}{" "}
            <Link href="/sign-up" className="text-muted underline">
              {t("submitSignUp")}
            </Link>
          </p>
        </form>
      </PageSection>
    </div>
  );
}
