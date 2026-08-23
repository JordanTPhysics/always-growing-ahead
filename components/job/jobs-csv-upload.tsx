"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, PageSection } from "@/components/ui/card";
import { Field, PageHeader, inputClassName } from "@/components/ui/forms";
import { JOB_CSV_HEADERS } from "@/lib/jobs/csv";

type BulkResult = {
  employer_id: number;
  created: { line: number; id: number; title: string }[];
  failed: { line: number; error: string }[];
  warnings: { line: number; message: string }[];
};

export function JobsCsvUpload() {
  const t = useTranslations("jobs");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);

  async function upload() {
    if (!file) {
      setError(t("bulkNoFile"));
      return;
    }
    setUploading(true);
    setError(null);
    setResult(null);

    const body = new FormData();
    body.set("file", file);
    const res = await fetch("/api/jobs/bulk", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setUploading(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : tCommon("status.error"));
      return;
    }

    setResult(data as BulkResult);
    router.refresh();
  }

  return (
    <PageSection>
      <PageHeader
        title={t("bulkTitle")}
        subtitle={t("bulkSubtitle")}
        actions={
          <Button asChild variant="secondary">
            <Link href="/employer/jobs">{tCommon("actions.back")}</Link>
          </Button>
        }
      />

      <Card elevation="nested" className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-medium">{t("bulkHeaders")}</h2>
          <p className="mt-1 text-sm text-muted">{t("bulkHeadersHint")}</p>
          <p className="mt-1 text-sm text-muted">{t("bulkRequired")}</p>
          <code className="mt-3 block overflow-x-auto rounded-md bg-background-soft px-3 py-2 text-xs">
            {JOB_CSV_HEADERS.join(",")}
          </code>
        </div>
        <a
          href="/api/jobs/bulk"
          className="inline-flex text-sm text-muted underline"
        >
          {t("bulkDownloadSample")}
        </a>
      </Card>

      <Card elevation="nested" className="space-y-4 p-5">
        <Field label={t("bulkChooseFile")}>
          <input
            className={inputClassName}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="button" disabled={uploading} onClick={() => void upload()}>
          {uploading ? t("bulkUploading") : t("bulkUploadCta")}
        </Button>
      </Card>

      {result ? (
        <Card elevation="nested" className="space-y-3 p-5">
          <p className="font-medium">
            {t("bulkResultCreated", { count: result.created.length })}
          </p>
          {result.failed.length > 0 ? (
            <p className="text-sm text-danger">
              {t("bulkResultFailed", { count: result.failed.length })}
            </p>
          ) : null}
          {result.warnings.length > 0 ? (
            <p className="text-sm text-muted">
              {t("bulkResultWarnings", { count: result.warnings.length })}
            </p>
          ) : null}
          {result.failed.length > 0 ? (
            <ul className="space-y-1 text-sm text-danger">
              {result.failed.map((row) => (
                <li key={`fail-${row.line}`}>
                  {t("bulkRow", { n: row.line })}: {row.error}
                </li>
              ))}
            </ul>
          ) : null}
          {result.warnings.length > 0 ? (
            <ul className="space-y-1 text-sm text-muted">
              {result.warnings.map((row) => (
                <li key={`warn-${row.line}-${row.message}`}>
                  {t("bulkRow", { n: row.line })}: {row.message}
                </li>
              ))}
            </ul>
          ) : null}
          {result.created.length > 0 ? (
            <ul className="divide-y divide-border text-sm">
              {result.created.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <span>
                    {t("bulkRow", { n: row.line })}: {row.title}
                  </span>
                  <Link href={`/jobs/${row.id}`} className="text-muted underline">
                    {t("viewJob")}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}
    </PageSection>
  );
}
