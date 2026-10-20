"use client";

import {
  AdvancedMarker,
  APIProvider,
  Map,
  useMap,
} from "@vis.gl/react-google-maps";
import {
  animateMapCamera,
  cameraForResults,
  prefersReducedMapMotion,
  UK_OVERVIEW,
  type MapCameraTarget,
} from "@/lib/maps/camera";
import {
  markMapIntroPlayed,
  useUserMapFocus,
} from "@/components/map/use-user-map-focus";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { MdOutlinePersonPinCircle } from "react-icons/md";
import { BsPersonRaisedHand, BsPersonStanding } from "react-icons/bs";
import { IoIosBriefcase } from "react-icons/io";
import { OCCUPATIONS, occupationById } from "@/components/map/occupations";
import { TbCashRegister } from "react-icons/tb";

export type MapSearchMode = "workers" | "jobs";

export type MapPoint = {
  id: number;
  lat: number;
  lng: number;
  active?: boolean;
  occupationId?: string | null;
  properties?: Record<string, string | null | undefined>;
};

type LegendLabels = {
  standard: string;
  active: string;
};

type Props = {
  searchMode: MapSearchMode;
  searchModeLabel?: string;
  legendLabels?: LegendLabels;
  points: MapPoint[];
  selectedId?: number | null;
  hoveredId?: number | null;
  onHoverChange?: (id: number | null) => void;
  onSelect: (id: number) => void;
  /** Increments when Apply filters should reframe the map around the current points. */
  fitId?: number;
  className?: string;
  apiKey: string;
  mapId?: string;
};

function getWorkerMarkerIcon(active: boolean) {
  return {
    Icon: active ? BsPersonRaisedHand : BsPersonStanding,
    color: active ? "red" : "green",
  };
}

function jobMarkerAppearance(occupationId: string | null | undefined, active: boolean) {
  const occupation = occupationById(occupationId);
  return {
    Icon: occupation?.Icon ?? TbCashRegister,
    colorClass: active ? (occupation?.color ?? "text-red-600") : "text-black",
  };
}

function SearchModeBadge({
  mode,
  label,
}: {
  mode: MapSearchMode;
  label?: string;
}) {
  const Icon = mode === "workers" ? MdOutlinePersonPinCircle : IoIosBriefcase;
  return (
    <div className="pointer-events-none absolute start-3 top-3 z-10 flex items-center gap-2 rounded-md border border-border bg-surface/95 px-3 py-2 shadow-sm backdrop-blur-sm">
      <Icon className="size-6 shrink-0 text-foreground" aria-hidden />
      {label ? (
        <span className="text-sm font-medium text-foreground">{label}</span>
      ) : null}
    </div>
  );
}

