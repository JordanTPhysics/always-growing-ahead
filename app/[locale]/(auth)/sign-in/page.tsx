"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { Field, PageHeader, inputClassName } from "@/components/ui/forms";
import { Button } from "@/components/ui/button";
import { PageSection } from "@/components/ui/card";
import {
  clearFieldError,
  focusFirstInvalidField,
  hasFieldErrors,
  isValidEmail,
} from "@/lib/validation/fields";

type FieldKey = "email" | "password";

export default function SignInPage() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>(
    {}
  );
  const [credentialsInvalid, setCredentialsInvalid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  function clearField(key: FieldKey) {
    setCredentialsInvalid(false);
    setFieldErrors((prev) => clearFieldError(prev, key));
  }

  function validate(): Partial<Record<FieldKey, string>> {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!email.trim()) next.email = t("emailRequired");
    else if (!isValidEmail(email)) next.email = tCommon("validation.email");
    if (!password) next.password = t("passwordRequired");
    return next;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCredentialsInvalid(false);
    const next = validate();
    setFieldErrors(next);
    if (hasFieldErrors(next)) {
      setError(tCommon("validation.fixHighlighted"));
      focusFirstInvalidField();
      return;
    }

    setPending(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setPending(false);
    if (result?.error) {
      setCredentialsInvalid(true);
      setError(t("invalidCredentials"));
      focusFirstInvalidField();
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md">
      <PageSection>
        <PageHeader title={t("signInTitle")} />
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Field
            label={t("email")}
            error={fieldErrors.email}
            invalid={credentialsInvalid}
          >
            <input
              className={inputClassName}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearField("email");
              }}
            />
          </Field>
          <Field
            label={t("password")}
            error={fieldErrors.password}
            invalid={credentialsInvalid}
          >
            <input
              className={inputClassName}
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearField("password");
              }}
            />
          </Field>
          <p className="-mt-2 text-sm">
            <Link href="/forgot-password" className="text-muted underline">
              {t("forgotPassword")}
            </Link>
          </p>
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
