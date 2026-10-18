"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { authSearchQuery, continuePath } from "@/lib/auth/continue-path";
import { Field, inputClassName } from "@/components/ui/forms";
import { Button } from "@/components/ui/button";
import {
  clearFieldError,
  focusFirstInvalidField,
  hasFieldErrors,
  isValidEmail,
  isValidPhone,
  isValidUsername,
  normalizeUkPostcode,
} from "@/lib/validation/fields";

type FieldKey =
  | "email"
  | "username"
  | "phone"
  | "postcode"
  | "password"
  | "confirmPassword";

type Step = "welcome" | "email" | "password" | "postcode" | "details";

const SLIDE_MS = 1200;
const WELCOME_HOLD_MS = 3000;

type AbandonedRegistration = {
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  district: string | null;
  postcode: string | null;
  error: string;
  locale: string;
};

let abandonReportTimer: ReturnType<typeof setTimeout> | undefined;

function EducationAccountNotice({ onClose }: { onClose: () => void }) {
  const t = useTranslations("auth");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="education-account-title"
        className="w-full max-w-md rounded-lg border border-border bg-surface p-6 text-text shadow-panel"
      >
        <h2 id="education-account-title" className="text-xl font-semibold">
          {t("educationAccountTitle")}
        </h2>
        <p className="mt-3 text-base">{t("educationAccountBody")}</p>
        <Button
          type="button"
          autoFocus
          className="mt-6 w-full"
          onClick={onClose}
        >
          {t("educationAccountAction")}
        </Button>
      </div>
    </div>
  );
}

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [educationNoticeOpen, setEducationNoticeOpen] = useState(false);
  const [step, setStep] = useState<Step>("welcome");
  const [motion, setMotion] = useState<"enter" | "exit">("enter");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [postcode, setPostcode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>(
    {}
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const draftRef = useRef({ username, email, phone, city, district, postcode, locale });
  const blockingErrorRef = useRef<string | null>(null);
  const succeededRef = useRef(false);
  const transitioning = useRef(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  draftRef.current = { username, email, phone, city, district, postcode, locale };
  const signInHref = `/sign-in${authSearchQuery(searchParams)}`;
  const destination = continuePath(
    {
      intent: searchParams.get("intent"),
      next: searchParams.get("next"),
    },
    "sign-up"
  );

  function rememberFailure(message: string) {
    if (succeededRef.current) return;
    blockingErrorRef.current = message.slice(0, 2000);
  }

  const showStep = useCallback((next: Step) => {
    if (transitionTimer.current) {
      clearTimeout(transitionTimer.current);
      transitionTimer.current = null;
    }
    transitioning.current = false;
    setMotion("enter");
    setStep(next);
  }, []);

  const beginTransition = useCallback((next: Step) => {
    if (transitioning.current) return;
    transitioning.current = true;
    setMotion("exit");
    transitionTimer.current = setTimeout(() => {
      transitionTimer.current = null;
      transitioning.current = false;
      setStep(next);
      setMotion("enter");
    }, SLIDE_MS);
  }, []);

  useEffect(() => {
    if (searchParams.get("notice") === "education") {
      setEducationNoticeOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (step !== "welcome" || educationNoticeOpen) return;
    const id = setTimeout(() => beginTransition("email"), WELCOME_HOLD_MS);
    return () => clearTimeout(id);
  }, [beginTransition, educationNoticeOpen, step]);

  useEffect(() => {
    return () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    };
  }, []);

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
        postcode: clip(draft.postcode, 10),
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
    setError(null);
  }

  function reject(next: Partial<Record<FieldKey, string>>) {
    setFieldErrors(next);
    setError(tCommon("validation.fixHighlighted"));
    rememberFailure(describeErrors(next, tCommon("validation.fixHighlighted")));
    focusFirstInvalidField();
  }

  function confirmEmail(event: React.FormEvent) {
    event.preventDefault();
    const next: Partial<Record<FieldKey, string>> = {};
    if (!email.trim()) next.email = t("emailRequired");
    else if (!isValidEmail(email)) next.email = tCommon("validation.email");
    if (hasFieldErrors(next)) {
      reject(next);
      return;
    }
    setFieldErrors({});
    setError(null);
    beginTransition("password");
  }

  function confirmPasswordStep(event: React.FormEvent) {
    event.preventDefault();
    const next: Partial<Record<FieldKey, string>> = {};
    if (!password) next.password = t("passwordRequired");
    else if (password.length < 8) next.password = t("passwordTooShort");
    if (!confirmPassword) next.confirmPassword = t("passwordRequired");
    else if (password !== confirmPassword) next.confirmPassword = t("passwordMismatch");
    if (hasFieldErrors(next)) {
      reject(next);
      return;
    }
    setFieldErrors({});
    setError(null);
    beginTransition("postcode");
  }

  async function confirmPostcode(event: React.FormEvent) {
    event.preventDefault();
    const normalized = normalizeUkPostcode(postcode);
    if (!postcode.trim()) {
      reject({ postcode: t("postcodeRequired") });
      return;
    }
    if (!normalized) {
      reject({ postcode: t("postcodeInvalid") });
      return;
    }
    setPostcode(normalized);
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/postcodes?resolve=1&q=${encodeURIComponent(normalized)}`
      );
      const data = await res.json().catch(() => ({}));
      const foundCity = typeof data.result?.city === "string" ? data.result.city.trim() : "";
      const foundDistrict =
        typeof data.result?.district === "string" ? data.result.district.trim() : "";
      if (!res.ok || !foundCity) {
        setPending(false);
        reject({ postcode: t("postcodeNotFound") });
        return;
      }
      const resolvedPostcode =
        typeof data.result?.postcode === "string" && data.result.postcode.trim()
          ? data.result.postcode.trim()
          : normalized;
      setCity(foundCity);
      setDistrict(foundDistrict || foundCity);
      setPostcode(resolvedPostcode);
      setFieldErrors({});
      setPending(false);
      beginTransition("details");
    } catch {
      setPending(false);
      reject({ postcode: t("postcodeNotFound") });
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const next: Partial<Record<FieldKey, string>> = {};
    if (phone.trim() && !isValidPhone(phone)) next.phone = t("phoneInvalid");
    if (username.trim() && !isValidUsername(username)) next.username = t("usernameInvalid");
    if (!city.trim() || !district.trim()) next.postcode = t("postcodeNotFound");
    if (hasFieldErrors(next)) {
      reject(next);
      if (next.postcode) showStep("postcode");
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
          phone: phone.trim() || null,
          city: city.trim(),
          district: district.trim(),
          postcode,
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
          showStep("email");
          focusFirstInvalidField();
          return;
        }
        if (data.error === "Enter a valid UK postcode") {
          setFieldErrors({ postcode: t("postcodeInvalid") });
          setError(tCommon("validation.fixHighlighted"));
          rememberFailure(t("postcodeInvalid"));
          showStep("postcode");
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
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (result?.error) {
      setPending(false);
      router.push(signInHref);
      return;
    }
    router.push(destination);
    router.refresh();
  }

  const motionClass =
    step === "welcome" && motion === "enter"
      ? undefined
      : motion === "exit"
        ? "auth-step-exit-left"
        : "auth-step-enter";
  const busy = pending || motion === "exit";

  let stepContent: React.ReactNode;
  if (step === "welcome") {
    stepContent = (
      <div className="py-8 text-center sm:py-12">
        <h1 className="auth-line-in text-balance break-words text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
          {t("welcomeTitle")}
        </h1>
        <p className="auth-line-in auth-line-in-delay mt-4 text-balance break-words text-2xl text-white/85 sm:text-3xl">
          {t("welcomeSubtitle")}
        </p>
      </div>
    );
  } else if (step === "email") {
    stepContent = (
      <form onSubmit={confirmEmail} noValidate className="space-y-4">
        <Field label={t("email")} error={fieldErrors.email} inverted>
          <input
            className={inputClassName}
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearField("email");
            }}
          />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {tCommon("actions.continue")}
        </Button>
      </form>
    );
  } else if (step === "password") {
    stepContent = (
      <form onSubmit={confirmPasswordStep} noValidate className="space-y-4">
        <Field label={t("password")} error={fieldErrors.password} inverted>
          <input
            className={inputClassName}
            type="password"
            required
            autoFocus
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearField("password");
            }}
          />
        </Field>
        <Field label={t("confirmPassword")} error={fieldErrors.confirmPassword} inverted>
          <input
            className={inputClassName}
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              clearField("confirmPassword");
            }}
          />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {tCommon("actions.continue")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full text-white hover:bg-white/10 hover:text-white"
          disabled={busy}
          onClick={() => beginTransition("email")}
        >
          {tCommon("actions.back")}
        </Button>
      </form>
    );
  } else if (step === "postcode") {
    stepContent = (
      <form onSubmit={(event) => void confirmPostcode(event)} noValidate className="space-y-4">
        <Field label={t("postcode")} error={fieldErrors.postcode} inverted>
          <input
            className={inputClassName}
            type="text"
            required
            autoFocus
            autoComplete="postal-code"
            maxLength={10}
            value={postcode}
            onChange={(event) => {
              setPostcode(event.target.value);
              clearField("postcode");
            }}
          />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {pending ? tCommon("status.loading") : tCommon("actions.continue")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full text-white hover:bg-white/10 hover:text-white"
          disabled={busy}
          onClick={() => beginTransition("password")}
        >
          {tCommon("actions.back")}
        </Button>
      </form>
    );
  } else {
    stepContent = (
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-4">
        <div>
          <p className="text-lg text-white/75">{t("city")}</p>
          <p className="break-words text-3xl font-semibold leading-tight text-white">{city}</p>
          <p className="mt-4 text-lg text-white/75">{t("district")}</p>
          <p className="break-words text-3xl font-semibold leading-tight text-white">{district}</p>
        </div>
        <Field label={t("phone")} hint={t("phoneOptional")} error={fieldErrors.phone} inverted>
          <input
            className={inputClassName}
            type="tel"
            autoFocus
            autoComplete="tel"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              clearField("phone");
            }}
          />
        </Field>
        <Field label={t("username")} hint={t("usernameHint")} error={fieldErrors.username} inverted>
          <input
            className={inputClassName}
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              clearField("username");
            }}
          />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {pending ? tCommon("status.loading") : t("submitSignUp")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full text-white hover:bg-white/10 hover:text-white"
          disabled={busy}
          onClick={() => beginTransition("postcode")}
        >
          {tCommon("actions.back")}
        </Button>
      </form>
    );
  }

  return (
    <div className="auth-on-background mx-auto flex w-full min-w-0 max-w-lg flex-1 flex-col justify-center overflow-x-hidden px-1 py-6 sm:px-2 sm:py-10">
      <div className="overflow-x-hidden">
        <div key={step} className={motionClass}>
          {stepContent}
        </div>
      </div>
      <p className="mt-8 text-center text-base text-white/80">
        {t("hasAccount")}{" "}
        <Link href={signInHref} className="text-white underline">
          {t("submitSignIn")}
        </Link>
      </p>
      {educationNoticeOpen ? (
        <EducationAccountNotice onClose={() => setEducationNoticeOpen(false)} />
      ) : null}
    </div>
  );
}
