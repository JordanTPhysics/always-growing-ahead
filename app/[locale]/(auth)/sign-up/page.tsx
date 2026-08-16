"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Field, PageHeader, inputClassName } from "@/components/ui/forms";
import { Button } from "@/components/ui/button";
import { PageSection } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import {
  UK_CITIES,
  getDistrictsForCity,
} from "@/lib/locations/uk-locations";

export default function SignUpPage() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const districtOptions = useMemo(() => getDistrictsForCity(city), [city]);

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
    if (!phone.trim()) {
      setError(t("phoneRequired"));
      return;
    }
    if (!city) {
      setError(t("cityRequired"));
      return;
    }
    if (!district) {
      setError(t("districtRequired"));
      return;
    }

    setPending(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        username: username.trim() || null,
        password,
        phone: phone.trim(),
        city,
        district,
        preferredLocale: locale,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPending(false);
      if (res.status === 409 && data.error === "Username already taken") {
        setError(t("usernameTaken"));
        return;
      }
      setError(
        res.status === 409 ? t("emailTaken") : data.error ?? tCommon("status.error")
      );
      return;
    }

    setPending(false);
    setCheckEmail(true);
  }

  async function onResend() {
    setResendPending(true);
    setResendMessage(null);
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setResendPending(false);
    setResendMessage(res.ok ? t("resendSent") : t("resendFailed"));
  }

  if (checkEmail) {
    return (
      <div className="mx-auto max-w-md">
        <PageSection>
          <PageHeader
            title={t("checkEmailTitle")}
            subtitle={t("checkEmailBody")}
          />
          {resendMessage ? (
            <p className="mb-3 text-sm text-muted">{resendMessage}</p>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={resendPending}
            onClick={() => void onResend()}
          >
            {resendPending ? tCommon("status.loading") : t("resendEmail")}
          </Button>
          <p className="mt-4 text-sm text-muted">
            <Link href="/sign-in" className="text-muted underline">
              {t("submitSignIn")}
            </Link>
          </p>
        </PageSection>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <PageSection>
        <PageHeader title={t("signUpTitle")} subtitle={t("signUpSubtitle")} />
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
          <Field label={t("username")} hint={t("usernameHint")}>
            <input
              className={inputClassName}
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field label={t("phone")}>
            <input
              className={inputClassName}
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Combobox
            label={t("city")}
            placeholder={t("selectCity")}
            value={city}
            onChange={(nextCity) => {
              setCity(nextCity);
              setDistrict("");
            }}
            options={UK_CITIES}
            required
          />
          <Combobox
            label={t("district")}
            placeholder={city ? t("selectDistrict") : t("selectCityFirst")}
            value={district}
            onChange={setDistrict}
            options={districtOptions}
            disabled={!city}
            required
          />
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
            {pending ? tCommon("status.loading") : t("submitSignUp")}
          </Button>
          <p className="text-sm text-muted">
            {t("hasAccount")}{" "}
            <Link href="/sign-in" className="text-muted underline">
              {t("submitSignIn")}
            </Link>
          </p>
        </form>
      </PageSection>
    </div>
  );
}
