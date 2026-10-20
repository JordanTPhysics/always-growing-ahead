"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/forms";
import type { SponsoredItemRecord } from "@/lib/db/types";
import { captureOrPickImage } from "@/lib/native/camera";
import { isSafeArticleUrl } from "@/lib/news/article-url";

type FormState = {
  tagline: string;
  href: string;
  image_url: string;
};

function fromItem(item: SponsoredItemRecord): FormState {
  return {
    tagline: item.tagline,
    href: item.href,
    image_url: item.image_url,
  };
}

export function AdminSponsoredPanel() {
  const t = useTranslations("admin.sponsored");
  const [items, setItems] = useState<SponsoredItemRecord[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/sponsored");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setLoadError(data.error ?? t("loadFailed"));
      return;
    }
    setLoadError(null);
    setItems(data.items ?? []);
    setLoaded(true);
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(item: SponsoredItemRecord) {
    setEditingId(item.id);
    setForm(fromItem(item));
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(null);
    setError(null);
  }

  async function changePicture() {
    if (!form) return;
    setUploading(true);
    setError(null);
    try {
      const image = await captureOrPickImage();
      if (!image) return;
      const response = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataUrl: image.dataUrl,
          folder: "sponsored",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? t("uploadFailed"));
        return;
      }
      setForm((current) =>
        current ? { ...current, image_url: data.url } : current
      );
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function save(id: number) {
    if (!form) return;
    if (!form.tagline.trim()) {
      setError(t("taglineRequired"));
      return;
    }
    if (!isSafeArticleUrl(form.href)) {
      setError(t("linkInvalid"));
      return;
    }
    if (!form.image_url.trim() || !isSafeArticleUrl(form.image_url)) {
      setError(t("pictureInvalid"));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/sponsored/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagline: form.tagline,
          href: form.href.trim(),
          image_url: form.image_url.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? t("saveFailed"));
        return;
      }
      setItems((current) =>
        current.map((item) => (item.id === id ? data.item : item))
      );
      cancelEdit();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{t("heading")}</h2>
        <p className="mt-1 text-sm text-muted">{t("hint")}</p>
      </div>

      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}

      <div className="space-y-3">
        {loaded && items.length === 0 && !loadError ? (
          <p className="text-sm text-muted">{t("empty")}</p>
        ) : (
          items.map((item) => {
            const isEditing = editingId === item.id && form;
            return (
              <Card key={item.id} elevation="nested" className="space-y-4 p-4">
                {isEditing ? (
                  <>
                    <Field label={t("picture")}>
                      <div className="flex flex-wrap items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={form.image_url}
                          alt=""
                          className="h-16 w-40 rounded-md object-cover"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={uploading || saving}
                          onClick={() => void changePicture()}
                        >
                          {uploading ? t("uploading") : t("changePicture")}
                        </Button>
                      </div>
                    </Field>
                    <Field label={t("tagline")}>
                      <input
                        className={inputClassName}
                        value={form.tagline}
                        onChange={(event) =>
                          setForm((current) =>
                            current
                              ? { ...current, tagline: event.target.value }
                              : current
                          )
                        }
                      />
                    </Field>
                    <Field label={t("link")} hint={t("linkHint")}>
                      <input
                        className={inputClassName}
                        type="text"
                        inputMode="url"
                        placeholder="https://"
                        value={form.href}
                        onChange={(event) =>
                          setForm((current) =>
                            current
                              ? { ...current, href: event.target.value }
                              : current
                          )
                        }
                      />
                    </Field>
                    {error ? <p className="text-sm text-red-600">{error}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        disabled={saving || uploading}
                        onClick={() => void save(item.id)}
                      >
                        {saving ? t("saving") : t("save")}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={saving || uploading}
                        onClick={cancelEdit}
                      >
                        {t("cancel")}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image_url}
                        alt=""
                        className="h-14 w-28 shrink-0 rounded-md object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.tagline}</p>
                        <p className="truncate text-xs text-muted">{item.href}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => startEdit(item)}
                    >
                      {t("edit")}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
