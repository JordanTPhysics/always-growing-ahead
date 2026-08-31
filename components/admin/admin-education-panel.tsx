"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/forms";
import type { EducationMediaType, EducationResource } from "@/lib/db/types";
import { EDUCATION_MEDIA_TYPES } from "@/lib/education/media-types";

type FormState = {
  topic: string;
  title_en: string;
  title_ar: string;
  title_ckb: string;
  description_en: string;
  description_ar: string;
  description_ckb: string;
  sort_order: string;
  is_published: boolean;
  file_url: string;
  file_name: string;
  mime_type: string;
  byte_size: number;
  media_type: EducationMediaType | "";
};

const emptyForm = (): FormState => ({
  topic: "",
  title_en: "",
  title_ar: "",
  title_ckb: "",
  description_en: "",
  description_ar: "",
  description_ckb: "",
  sort_order: "0",
  is_published: true,
  file_url: "",
  file_name: "",
  mime_type: "",
  byte_size: 0,
  media_type: "",
});

const API_TIMEOUT_MS = 30_000;
const FILE_TIMEOUT_MS = 60 * 60 * 1000;

async function fetchTimed(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function readBody(
  response: Response
): Promise<{ error?: string; [key: string]: unknown }> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as { error?: string };
  } catch {
    return {};
  }
}

function messageFromError(
  err: unknown,
  timedOut: string,
  network: string
): string {
  if (err instanceof DOMException && err.name === "AbortError") return timedOut;
  if (err instanceof TypeError) return network;
  if (err instanceof Error && err.message) return err.message;
  return network;
}

function putWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress: (percent: number) => void,
  timeoutMs: number
): Promise<{ ok: boolean; status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.timeout = timeoutMs;
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => {
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        text: xhr.responseText,
      });
    };
    xhr.onerror = () => reject(new TypeError("Network error"));
    xhr.ontimeout = () =>
      reject(new DOMException("The operation was aborted.", "AbortError"));
    xhr.onabort = () =>
      reject(new DOMException("The operation was aborted.", "AbortError"));
    xhr.send(file);
  });
}

function fromResource(resource: EducationResource): FormState {
  return {
    topic: resource.topic,
    title_en: resource.title_en,
    title_ar: resource.title_ar ?? "",
    title_ckb: resource.title_ckb ?? "",
    description_en: resource.description_en ?? "",
    description_ar: resource.description_ar ?? "",
    description_ckb: resource.description_ckb ?? "",
    sort_order: String(resource.sort_order),
    is_published: resource.is_published,
    file_url: resource.file_url,
    file_name: resource.file_name,
    mime_type: resource.mime_type,
    byte_size: resource.byte_size,
    media_type: resource.media_type,
  };
}

