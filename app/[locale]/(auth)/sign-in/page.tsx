"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/routing";
import {
  Field,
  PageHeader,
  buttonPrimaryClassName,
  buttonSecondaryClassName,
  inputClassName,
} from "@/components/ui/forms";

export default function SignInPage() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
      <PageHeader title={t("signInTitle")} />
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-surface p-6">
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
        <button type="submit" className={buttonPrimaryClassName} disabled={pending}>
          {pending ? tCommon("status.loading") : t("submitSignIn")}
        </button>
        <button
          type="button"
          className={buttonSecondaryClassName + " w-full"}
          onClick={() => signIn("google")}
        >
          {t("google")}
        </button>
        <p className="text-sm text-muted">
          {t("noAccount")}{" "}
          <Link href="/sign-up" className="text-muted underline">
            {t("submitSignUp")}
          </Link>
        </p>
      </form>
    </div>
  );
}
