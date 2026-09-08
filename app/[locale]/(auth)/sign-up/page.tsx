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
  isValidCity,
  isValidDistrict,
} from "@/lib/locations/uk-locations";
import {
  clearFieldError,
  focusFirstInvalidField,
  hasFieldErrors,
  isValidEmail,
  isValidPhone,
  isValidUsername,
} from "@/lib/validation/fields";

type FieldKey =
  | "email"
  | "username"
  | "phone"
  | "city"
  | "district"
  | "password"
  | "confirmPassword";

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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>(
    {}
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const districtOptions = useMemo(() => getDistrictsForCity(city), [city]);

  function clearField(key: FieldKey) {
    setFieldErrors((prev) => clearFieldError(prev, key));
  }

  function validate(): Partial<Record<FieldKey, string>> {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!email.trim()) next.email = t("emailRequired");
    else if (!isValidEmail(email)) next.email = tCommon("validation.email");

    if (username.trim() && !isValidUsername(username)) {
      next.username = t("usernameInvalid");
    }

    if (!phone.trim()) next.phone = t("phoneRequired");
    else if (!isValidPhone(phone)) next.phone = t("phoneInvalid");

    if (!city) next.city = t("cityRequired");
    else if (!isValidCity(city)) next.city = t("cityInvalid");

    if (!district) next.district = t("districtRequired");
    else if (city && !isValidDistrict(city, district)) {
      next.district = t("districtInvalid");
    }

    if (!password) next.password = t("passwordRequired");
    else if (password.length < 8) next.password = t("passwordTooShort");

    if (!confirmPassword) next.confirmPassword = t("passwordRequired");
    else if (password !== confirmPassword) {
      next.confirmPassword = t("passwordMismatch");
    }

    return next;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const next = validate();
    setFieldErrors(next);
    if (hasFieldErrors(next)) {
      setError(tCommon("validation.fixHighlighted"));
      focusFirstInvalidField();
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
        setFieldErrors({ username: t("usernameTaken") });
        setError(t("usernameTaken"));
        focusFirstInvalidField();
        return;
      }
      if (res.status === 409) {
        setFieldErrors({ email: t("emailTaken") });
        setError(t("emailTaken"));
        focusFirstInvalidField();
        return;
      }
      if (data.error === "Please select a valid city") {
        setFieldErrors({ city: t("cityInvalid") });
        setError(tCommon("validation.fixHighlighted"));
        focusFirstInvalidField();
        return;
      }
      if (typeof data.error === "string" && data.error.includes("district")) {
        setFieldErrors({ district: t("districtInvalid") });
        setError(tCommon("validation.fixHighlighted"));
        focusFirstInvalidField();
        return;
      }
      setError(data.error ?? tCommon("status.error"));
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
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Field label={t("email")} error={fieldErrors.email}>
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
            label={t("username")}
            hint={t("usernameHint")}
            error={fieldErrors.username}
          >
            <input
              className={inputClassName}
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                clearField("username");
              }}
            />
          </Field>
          <Field label={t("phone")} error={fieldErrors.phone}>
            <input
              className={inputClassName}
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                clearField("phone");
              }}
            />
          </Field>
          <Combobox
            label={t("city")}
            placeholder={t("selectCity")}
            value={city}
            onChange={(nextCity) => {
              setCity(nextCity);
              setDistrict("");
              clearField("city");
              clearField("district");
            }}
            options={UK_CITIES}
            required
            error={fieldErrors.city}
          />
          <Combobox
            label={t("district")}
            placeholder={city ? t("selectDistrict") : t("selectCityFirst")}
            value={district}
            onChange={(nextDistrict) => {
              setDistrict(nextDistrict);
              clearField("district");
            }}
            options={districtOptions}
            disabled={!city}
            required
            error={fieldErrors.district}
          />
          <Field label={t("password")} error={fieldErrors.password}>
            <input
              className={inputClassName}
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearField("password");
              }}
            />
          </Field>
          <Field label={t("confirmPassword")} error={fieldErrors.confirmPassword}>
            <input
              className={inputClassName}
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearField("confirmPassword");
              }}
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
