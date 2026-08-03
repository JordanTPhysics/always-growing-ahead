"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/routing";
import { useRequireAuth } from "@/lib/auth/use-require-auth";
import { ClusteredMap } from "@/components/map/clustered-map";
import { BottomSheet } from "@/components/map/bottom-sheet";
import { PostcodeInput } from "@/components/map/postcode-input";
import { SaveSearchButton } from "@/components/search/save-search-button";
import { FavouriteButton } from "@/components/favourites/favourite-button";
import { Button } from "@/components/ui/button";
import { inputClassName } from "@/components/ui/forms";
import type { JobSearchResult, JobType } from "@/lib/db/types";
import {
  RADIUS_PRESETS_MI,
  formatDistance,
  formatSalary,
  milesToMeters,
  type RadiusMiles,
  NOTTINGHAM_CENTER,
} from "@/lib/search/constants";
import { getCurrentPosition } from "@/lib/native/geolocation";
import { track } from "@/lib/analytics/track";

type Skill = { id: number; name: string };
type ViewMode = "map" | "list";

const JOB_TYPES: JobType[] = [
  "full-time",
  "part-time",
  "contract",
  "temporary",
  "apprenticeship",
];

function JobCard({
  job,
  selected,
  onSelect,
  companyFallback,
  jobTypeLabel,
  salaryTypeLabel,
}: {
  job: JobSearchResult;
  selected: boolean;
  onSelect: (id: number) => void;
  companyFallback: string;
  jobTypeLabel: string | null;
  salaryTypeLabel: string | null;
}) {
  const salary = formatSalary(job.salary_min, job.salary_max, salaryTypeLabel);
  const distance = formatDistance(job.distance_m);
  return (
    <div
      className={`w-full rounded-md border px-3 py-3 transition hover:bg-background/80 ${
        selected
          ? "border-accent bg-background"
          : "border-border bg-surface hover:border-accent/40"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onSelect(job.id)}
          className="min-w-0 flex-1 text-start"
        >
          <p className="font-medium">{job.title}</p>
          <p className="mt-1 text-sm text-muted">
            {job.company_name ?? companyFallback}
            {job.postcode ? ` · ${job.postcode}` : ""}
            {jobTypeLabel ? ` · ${jobTypeLabel}` : ""}
          </p>
          <p className="mt-1 text-sm text-muted">
            {[salary, distance].filter(Boolean).join(" · ")}
          </p>
        </button>
        <FavouriteButton targetType="job" targetId={job.id} />
      </div>
    </div>
  );
}

export function JobSearchView() {
  const t = useTranslations("job-search");
  const tJobs = useTranslations("jobs");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { requireAuth } = useRequireAuth();

  const [view, setView] = useState<ViewMode>("map");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobSearchResult[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [postcode, setPostcode] = useState("");
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [radius, setRadius] = useState<RadiusMiles>(25);
  const [jobType, setJobType] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [postedWithinDays, setPostedWithinDays] = useState("");
  const [skillId, setSkillId] = useState("");
  const [field, setField] = useState("");
  const [debouncedField, setDebouncedField] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedField(field), 300);
    return () => window.clearTimeout(timer);
  }, [field]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/skills")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSkills(data.skills ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const queryKey = [
    origin?.lat ?? "",
    origin?.lng ?? "",
    radius,
    debouncedField,
    jobType,
    salaryMin,
    salaryMax,
    postedWithinDays,
    skillId,
  ].join("|");

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (origin) {
          params.set("lat", String(origin.lat));
          params.set("lng", String(origin.lng));
          params.set(
            "radius",
            radius === "nationwide"
              ? "nationwide"
              : String(milesToMeters(radius))
          );
        } else {
          params.set("radius", "nationwide");
        }
        if (jobType) params.set("jobType", jobType);
        if (salaryMin) params.set("salaryMin", salaryMin);
        if (salaryMax) params.set("salaryMax", salaryMax);
        if (postedWithinDays) params.set("postedWithinDays", postedWithinDays);
        if (skillId) params.set("skillIds", skillId);
        if (debouncedField.trim()) params.set("field", debouncedField.trim());

        const res = await fetch(`/api/jobs?${params}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? tCommon("status.error"));
        setJobs(data.jobs ?? []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : tCommon("status.error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [queryKey, origin, radius, debouncedField, jobType, salaryMin, salaryMax, postedWithinDays, skillId, tCommon]);

  const selected = useMemo(
    () => jobs.find((j) => j.id === selectedId) ?? null,
    [jobs, selectedId]
  );

  const mapPoints = useMemo(
    () =>
      jobs
        .filter((j) => j.location_lat != null && j.location_lng != null)
        .map((j) => ({
          id: j.id,
          lat: Number(j.location_lat),
          lng: Number(j.location_lng),
          active: j.employer_actively_hiring ?? false,
          properties: { title: j.title },
        })),
    [jobs]
  );

  const mapCenter = origin
    ? {
        latitude: origin.lat,
        longitude: origin.lng,
        zoom: radius === "nationwide" ? 6 : radius <= 5 ? 12 : 10,
      }
    : NOTTINGHAM_CENTER;

  const applyFilters = useCallback(() => {
    setFiltersOpen(false);
    // queryKey deps already drive refetch; toggling a noop state isn't needed
  }, []);

  const selectJob = useCallback(
    (id: number) => {
      requireAuth(() => setSelectedId(id));
    },
    [requireAuth]
  );

  const filtersPanel = (
    <div className="space-y-4">
      <PostcodeInput
        label={t("location")}
        placeholder={t("locationPlaceholder")}
        value={postcode}
        onChange={setPostcode}
        onResolved={(result) => {
          setPostcode(result.postcode || result.address_text);
          setOrigin({ lat: result.lat, lng: result.lng });
        }}
      />
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => {
          void (async () => {
            const pos = await getCurrentPosition();
            if (!pos) {
              setError(t("nearMeFailed"));
              return;
            }
            setOrigin(pos);
            setPostcode(t("nearMeLabel"));
            track("near_me", { kind: "jobs" });
          })();
        }}
      >
        {t("nearMe")}
      </Button>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{t("field")}</span>
        <input
          className={inputClassName}
          type="search"
          value={field}
          placeholder={t("fieldPlaceholder")}
          onChange={(e) => setField(e.target.value)}
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("radius")}</legend>
        <div className="flex flex-wrap gap-2">
          {RADIUS_PRESETS_MI.map((mi) => (
            <button
              key={mi}
              type="button"
              onClick={() => setRadius(mi)}
              className={`min-h-11 rounded-md px-3 text-sm ${
                radius === mi
                  ? "bg-background text-white"
                  : "border border-border bg-surface hover:bg-background-soft"
              }`}
            >
              {t("radiusMiles", { miles: mi })}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRadius("nationwide")}
            className={`min-h-11 rounded-md px-3 text-sm ${
              radius === "nationwide"
                ? "bg-background text-white"
                : "border border-border bg-surface hover:bg-background-soft"
            }`}
          >
            {t("nationwide")}
          </button>
        </div>
      </fieldset>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{tJobs("jobType")}</span>
        <select
          className={inputClassName}
          value={jobType}
          onChange={(e) => setJobType(e.target.value)}
        >
          <option value="">{t("any")}</option>
          {JOB_TYPES.map((type) => (
            <option key={type} value={type}>
              {tJobs(`jobTypes.${type}`)}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{t("salaryMin")}</span>
          <input
            className={inputClassName}
            type="number"
            inputMode="numeric"
            value={salaryMin}
            onChange={(e) => setSalaryMin(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{t("salaryMax")}</span>
          <input
            className={inputClassName}
            type="number"
            inputMode="numeric"
            value={salaryMax}
            onChange={(e) => setSalaryMax(e.target.value)}
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{t("postedWithin")}</span>
        <select
          className={inputClassName}
          value={postedWithinDays}
          onChange={(e) => setPostedWithinDays(e.target.value)}
        >
          <option value="">{t("any")}</option>
          <option value="1">{t("postedDays", { days: 1 })}</option>
          <option value="7">{t("postedDays", { days: 7 })}</option>
          <option value="30">{t("postedDays", { days: 30 })}</option>
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{tJobs("skills")}</span>
        <select
          className={inputClassName}
          value={skillId}
          onChange={(e) => setSkillId(e.target.value)}
        >
          <option value="">{t("any")}</option>
          {skills.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <Button
        type="button"
        className="w-full"
        onClick={applyFilters}
      >
        {t("applyFilters")}
      </Button>
    </div>
  );

  return (
    <div className="fixed inset-x-0 top-[3.75rem] bottom-14 z-10 flex flex-col md:bottom-0">
      <div className="flex mx-auto rounded-md w-[95vw] shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted">
            {loading
              ? tCommon("status.loading")
              : t("resultCount", { count: jobs.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SaveSearchButton
            kind="jobs"
            getFilters={() => ({
              postcode,
              origin,
              radius,
              field,
              jobType,
              salaryMin,
              salaryMax,
              postedWithinDays,
              skillId,
            })}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => setFiltersOpen(true)}
          >
            {t("filters")}
          </Button>
          <div className="flex rounded-md border border-border">
            <button
              type="button"
              className={`min-h-11 px-3 text-sm ${view === "map" ? "bg-background text-white" : ""}`}
              onClick={() => setView("map")}
            >
              {t("mapView")}
            </button>
            <button
              type="button"
              className={`min-h-11 px-3 text-sm ${view === "list" ? "bg-background text-white" : ""}`}
              onClick={() => setView("list")}
            >
              {t("listView")}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <p className="border-b border-border bg-background-soft px-4 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="relative flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-e border-border bg-surface p-4 lg:blockS">
          {filtersPanel}
        </aside>

        <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center md:block">
          {view === "map" ? (
            <ClusteredMap
              searchMode="jobs"
              searchModeLabel={t("title")}
              legendLabels={{
                standard: t("legendStandard"),
                active: t("legendActive"),
              }}
              className="h-full max-h-[95%] w-[90vw] overflow-hidden rounded-md md:absolute md:inset-0 md:h-auto md:w-auto md:rounded-none"
              points={mapPoints}
              selectedId={selectedId}
              onSelect={selectJob}
              center={mapCenter}
            />
          ) : (
            <div className="absolute inset-0 overflow-y-auto bg-surface p-3 md:hidden">
              <div className="space-y-2">
                {jobs.length === 0 && !loading ? (
                  <p className="p-3 text-sm text-muted">{t("empty")}</p>
                ) : (
                  jobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      selected={selectedId === job.id}
                      onSelect={selectJob}
                      companyFallback={tJobs("company")}
                      jobTypeLabel={
                        job.job_type ? tJobs(`jobTypes.${job.job_type}`) : null
                      }
                      salaryTypeLabel={
                        job.salary_type
                          ? tJobs(`salaryTypes.${job.salary_type}`)
                          : null
                      }
                    />
                  ))
                )}
              </div>
            </div>
          )}
          {view === "list" ? (
            <div className="absolute inset-0 hidden overflow-y-auto bg-surface p-3 md:block">
              <p className="p-3 text-sm text-muted">{t("listDesktopHint")}</p>
            </div>
          ) : null}
        </div>

        <aside className="hidden w-80 shrink-0 overflow-y-auto border-s border-border bg-surface md:block lg:w-96">
          <div className="space-y-2 p-3">
            {jobs.length === 0 && !loading ? (
              <p className="p-3 text-sm text-muted">{t("empty")}</p>
            ) : (
              jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  selected={selectedId === job.id}
                  onSelect={selectJob}
                  companyFallback={tJobs("company")}
                  jobTypeLabel={
                    job.job_type ? tJobs(`jobTypes.${job.job_type}`) : null
                  }
                  salaryTypeLabel={
                    job.salary_type
                      ? tJobs(`salaryTypes.${job.salary_type}`)
                      : null
                  }
                />
              ))
            )}
          </div>
        </aside>
      </div>

      <BottomSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t("filters")}
        desktopSidePanel={false}
      >
        {filtersPanel}
      </BottomSheet>

      <BottomSheet
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.title}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-muted">
                {selected.company_name ?? tJobs("company")}
                {selected.postcode ? ` · ${selected.postcode}` : ""}
              </p>
              <FavouriteButton targetType="job" targetId={selected.id} />
            </div>
            {selected.job_type ? (
              <p className="text-sm">{tJobs(`jobTypes.${selected.job_type}`)}</p>
            ) : null}
            <p className="text-sm text-muted">
              {[
                formatSalary(
                  selected.salary_min,
                  selected.salary_max,
                  selected.salary_type
                    ? tJobs(`salaryTypes.${selected.salary_type}`)
                    : null
                ),
                formatDistance(selected.distance_m),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {selected.description ? (
              <p className="line-clamp-4 text-sm text-muted">
                {selected.description}
              </p>
            ) : null}
            <Button
              type="button"
              className="w-full"
              onClick={() =>
                requireAuth(() => router.push(`/jobs/${selected.id}`))
              }
            >
              {t("viewFull")}
            </Button>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
