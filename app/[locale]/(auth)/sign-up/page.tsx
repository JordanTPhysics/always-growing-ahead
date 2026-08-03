"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/routing";
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
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
    router.push("/worker/profile");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md">
      <PageSection>
        <PageHeader title={t("signUpTitle")} subtitle={t("devNote")} />
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
