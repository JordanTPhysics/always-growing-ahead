"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/forms";

export function AdminTranslationsPanel() {
  const t = useTranslations("admin.translations");
  const [locales, setLocales] = useState<string[]>([]);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [locale, setLocale] = useState("en");
  const [namespace, setNamespace] = useState("common");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/translations")
      .then((response) => response.json())
      .then((data) => {
        setLocales(data.locales ?? []);
        setNamespaces(data.namespaces ?? []);
        if (data.locales?.[0]) setLocale(data.locales[0]);
        if (data.namespaces?.[0]) setNamespace(data.namespaces[0]);
      });
  }, []);

  useEffect(() => {
    if (!locales.length || !namespaces.length) return;

    let cancelled = false;
    setStatus(null);
    setError(null);

    void fetch(
      `/api/admin/translations?locale=${encodeURIComponent(locale)}&namespace=${encodeURIComponent(namespace)}`
    )
      .then(async (response) => {
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setError(data.error ?? t("loadError"));
          setContent("");
          return;
        }
        setContent(data.content ?? "");
      })
      .catch(() => {
        if (!cancelled) {
          setError(t("loadError"));
          setContent("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [locale, namespace, locales.length, namespaces.length, t]);

  async function loadFile() {
    setStatus(null);
    setError(null);
    const response = await fetch(
      `/api/admin/translations?locale=${encodeURIComponent(locale)}&namespace=${encodeURIComponent(namespace)}`
    );
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? t("loadError"));
      setContent("");
      return;
    }
    setContent(data.content ?? "");
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      JSON.parse(content);
    } catch {
      setError(t("invalidJson"));
      setSaving(false);
      return;
    }

    const response = await fetch("/api/admin/translations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, namespace, content }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? t("saveError"));
      return;
    }
    setStatus(t("saved"));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t("heading")}</h2>
        <p className="mt-1 text-sm text-muted">{t("hint")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("locale")}>
          <select
            className={inputClassName}
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
          >
            {locales.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("namespace")}>
          <select
            className={inputClassName}
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
          >
            {namespaces.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label={t("content")}>
        <textarea
          className={`${inputClassName} min-h-[24rem] font-mono text-sm`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
        />
      </Field>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {status ? <p className="text-sm text-muted">{status}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => void loadFile()}>
          {t("load")}
        </Button>
        <Button
          type="button"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