export function AdminEducationPanel() {
  const t = useTranslations("admin.education");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resources, setResources] = useState<EducationResource[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function load() {
    const response = await fetchTimed("/api/admin/education", {}, API_TIMEOUT_MS);
    const data = await readBody(response);
    if (!response.ok) {
      throw new Error(
        typeof data.error === "string" ? data.error : t("loadFailed")
      );
    }
    setResources((data.resources as EducationResource[] | undefined) ?? []);
  }

  useEffect(() => {
    void load().catch((err: unknown) => {
      setError(messageFromError(err, t("timedOut"), t("loadFailed")));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    setError(null);
    setStatus(null);
    setUploadPercent(0);
  }

  function startEdit(resource: EducationResource) {
    setEditingId(resource.id);
    setForm(fromResource(resource));
    setShowForm(true);
    setError(null);
    setStatus(null);
    setUploadPercent(0);
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  function cancelForm() {
    resetForm();
    setError(null);
    setStatus(null);
    setUploadPercent(0);
  }

  async function onFileChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setUploading(true);
    setUploadPercent(0);
    setError(null);
    setStatus(t("uploading"));
    try {
      const init = await fetchTimed(
        "/api/admin/uploads",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            byteSize: file.size,
          }),
        },
        API_TIMEOUT_MS
      );
      const data = await readBody(init);
      if (!init.ok) {
        setStatus(null);
        setError(
          typeof data.error === "string" ? data.error : t("uploadFailed")
        );
        return;
      }
      const uploadUrl = data.uploadUrl;
      if (typeof uploadUrl === "string" && uploadUrl) {
        const put = await putWithProgress(
          uploadUrl,
          file,
          typeof data.mimeType === "string"
            ? data.mimeType
            : file.type || "application/octet-stream",
          setUploadPercent,
          FILE_TIMEOUT_MS
        );
        if (!put.ok) {
          let putError: string | undefined;
          try {
            putError = (JSON.parse(put.text) as { error?: string }).error;
          } catch {
            putError = undefined;
          }
          setStatus(null);
          setError(
            putError ?? `${t("uploadFailed")} (${put.status})`
          );
          return;
        }
        setUploadPercent(100);
      }
      setForm((current) => ({
        ...current,
        file_url: String(data.url ?? ""),
        file_name: String(data.fileName ?? file.name),
        mime_type: String(data.mimeType ?? file.type),
        byte_size: Number(data.byteSize) || file.size,
        media_type:
          data.fileKind === "pdf"
            ? "pdf"
            : current.media_type === "pdf"
              ? ""
              : current.media_type,
      }));
      setStatus(t("uploadedReady"));
    } catch (err) {
      setStatus(null);
      setError(messageFromError(err, t("timedOut"), t("networkError")));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!form.file_url || !form.media_type) {
      setStatus(null);
      setError(
        !form.file_url ? t("uploadRequired") : t("mediaTypeRequired")
      );
      return;
    }
    if (!form.byte_size || form.byte_size <= 0) {
      setStatus(null);
      setError(t("uploadRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    setStatus(t("saving"));
    try {
      const payload = {
        topic: form.topic,
        media_type: form.media_type,
        file_url: form.file_url,
        file_name: form.file_name,
        mime_type: form.mime_type,
        byte_size: Number(form.byte_size),
        title_en: form.title_en,
        title_ar: form.title_ar || null,
        title_ckb: form.title_ckb || null,
        description_en: form.description_en || null,
        description_ar: form.description_ar || null,
        description_ckb: form.description_ckb || null,
        sort_order: Number(form.sort_order) || 0,
        is_published: form.is_published,
      };

      const response = await fetchTimed(
        editingId
          ? `/api/admin/education/${editingId}`
          : "/api/admin/education",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        API_TIMEOUT_MS
      );
      const data = await readBody(response);
      if (!response.ok) {
        setStatus(null);
        setError(
          typeof data.error === "string" ? data.error : t("saveFailed")
        );
        return;
      }
      const resource = data.resource as EducationResource | undefined;
      if (resource) {
        setResources((current) => {
          if (editingId) {
            return current.map((item) =>
              item.id === editingId ? resource : item
            );
          }
          return [resource, ...current.filter((item) => item.id !== resource.id)];
        });
      }
      resetForm();
      setStatus(t("saved"));
      try {
        await load();
      } catch (err) {
        setError(messageFromError(err, t("timedOut"), t("loadFailed")));
      }
    } catch (err) {
      setStatus(null);
      setError(messageFromError(err, t("timedOut"), t("saveFailed")));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    setError(null);
    setStatus(t("saving"));
    try {
      const response = await fetchTimed(
        `/api/admin/education/${id}`,
        { method: "DELETE" },
        API_TIMEOUT_MS
      );
      if (!response.ok) {
        const data = await readBody(response);
        setStatus(null);
        setError(
          typeof data.error === "string" ? data.error : t("deleteFailed")
        );
        return;
      }
      setResources((current) => current.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
      setStatus(t("saved"));
    } catch (err) {
      setStatus(null);
      setError(messageFromError(err, t("timedOut"), t("deleteFailed")));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{t("heading")}</h2>
          <p className="mt-1 text-sm text-muted">{t("hint")}</p>
        </div>
        {!showForm ? (
          <Button type="button" variant="secondary" onClick={startCreate}>
            {t("add")}
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!error && status ? (
        <p className="text-sm text-muted">{status}</p>
      ) : null}

      {showForm ? (
        <Card elevation="nested" className="space-y-4 p-5">
          <h3 className="font-semibold">
            {editingId ? t("edit") : t("add")}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("topic")}>
              <input
                className={inputClassName}
                value={form.topic}
                onChange={(e) =>
                  setForm((current) => ({ ...current, topic: e.target.value }))
                }
              />
            </Field>
            <Field label={t("sortOrder")}>
              <input
                className={inputClassName}
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    sort_order: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label={t("titleEn")}>
              <input
                className={inputClassName}
                value={form.title_en}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    title_en: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label={t("titleAr")}>
              <input
                className={inputClassName}
                value={form.title_ar}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    title_ar: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label={t("titleCkb")}>
              <input
                className={inputClassName}
                value={form.title_ckb}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    title_ckb: e.target.value,
                  }))
                }
              />
            </Field>
            <div className="block space-y-1.5">
              <span className="text-sm font-medium text-text">
                {t("published")}
              </span>
              <label className="flex min-h-11 items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      is_published: e.target.checked,
                    }))
                  }
                />
                {t("published")}
              </label>
            </div>
            <Field label={t("descriptionEn")}>
              <textarea
                className={inputClassName}
                rows={3}
                value={form.description_en}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    description_en: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label={t("descriptionAr")}>
              <textarea
                className={inputClassName}
                rows={3}
                value={form.description_ar}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    description_ar: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label={t("descriptionCkb")}>
              <textarea
                className={inputClassName}
                rows={3}
                value={form.description_ckb}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    description_ckb: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label={t("mediaType")}>
              <select
                className={inputClassName}
                value={form.media_type}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    media_type: e.target.value as EducationMediaType | "",
                  }))
                }
              >
                <option value="">{t("mediaTypePlaceholder")}</option>
                {EDUCATION_MEDIA_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`mediaTypes.${type}`)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="block space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-text">
                {form.file_url ? t("replaceFile") : t("file")}
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,video/mp4,video/webm,video/quicktime"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => {
                    void onFileChange(e.target.files);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading
                    ? t("uploading")
                    : form.file_url
                      ? t("replaceFile")
                      : t("file")}
                </Button>
                {form.file_url ? (
                  <span className="text-xs text-muted">
                    {t("currentFile")}: {form.file_name} ({form.media_type})
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted">{t("fileLimits")}</p>
              {uploading ? (
                <div className="space-y-1.5">
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-background-soft"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={uploadPercent}
                    aria-label={t("uploading")}
                  >
                    <div
                      className="h-full bg-background transition-[width] duration-200"
                      style={{ width: `${uploadPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted">
                    {t("uploadProgress", { percent: uploadPercent })}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={uploading || saving}
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
        {resources.length === 0 ? (
          <p className="text-sm text-muted">{t("empty")}</p>
        ) : (
          resources.map((resource) => (
            <Card
              key={resource.id}
              elevation="nested"
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="font-medium">{resource.title_en}</p>
                <p className="text-sm text-muted">
                  {resource.topic} · {t("mediaType")}:{" "}
                  {t(`mediaTypes.${resource.media_type}`)}
                  {resource.is_published ? "" : " · draft"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => startEdit(resource)}
                >
                  {t("edit")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void remove(resource.id)}
                >
                  {t("delete")}
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
