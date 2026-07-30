"use client";

import {
  AdvancedMarker,
  APIProvider,
  Map,
} from "@vis.gl/react-google-maps";
import { useMemo, useState } from "react";
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

type Props = {
  searchMode: MapSearchMode;
  searchModeLabel?: string;
  points: MapPoint[];
  selectedId?: number | null;
  onSelect: (id: number) => void;
  center?: { latitude: number; longitude: number; zoom?: number };
  className?: string;
};

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
  const iconClassName = active
    ? "size-8 text-amber-600 drop-shadow-md"
    : "size-7 text-foreground drop-shadow-sm";

  let Icon = IoIosBriefcase;
  if (searchMode === "workers") {
    Icon = active ? BsPersonRaisedHand : BsPersonStanding;
  } else {
    Icon = active ? FaExclamation : IoIosBriefcase;
  }

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
        <Icon
          className={iconClassName}
          color={active ? "red" : searchMode === "workers" ? "green" : "blue"}
          aria-hidden
        />
      </div>
    </div>
  );
}

export function ClusteredMap({
  className,
  searchMode,
  searchModeLabel,
  points,
  selectedId = null,
  onSelect,
  center,
}: Props) {
  const [hoverId, setHoverId] = useState<number | null>(null);

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
            const hovered = hoverId === point.id;
            return (
              <AdvancedMarker
                key={point.id}
                position={{ lat: point.lat, lng: point.lng }}
                onClick={() => onSelect(point.id)}
                onMouseEnter={() => setHoverId(point.id)}
                onMouseLeave={() => setHoverId(null)}
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
