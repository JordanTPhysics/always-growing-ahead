"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/forms";
import type { NewsExcerpt } from "@/lib/db/types";

type FormState = {
  body_en: string;
  body_ar: string;
  body_ckb: string;
  sort_order: string;
  is_published: boolean;
};

const emptyForm = (): FormState => ({
  body_en: "",
  body_ar: "",
  body_ckb: "",
  sort_order: "0",
  is_published: true,
});

function fromExcerpt(excerpt: NewsExcerpt): FormState {
  return {
    body_en: excerpt.body_en,
    body_ar: excerpt.body_ar ?? "",
    body_ckb: excerpt.body_ckb ?? "",
    sort_order: String(excerpt.sort_order),
    is_published: excerpt.is_published,
  };
}

export function AdminNewsPanel() {
  const t = useTranslations("admin.news");
  const [excerpts, setExcerpts] = useState<NewsExcerpt[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin/news");
    const data = await response.json();
    setExcerpts(data.excerpts ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    setError(null);
  }

  function startEdit(excerpt: NewsExcerpt) {
    setEditingId(excerpt.id);
    setForm(fromExcerpt(excerpt));
    setShowForm(true);
    setError(null);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
  }

  async function save() {
    if (!form.body_en.trim()) {
      setError(t("bodyRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        body_en: form.body_en,
        body_ar: form.body_ar || null,
        body_ckb: form.body_ckb || null,
        sort_order: Number(form.sort_order) || 0,
        is_published: form.is_published,
      };

      const response = await fetch(
        editingId ? `/api/admin/news/${editingId}` : "/api/admin/news",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      cancelForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    const response = await fetch(`/api/admin/news/${id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setExcerpts((current) => current.filter((item) => item.id !== id));
      if (editingId === id) cancelForm();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{t("heading")}</h2>
          <p className="mt-1 text-sm text-muted">{t("hint")}</p>
        </div>
        {!showForm ? (
          <Button type="button" onClick={startCreate}>
            {t("add")}
          </Button>
        ) : null}
      </div>

      {showForm ? (
        <Card elevation="nested" className="space-y-4 p-5">
          <h3 className="font-semibold">
            {editingId ? t("edit") : t("add")}
          </h3>
          <Field label={t("bodyEn")}>
            <textarea
              className={inputClassName}
              rows={2}
              value={form.body_en}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  body_en: event.target.value,
                }))
              }
            />
          </Field>
          <Field label={t("bodyAr")}>
            <textarea
              className={inputClassName}
              rows={2}
              value={form.body_ar}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  body_ar: event.target.value,
                }))
              }
            />
          </Field>
          <Field label={t("bodyCkb")}>
            <textarea
              className={inputClassName}
              rows={2}
              value={form.body_ckb}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  body_ckb: event.target.value,
                }))
              }
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("sortOrder")}>
              <input
                className={inputClassName}
                type="number"
                value={form.sort_order}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sort_order: event.target.value,
                  }))
                }
              />
            </Field>
            <label className="flex items-center gap-2 pt-7 text-sm">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    is_published: event.target.checked,
                  }))
                }
              />
              {t("published")}
            </label>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? t("saving") : t("save")}
            </Button>
            <Button type="button" variant="secondary" onClick={cancelForm}>
              {t("cancel")}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="space-y-3">
        {excerpts.length === 0 ? (
          <p className="text-sm text-muted">{t("empty")}</p>
        ) : (
          excerpts.map((excerpt) => (
            <Card
              key={excerpt.id}
              elevation="nested"
              className="flex flex-wrap items-start justify-between gap-3 p-4"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm">{excerpt.body_en}</p>
                <p className="text-xs text-muted">
                  {t("sortOrder")}: {excerpt.sort_order}
                  {" · "}
                  {excerpt.is_published ? t("published") : t("unpublished")}
                </p>
              </div>
              <span className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => startEdit(excerpt)}
                >
                  {t("edit")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void remove(excerpt.id)}
                >
                  {t("delete")}
                </Button>
              </span>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
