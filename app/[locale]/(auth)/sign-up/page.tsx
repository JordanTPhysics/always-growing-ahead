"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type AbandonedRegistration = {
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  district: string | null;
  error: string;
  locale: string;
};

let abandonReportTimer: ReturnType<typeof setTimeout> | undefined;

function clip(value: string, max: number): string | null {
  const trimmed = value.trim().slice(0, max);
  return trimmed ? trimmed : null;
}

function describeErrors(
  fields: Partial<Record<FieldKey, string>>,
  fallback: string
): string {
  const messages = [
    ...new Set(Object.values(fields).filter((message): message is string => Boolean(message))),
  ];
  return (messages.length > 0 ? messages.join("; ") : fallback).slice(0, 2000);
}

function sendAbandonedRegistration(payload: AbandonedRegistration) {
  void fetch("/api/auth/registration-attempts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}

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
  const draftRef = useRef({ username, email, phone, city, district, locale });
  const blockingErrorRef = useRef<string | null>(null);
  const succeededRef = useRef(false);
  draftRef.current = { username, email, phone, city, district, locale };

  function rememberFailure(message: string) {
    if (succeededRef.current) return;
    blockingErrorRef.current = message.slice(0, 2000);
  }

  useEffect(() => {
    if (abandonReportTimer) {
      clearTimeout(abandonReportTimer);
      abandonReportTimer = undefined;
    }

    function flush() {
      const error = blockingErrorRef.current;
      if (!error || succeededRef.current) return;
      const draft = draftRef.current;
      const name = clip(draft.username, 100);
      const emailValue = clip(draft.email, 255);
      const phoneValue = clip(draft.phone, 100);
      if (!name && !emailValue && !phoneValue) return;
      blockingErrorRef.current = null;
      sendAbandonedRegistration({
        name,
        email: emailValue,
        phone: phoneValue,
        city: clip(draft.city, 100),
        district: clip(draft.district, 100),
        error,
        locale: draft.locale,
      });
    }

    function onPageHide(event: PageTransitionEvent) {
      if (event.persisted) return;
      flush();
    }

    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      abandonReportTimer = setTimeout(flush, 0);
    };
  }, []);

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
      rememberFailure(describeErrors(next, tCommon("validation.fixHighlighted")));
      focusFirstInvalidField();
      return;
    }

    setPending(true);
    try {
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
          rememberFailure(t("usernameTaken"));
          focusFirstInvalidField();
          return;
        }
        if (res.status === 409) {
          setFieldErrors({ email: t("emailTaken") });
          setError(t("emailTaken"));
          rememberFailure(t("emailTaken"));
          focusFirstInvalidField();
          return;
        }
        if (data.error === "Please select a valid city") {
          setFieldErrors({ city: t("cityInvalid") });
          setError(tCommon("validation.fixHighlighted"));
          rememberFailure(t("cityInvalid"));
          focusFirstInvalidField();
          return;
        }
        if (typeof data.error === "string" && data.error.includes("district")) {
          setFieldErrors({ district: t("districtInvalid") });
          setError(tCommon("validation.fixHighlighted"));
          rememberFailure(t("districtInvalid"));
          focusFirstInvalidField();
          return;
        }
        const message =
          typeof data.error === "string" ? data.error : tCommon("status.error");
        setError(message);
        rememberFailure(message);
        return;
      }
    } catch {
      setPending(false);
      const message = tCommon("status.error");
      setError(message);
      rememberFailure(message);
      return;
    }

    succeededRef.current = true;
    blockingErrorRef.current = null;
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
