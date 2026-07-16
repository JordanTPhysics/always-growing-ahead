"use client";

import {
  APIProvider,
  InfoWindow,
  Map,
  Marker,
} from "@vis.gl/react-google-maps";
import { useMemo, useState } from "react";

export type MapPoint = {
  id: number;
  lat: number;
  lng: number;
  properties?: Record<string, string | null | undefined>;
};

type Props = {
  points: MapPoint[];
  selectedId?: number | null;
  onSelect: (id: number) => void;
  center?: { latitude: number; longitude: number; zoom?: number };
  className?: string;
};

export function ClusteredMap({
  className,
  points,
  selectedId = null,
  onSelect,
  center,
}: Props) {
  const [hoverId, setHoverId] = useState<number | null>(null);

  const activeId = hoverId ?? selectedId;
  const activePoint = useMemo(
    () => points.find((point) => point.id === activeId) ?? null,
    [points, activeId]
  );

  const defaultCenter = useMemo(
    () =>
      center
        ? { lat: center.latitude, lng: center.longitude }
        : { lat: 52.950001, lng: -1.15 },
    [center]
  );

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

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
    <div className={className}>
      <APIProvider apiKey={apiKey}>
        <Map
          className="h-full w-full"
          defaultZoom={center?.zoom ?? 10}
          defaultCenter={defaultCenter}
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          {points.map((point) => (
            <Marker
              key={point.id}
              position={{ lat: point.lat, lng: point.lng }}
              title={point.properties?.title ?? undefined}
              onClick={() => onSelect(point.id)}
              onMouseOver={() => setHoverId(point.id)}
              onMouseOut={() => setHoverId(null)}
            />
          ))}

          {activePoint ? (
            <InfoWindow
              position={{ lat: activePoint.lat, lng: activePoint.lng }}
              onClose={() => setHoverId(null)}
            >
              <div>
                <h3>{activePoint.properties?.title}</h3>
              </div>
            </InfoWindow>
          ) : null}
        </Map>
      </APIProvider>
    </div>
  );
}
