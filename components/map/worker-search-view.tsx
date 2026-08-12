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
import type { JobType, WorkerSearchResult } from "@/lib/db/types";
import {
  RADIUS_PRESETS_MI,
  formatDistance,
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

function WorkerCard({
  worker,
  selected,
  hovered,
  onSelect,
  onHoverChange,
  unnamed,
  availabilityLabel,
}: {
  worker: WorkerSearchResult;
  selected: boolean;
  hovered: boolean;
  onSelect: (id: number) => void;
  onHoverChange: (id: number | null) => void;
  unnamed: string;
  availabilityLabel: string | null;
}) {
  const distance = formatDistance(worker.distance_m);
  const mutedClass = `mt-1 text-sm transition-colors duration-200 ease-out motion-reduce:transition-none ${
    hovered ? "text-white" : "text-muted"
  }`;
  return (
    <div
      onMouseEnter={() => onHoverChange(worker.id)}
      onMouseLeave={() => onHoverChange(null)}
      className={`w-full rounded-md border px-3 py-3 transition-[color,background-color,border-color] duration-200 ease-out motion-reduce:transition-none ${
        hovered
          ? "border-accent bg-background text-white"
          : selected
            ? "border-accent bg-background-soft"
            : "border-border bg-surface"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onSelect(worker.id)}
          className="min-w-0 flex-1 text-start"
        >
          <p className="font-medium">{worker.headline ?? unnamed}</p>
          <p className={mutedClass}>
            {worker.postcode ?? worker.address_text ?? ""}
            {availabilityLabel ? ` · ${availabilityLabel}` : ""}
          </p>
          <p className={mutedClass}>
            {[worker.top_skills, distance].filter(Boolean).join(" · ")}
          </p>
        </button>
        <FavouriteButton targetType="worker" targetId={worker.id} />
      </div>
    </div>
  );
}

export function WorkerSearchView() {
  const t = useTranslations("worker-search");
  const tWorker = useTranslations("worker-profile");
  const tJobs = useTranslations("jobs");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { requireAuth } = useRequireAuth();

  const [view, setView] = useState<ViewMode>("map");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workers, setWorkers] = useState<WorkerSearchResult[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const [postcode, setPostcode] = useState("");
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [radius, setRadius] = useState<RadiusMiles>(25);
  const [jobType, setJobType] = useState("");
  const [availability, setAvailability] = useState("");
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
    availability,
    skillId,
  ].join("|");

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ search: "1" });
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
        if (availability) params.set("availability", availability);
        if (skillId) params.set("skillIds", skillId);
        if (debouncedField.trim()) params.set("field", debouncedField.trim());

        const res = await fetch(`/api/workers?${params}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? tCommon("status.error"));
        setWorkers(data.workers ?? []);
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
  }, [queryKey, origin, radius, debouncedField, jobType, availability, skillId, tCommon]);

  const selected = useMemo(
    () => workers.find((w) => w.id === selectedId) ?? null,
    [workers, selectedId]
  );

  const mapPoints = useMemo(
    () =>
      workers
        .filter((w) => w.location_lat != null && w.location_lng != null)
        .map((w) => ({
          id: w.id,
          lat: Number(w.location_lat),
          lng: Number(w.location_lng),
          active: w.actively_looking,
          properties: { title: w.headline ?? "" },
        })),
    [workers]
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
  }, []);

  const selectWorker = useCallback(
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
      <div className="flex justify-center">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            void (async () => {
              const pos = await getCurrentPosition();
              if (!pos) {
                setError(t("nearMeFailed"));
                return;
              }
              setOrigin(pos);
              setPostcode(t("nearMeLabel"));
              track("near_me", { kind: "workers" });
            })();
          }}
        >
          {t("nearMe")}
        </Button>
      </div>

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
        <span className="text-sm font-medium">{t("desiredJobType")}</span>
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

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{tWorker("availability")}</span>
        <select
          className={inputClassName}
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
        >
          <option value="">{t("any")}</option>
          {(["immediate", "2_weeks", "1_month"] as const).map((a) => (
            <option key={a} value={a}>
              {tWorker(`availabilityOptions.${a}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{tWorker("skills")}</span>
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

      <div className="flex justify-center">
        <Button type="button" onClick={applyFilters}>
          {t("applyFilters")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-x-0 top-[3.75rem] bottom-14 z-10 flex flex-col md:bottom-0">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted">
            {loading
              ? tCommon("status.loading")
              : t("resultCount", { count: workers.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* <SaveSearchButton
            kind="workers"
            getFilters={() => ({
              postcode,
              origin,
              radius,
              field,
              jobType,
              availability,
              skillId,
            })}
          /> */}
          <div className="lg:hidden">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setFiltersOpen(true)}
            >
              {t("filters")}
            </Button>
          </div>
          <div className="flex rounded-md border border-border md:hidden">
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
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-e border-border bg-surface p-4 lg:block">
          {filtersPanel}
        </aside>

        <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center md:block">
          {view === "map" ? (
            <ClusteredMap
              searchMode="workers"
              searchModeLabel={t("title")}
              legendLabels={{
                standard: t("legendStandard"),
                active: t("legendActive"),
              }}
              className="h-full max-h-80% w-[90vw] overflow-hidden rounded-md md:absolute md:inset-0 md:h-auto md:w-auto md:rounded-none"
              points={mapPoints}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onHoverChange={setHoveredId}
              onSelect={selectWorker}
              center={mapCenter}
            />
          ) : (
            <div className="absolute inset-0 overflow-y-auto bg-surface p-3 md:hidden">
              <div className="space-y-2">
                {workers.length === 0 && !loading ? (
                  <p className="p-3 text-sm text-muted">{t("empty")}</p>
                ) : (
                  workers.map((worker) => (
                    <WorkerCard
                      key={worker.id}
                      worker={worker}
                      selected={selectedId === worker.id}
                      hovered={hoveredId === worker.id}
                      onSelect={selectWorker}
                      onHoverChange={setHoveredId}
                      unnamed={t("unnamedWorker")}
                      availabilityLabel={
                        worker.availability
                          ? tWorker(
                              `availabilityOptions.${worker.availability}`
                            )
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
            {workers.length === 0 && !loading ? (
              <p className="p-3 text-sm text-muted">{t("empty")}</p>
            ) : (
              workers.map((worker) => (
                <WorkerCard
                  key={worker.id}
                  worker={worker}
                  selected={selectedId === worker.id}
                  hovered={hoveredId === worker.id}
                  onSelect={selectWorker}
                  onHoverChange={setHoveredId}
                  unnamed={t("unnamedWorker")}
                  availabilityLabel={
                    worker.availability
                      ? tWorker(
                          `availabilityOptions.${worker.availability}`
                        )
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
        title={selected?.headline ?? t("unnamedWorker")}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-muted">
                {[selected.address_text, selected.postcode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <FavouriteButton targetType="worker" targetId={selected.id} />
            </div>
            {selected.availability ? (
              <p className="text-sm">
                {tWorker(`availabilityOptions.${selected.availability}`)}
              </p>
            ) : null}
            {selected.top_skills ? (
              <p className="text-sm text-muted">{selected.top_skills}</p>
            ) : null}
            <p className="text-sm text-muted">
              {formatDistance(selected.distance_m)}
            </p>
            {selected.bio ? (
              <p className="line-clamp-4 text-sm text-muted">{selected.bio}</p>
            ) : null}
            <Button
              type="button"
              className="w-full"
              onClick={() =>
                requireAuth(() => router.push(`/workers/${selected.id}`))
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
