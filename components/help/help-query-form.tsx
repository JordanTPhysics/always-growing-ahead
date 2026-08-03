"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/forms";

export type HelpQueryPrefill = {
  name: string;
  email: string;
  phone: string;
};

export function HelpQueryForm({ prefill }: { prefill: HelpQueryPrefill | null }) {
  const t = useTranslations("help");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [name, setName] = useState(prefill?.name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const isLoggedIn = Boolean(prefill?.email);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || null,
        email: email.trim(),
        phone: phone.trim() || null,
        message: message.trim(),
        locale,
      }),
    });

    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? tCommon("status.error"));
      return;
    }

    setSuccess(true);
    setMessage("");
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-text">{t("queryTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">{t("querySubtitle")}</p>
      </div>

      <Card elevation="nested" className="p-5">
        {success ? (
          <p className="text-sm text-text">{t("querySuccess")}</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("queryName")}>
                <input
                  className={inputClassName}
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label={t("queryEmail")}>
                <input
                  className={inputClassName}
                  type="email"
                  required
                  autoComplete="email"
                  readOnly={isLoggedIn}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            </div>
            <Field label={t("queryPhone")} hint={t("queryPhoneHint")}>
              <input
                className={inputClassName}
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field label={t("queryMessage")}>
              <textarea
                className={inputClassName}
                rows={5}
                required
                minLength={10}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("queryMessagePlaceholder")}
              />
            </Field>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? tCommon("status.loading") : t("querySubmit")}
            </Button>
          </form>
        )}
      </Card>
    </section>
  );
}
