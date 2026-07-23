"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import { JobForm } from "@/components/job/job-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type JobSummary = {
  id: number;
  title: string;
  status: string;
  postcode: string | null;
};

type Props = {
  enabled: boolean;
};

export function EmployerJobsPanel({ enabled }: Props) {
  const t = useTranslations("jobs");
  const tCommon = useTranslations("common");
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/jobs?mine=1");
      const data = await res.json().catch(() => ({}));
      setJobs(data.jobs ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setJobs([]);
      setLoading(false);
      return;
    }
    void reload();
  }, [enabled, reload]);

  if (!enabled) return null;

  if (creating) {
    return (
      <section className="space-y-4 border-t border-border pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{t("createTitle")}</h2>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setCreating(false)}
          >
            {tCommon("actions.cancel")}
          </Button>
        </div>
        <JobForm
          embedded
          onSaved={() => {
            setCreating(false);
            void reload();
          }}
        />
      </section>
    );
  }

  if (editingId != null) {
    return (
      <section className="space-y-4 border-t border-border pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{t("editTitle")}</h2>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setEditingId(null)}
          >
            {tCommon("actions.cancel")}
          </Button>
        </div>
        <JobForm
          embedded
          jobId={editingId}
          onSaved={() => {
            setEditingId(null);
            void reload();
          }}
        />
      </section>
    );
  }

  return (
    <section className="space-y-4 border-t border-border pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{t("myJobsTitle")}</h2>
        <Button type="button" onClick={() => setCreating(true)}>
          {t("createTitle")}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted">{tCommon("status.loading")}</p>
      ) : jobs.length === 0 ? (
        <p className="text-sm text-muted">{t("emptyMine")}</p>
      ) : (
        <Card elevation="nested" className="divide-y divide-border overflow-hidden p-0">
          <ul className="divide-y divide-border">
            {jobs.map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
              >
                <div>
                  <p className="font-medium">{job.title}</p>
                  <p className="text-sm text-muted">
                    {t(`statuses.${job.status}`)}
                    {job.postcode ? ` · ${job.postcode}` : ""}
                  </p>
                </div>
                <div className="flex gap-3 text-sm">
                  <Link href={`/jobs/${job.id}`} className="underline">
                    {t("viewJob")}
                  </Link>
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setEditingId(job.id)}
                  >
                    {tCommon("actions.edit")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