function MapLegend({
  searchMode,
  labels,
}: {
  searchMode: MapSearchMode;
  labels: LegendLabels;
}) {
  const t = useTranslations("common");
  const items = [
    { active: false, label: labels.standard },
    { active: true, label: labels.active },
  ] as const;

  return (
    <div
      className="pointer-events-none absolute start-3 bottom-3 z-10 flex max-h-[50%] flex-col gap-1.5 overflow-y-auto rounded-md border border-border bg-surface/95 px-3 py-2 shadow-sm backdrop-blur-sm"
      aria-label="Map legend"
    >
      {searchMode === "jobs" ? (
        <>
          <p className="text-xs font-medium text-text">{labels.active}</p>
          {OCCUPATIONS.map((occupation) => (
            <div key={occupation.id} className="flex items-center gap-2">
              <occupation.Icon
                className={`size-5 shrink-0 drop-shadow-sm ${occupation.color}`}
                aria-hidden
              />
              <span className="text-xs text-text">
                {t(`occupations.${occupation.id}`)}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <IoIosBriefcase
              className="size-5 shrink-0 text-gray-400 drop-shadow-sm"
              aria-hidden
            />
            <span className="text-xs text-text">{labels.standard}</span>
          </div>
        </>
      ) : (
        items.map(({ active, label }) => {
          const { Icon, color } = getWorkerMarkerIcon(active);
          return (
            <div key={label} className="flex items-center gap-2">
              <Icon
                className={`shrink-0 drop-shadow-sm ${active ? "size-6" : "size-5"}`}
                color={color}
                aria-hidden
              />
              <span className="text-xs text-text">{label}</span>
            </div>
          );
        })
      )}
    </div>
  );
}

function MapMarkerContent({
  searchMode,
  occupationId,
  active,
  hovered,
  title,
}: {
  searchMode: MapSearchMode;
  occupationId?: string | null;
  active: boolean;
  hovered: boolean;
  title?: string;
}) {
  const jobMarker =
    searchMode === "jobs" ? jobMarkerAppearance(occupationId, active) : null;
  const workerMarker = jobMarker ? null : getWorkerMarkerIcon(active);
  const Icon = jobMarker ? jobMarker.Icon : workerMarker!.Icon;
  const color = workerMarker?.color;
  const iconClassName = jobMarker
    ? `${active ? "size-8 drop-shadow-md" : "size-7 drop-shadow-sm"} ${jobMarker.colorClass}`
    : active
      ? "size-8 text-amber-600 drop-shadow-md"
      : "size-7 text-foreground drop-shadow-sm";

  return (
    <div
      className="flex size-11 cursor-pointer items-center justify-center"
      title={title}
      aria-label={title}
    >
      <div
        className={`flex items-center justify-center transition-transform duration-150 ease-out ${
          hovered ? "scale-110" : "scale-100"
        }`}
      >
        <Icon className={iconClassName} color={color} aria-hidden />
      </div>
    </div>
  );
}

function MapCamera({
  points,
  focus,
  playIntro,
  fitId,
}: {
  points: MapPoint[];
  focus: MapCameraTarget | null;
  playIntro: boolean;
  fitId: number;
}) {
  const map = useMap();
  const cancelRef = useRef<(() => void) | null>(null);
  const introToken = useRef(0);
  const introScheduled = useRef(false);
  const skipIntro = useRef(false);
  const placedKey = useRef<string | null>(null);
  const lastFit = useRef(0);
  const pointsRef = useRef(points);
  pointsRef.current = points;

  useEffect(() => {
    if (!map || !playIntro || !focus || introScheduled.current || skipIntro.current) {
      return;
    }
    introScheduled.current = true;
    const token = ++introToken.current;
    const reduced = prefersReducedMapMotion();
    let started = false;
    const timer = window.setTimeout(() => {
      if (introToken.current !== token) return;
      started = true;
      markMapIntroPlayed();
      cancelRef.current?.();
      cancelRef.current = animateMapCamera(map, focus, reduced ? 0 : 1700);
    }, reduced ? 0 : 650);
    return () => {
      window.clearTimeout(timer);
      if (!started) introScheduled.current = false;
    };
  }, [map, playIntro, focus]);

  useEffect(() => {
    if (!map || playIntro || fitId > 0) return;
    const target = focus ?? UK_OVERVIEW;
    const key = `${target.lat.toFixed(4)},${target.lng.toFixed(4)},${target.zoom}`;
    if (placedKey.current === key) return;
    placedKey.current = key;
    map.moveCamera({
      center: { lat: target.lat, lng: target.lng },
      zoom: target.zoom,
    });
  }, [map, playIntro, focus, fitId]);

  useEffect(() => {
    if (!map || fitId === 0 || fitId === lastFit.current) return;
    lastFit.current = fitId;
    skipIntro.current = true;
    introToken.current += 1;
    markMapIntroPlayed();
    const el = map.getDiv();
    const target = cameraForResults(pointsRef.current, {
      width: el.clientWidth || el.offsetWidth || 800,
      height: el.clientHeight || el.offsetHeight || 600,
    });
    if (!target) return;
    cancelRef.current?.();
    cancelRef.current = animateMapCamera(
      map,
      target,
      prefersReducedMapMotion() ? 0 : 1100
    );
  }, [map, fitId]);

  useEffect(() => () => cancelRef.current?.(), []);

  return null;
}

export function ClusteredMap({
  className,
  searchMode,
  searchModeLabel,
  legendLabels,
  points,
  hoveredId = null,
  onHoverChange,
  onSelect,
  fitId = 0,
  apiKey,
  mapId = "DEMO_MAP_ID",
}: Props) {
  const { checked, playIntro, focus } = useUserMapFocus();
  const initial =
    playIntro || !focus
      ? UK_OVERVIEW
      : focus;

  if (!apiKey) {
    return (
      <div
        className={`flex items-center justify-center bg-surface p-4 text-sm text-muted ${className ?? ""}`}
      >
        Google Maps is not configured.
      </div>
    );
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <SearchModeBadge mode={searchMode} label={searchModeLabel} />
      {legendLabels ? (
        <MapLegend searchMode={searchMode} labels={legendLabels} />
      ) : null}
      {checked ? (
        <APIProvider apiKey={apiKey} libraries={["marker"]}>
          <Map
            className="h-full w-full"
            mapId={mapId}
            defaultZoom={initial.zoom}
            defaultCenter={{ lat: initial.lat, lng: initial.lng }}
            isFractionalZoomEnabled
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            <MapCamera
              points={points}
              focus={focus}
              playIntro={playIntro}
              fitId={fitId}
            />
            {points.map((point) => {
              const hovered = hoveredId === point.id;
              return (
                <AdvancedMarker
                  key={point.id}
                  position={{ lat: point.lat, lng: point.lng }}
                  onClick={() => onSelect(point.id)}
                  onMouseEnter={() => onHoverChange?.(point.id)}
                  onMouseLeave={() => onHoverChange?.(null)}
                >
                  <MapMarkerContent
                    searchMode={searchMode}
                    occupationId={point.occupationId}
                    active={point.active ?? false}
                    hovered={hovered}
                    title={point.properties?.title ?? undefined}
                  />
                </AdvancedMarker>
              );
            })}
          </Map>
        </APIProvider>
      ) : null}
    </div>
  );
}
