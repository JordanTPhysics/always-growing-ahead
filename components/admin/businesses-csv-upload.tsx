"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/forms";
import { BUSINESS_CSV_HEADERS } from "@/lib/employers/csv";

type BulkResult = {
  created: { line: number; id: number; company_name: string }[];
  updated: { line: number; id: number; company_name: string }[];
  failed: { line: number; error: string }[];
  warnings: { line: number; message: string }[];
};

export function BusinessesCsvUpload() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);

  async function upload() {
    if (!file) {
      setError(t("businessesImport.noFile"));
      return;
    }
    setUploading(true);
    setError(null);
    setResult(null);

    const body = new FormData();
    body.set("file", file);
    const res = await fetch("/api/employers/bulk", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setUploading(false);

    if (!res.ok) {
      setError(
        typeof data.error === "string" ? data.error : tCommon("status.error")
      );
      return;
    }

    setResult(data as BulkResult);
    router.refresh();
  }

  const saved = result ? [...result.created, ...result.updated] : [];

  return (
    <div className="space-y-4">
      <Card elevation="nested" className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-medium">{t("businessesImport.heading")}</h2>
          <p className="mt-1 text-sm text-muted">{t("businessesImport.hint")}</p>
          <p className="mt-1 text-sm text-muted">{t("businessesImport.required")}</p>
          <code className="mt-3 block overflow-x-auto rounded-md bg-background-soft px-3 py-2 text-xs">
            {BUSINESS_CSV_HEADERS.join(",")}
          </code>
        </div>
        <a
          href="/api/employers/bulk"
          className="inline-flex text-sm text-muted underline"
        >
          {t("businessesImport.downloadSample")}
        </a>
      </Card>

      <Card elevation="nested" className="space-y-4 p-5">
        <Field label={t("businessesImport.chooseFile")}>
          <input
            className={inputClassName}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="button" disabled={uploading} onClick={() => void upload()}>
          {uploading
            ? t("businessesImport.uploading")
            : t("businessesImport.uploadCta")}
        </Button>
      </Card>

      {result ? (
        <Card elevation="nested" className="space-y-3 p-5">
          <p className="font-medium">
            {t("businessesImport.resultCreated", { count: result.created.length })}
          </p>
          {result.updated.length > 0 ? (
            <p className="text-sm text-muted">
              {t("businessesImport.resultUpdated", {
                count: result.updated.length,
              })}
            </p>
          ) : null}
          {result.failed.length > 0 ? (
            <p className="text-sm text-danger">
              {t("businessesImport.resultFailed", { count: result.failed.length })}
            </p>
          ) : null}
          {result.warnings.length > 0 ? (
            <p className="text-sm text-muted">
              {t("businessesImport.resultWarnings", {
                count: result.warnings.length,
              })}
            </p>
          ) : null}
          {result.failed.length > 0 ? (
            <ul className="space-y-1 text-sm text-danger">
              {result.failed.map((row) => (
                <li key={`fail-${row.line}`}>
                  {t("businessesImport.row", { n: row.line })}: {row.error}
                </li>
              ))}
            </ul>
          ) : null}
          {result.warnings.length > 0 ? (
            <ul className="space-y-1 text-sm text-muted">
              {result.warnings.map((row) => (
                <li key={`warn-${row.line}-${row.message}`}>
                  {t("businessesImport.row", { n: row.line })}: {row.message}
                </li>
              ))}
            </ul>
          ) : null}
          {saved.length > 0 ? (
            <ul className="divide-y divide-border text-sm">
              {saved.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <span>
                    {t("businessesImport.row", { n: row.line })}: {row.company_name}
                  </span>
                  <Link
                    href={`/employers/${row.id}`}
                    className="text-muted underline"
                  >
                    {tCommon("actions.view")}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {saved.length > 0 ? (
            <Link href="/jobs" className="inline-flex text-sm text-muted underline">
              {t("businessesImport.viewOnMap")}
            </Link>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
