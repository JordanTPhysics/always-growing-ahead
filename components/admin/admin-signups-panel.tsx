"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import type { RegistrationAttemptStatus } from "@/lib/db/types";

type Attempt = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  district: string | null;
  error_message: string;
  status: RegistrationAttemptStatus;
  created_at: string;
};

const STATUSES: RegistrationAttemptStatus[] = ["new", "contacted", "resolved"];

type Filter = "all" | RegistrationAttemptStatus;

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function AdminSignupsPanel() {
  const t = useTranslations("admin.signups");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const query = filter === "all" ? "" : `?status=${filter}`;
    void fetch(`/api/admin/registration-attempts${query}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "load failed");
        return data.attempts ?? [];
      })
      .then((rows: Attempt[]) => {
        if (!cancelled) setAttempts(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setAttempts([]);
          setError(t("loadFailed"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, t]);

  async function changeStatus(id: number, status: RegistrationAttemptStatus) {
    const previous = attempts;
    setError(null);
    setAttempts((current) =>
      current.flatMap((attempt) => {
        if (attempt.id !== id) return [attempt];
        if (filter !== "all" && filter !== status) return [];
        return [{ ...attempt, status }];
      })
    );
    const response = await fetch("/api/admin/registration-attempts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!response.ok) {
      setAttempts(previous);
      setError(t("updateFailed"));
    }
  }

  return (
    <Card elevation="nested" className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{t("heading")}</h2>
          <p className="mt-1 text-sm text-muted">{t("hint")}</p>
        </div>
        <select
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          value={filter}
          aria-label={t("filterLabel")}
          onChange={(event) => setFilter(event.target.value as Filter)}
        >
          <option value="all">{t("filterAll")}</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`statuses.${status}`)}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-muted">{t("loading")}</p>
        ) : attempts.length === 0 ? (
          <p className="text-sm text-muted">{t("empty")}</p>
        ) : (
          attempts.map((attempt) => {
            const location = [attempt.city, attempt.district].filter(Boolean).join(", ");
            return (
              <div key={attempt.id} className="rounded-md border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{attempt.name || t("noName")}</p>
                    <p className="mt-1 text-sm text-muted">
                      {[attempt.email, attempt.phone].filter(Boolean).join(" · ") ||
                        t("noContact")}
                    </p>
                    {location ? <p className="text-sm text-muted">{location}</p> : null}
                  </div>
                  <select
                    className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
                    value={attempt.status}
                    aria-label={`${t("status")} ${attempt.email ?? attempt.name ?? attempt.id}`}
                    onChange={(event) =>
                      void changeStatus(
                        attempt.id,
                        event.target.value as RegistrationAttemptStatus
                      )
                    }
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {t(`statuses.${status}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-3 text-sm break-words text-danger">{attempt.error_message}</p>
                <p className="mt-2 text-xs text-muted">
                  {t("created")}: {formatWhen(attempt.created_at)}
                </p>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
