"use client";

import {
  AdvancedMarker,
  APIProvider,
  Map,
} from "@vis.gl/react-google-maps";
import { useMemo } from "react";
import { FaExclamation } from "react-icons/fa";
import { MdOutlinePersonPinCircle } from "react-icons/md";
import { BsPersonRaisedHand, BsPersonStanding } from "react-icons/bs";
import { IoIosBriefcase } from "react-icons/io";

export type MapSearchMode = "workers" | "jobs";

export type MapPoint = {
  id: number;
  lat: number;
  lng: number;
  active?: boolean;
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
  center?: { latitude: number; longitude: number; zoom?: number };
  className?: string;
};

function getMarkerIcon(searchMode: MapSearchMode, active: boolean) {
  if (searchMode === "workers") {
    return {
      Icon: active ? BsPersonRaisedHand : BsPersonStanding,
      color: active ? "red" : "green",
    };
  }

  return {
    Icon: active ? FaExclamation : IoIosBriefcase,
    color: active ? "red" : "blue",
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
  const items = [
    { active: false, label: labels.standard },
    { active: true, label: labels.active },
  ] as const;

  return (
    <div
      className="pointer-events-none absolute start-3 bottom-3 z-10 flex flex-col gap-1.5 rounded-md border border-border bg-surface/95 px-3 py-2 shadow-sm backdrop-blur-sm"
      aria-label="Map legend"
    >
      {items.map(({ active, label }) => {
        const { Icon, color } = getMarkerIcon(searchMode, active);
        return (
          <div key={label} className="flex items-center gap-2">
            <Icon
              className={`shrink-0 drop-shadow-sm ${active ? "size-6" : "size-5"}`}
              color={color}
              aria-hidden
            />
            <span className="text-xs text-foreground">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function MapMarkerContent({
  searchMode,
  active,
  hovered,
  title,
}: {
  searchMode: MapSearchMode;
  active: boolean;
  hovered: boolean;
  title?: string;
}) {
  const { Icon, color } = getMarkerIcon(searchMode, active);
  const iconClassName = active
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

export function ClusteredMap({
  className,
  searchMode,
  searchModeLabel,
  legendLabels,
  points,
  selectedId = null,
  hoveredId = null,
  onHoverChange,
  onSelect,
  center,
}: Props) {
  const defaultCenter = useMemo(
    () =>
      center
        ? { lat: center.latitude, lng: center.longitude }
        : { lat: 52.950001, lng: -1.15 },
    [center]
  );

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const mapId =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || "DEMO_MAP_ID";

  if (!apiKey) {
    return (
      <div
        className={`flex items-center justify-center bg-surface p-4 text-sm text-muted ${className ?? ""}`}
      >
        Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the map.
      </div>
    );
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <SearchModeBadge mode={searchMode} label={searchModeLabel} />
      {legendLabels ? (
        <MapLegend searchMode={searchMode} labels={legendLabels} />
      ) : null}
      <APIProvider apiKey={apiKey} libraries={["marker"]}>
        <Map
          className="h-full w-full"
          mapId={mapId}
          defaultZoom={center?.zoom ?? 10}
          defaultCenter={defaultCenter}
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
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
                  active={point.active ?? false}
                  hovered={hovered}
                  title={point.properties?.title ?? undefined}
                />
              </AdvancedMarker>
            );
          })}
        </Map>
      </APIProvider>
    </div>
  );
}
