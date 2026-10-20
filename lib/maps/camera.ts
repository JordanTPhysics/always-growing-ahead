import { UK_MAP_CENTER } from "@/lib/search/constants";

export const MAP_INTRO_STORAGE_KEY = "aga.mapIntroPlayed";
export const MAP_FOCUS_STORAGE_KEY = "aga.mapFocus";

/** Zoom that shows a local postcode district rather than a single street. */
export const POSTCODE_AREA_ZOOM = 12;

export type MapCameraTarget = {
  lat: number;
  lng: number;
  zoom: number;
};

export const UK_OVERVIEW: MapCameraTarget = {
  lat: UK_MAP_CENTER.latitude,
  lng: UK_MAP_CENTER.longitude,
  zoom: UK_MAP_CENTER.zoom,
};

const EARTH_CIRCUMFERENCE_M = 40075016.686;

export function prefersReducedMapMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

function zoomForRadius(
  radiusMeters: number,
  latitude: number,
  viewport: { width: number; height: number }
): number {
  if (radiusMeters < 250) return 13;
  const minSide = Math.max(Math.min(viewport.width, viewport.height), 240);
  const paddedRadius = radiusMeters * 1.35;
  const metersPerPixel = (2 * paddedRadius) / (minSide * 0.82);
  const cos = Math.cos((latitude * Math.PI) / 180);
  const zoom = Math.log2(
    (EARTH_CIRCUMFERENCE_M * Math.max(cos, 0.01)) / (256 * metersPerPixel)
  );
  return Math.max(5, Math.min(14, zoom));
}

/**
 * Centre on the mean of the points and zoom so the nearest 90% fit
 * (all of them when there are only a few).
 */
export function cameraForResults(
  points: { lat: number; lng: number }[],
  viewport: { width: number; height: number }
): MapCameraTarget | null {
  if (points.length === 0) return null;

  let sumLat = 0;
  let sumLng = 0;
  for (const point of points) {
    sumLat += point.lat;
    sumLng += point.lng;
  }
  const lat = sumLat / points.length;
  const lng = sumLng / points.length;
  if (points.length === 1) return { lat, lng, zoom: 13 };

  const distances = points
    .map((point) => haversineMeters(lat, lng, point.lat, point.lng))
    .sort((a, b) => a - b);
  const coverIndex =
    points.length <= 8
      ? distances.length - 1
      : Math.min(distances.length - 1, Math.ceil(points.length * 0.9) - 1);
  const radius = distances[coverIndex] ?? 0;
  return { lat, lng, zoom: zoomForRadius(radius, lat, viewport) };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Smoothly move the map. Returns a cancel function. */
export function animateMapCamera(
  map: google.maps.Map,
  target: MapCameraTarget,
  durationMs = 1600
): () => void {
  const apply = (lat: number, lng: number, zoom: number) => {
    map.moveCamera({ center: { lat, lng }, zoom });
  };

  if (prefersReducedMapMotion() || durationMs <= 0) {
    apply(target.lat, target.lng, target.zoom);
    return () => {};
  }

  const startCenter = map.getCenter();
  const startZoom = map.getZoom() ?? target.zoom;
  if (!startCenter) {
    apply(target.lat, target.lng, target.zoom);
    return () => {};
  }

  const fromLat = startCenter.lat();
  const fromLng = startCenter.lng();
  const started = performance.now();
  let frame = 0;
  let stopped = false;

  const drag = map.addListener("dragstart", () => finish());
  const onWheel = () => finish();
  map.getDiv().addEventListener("wheel", onWheel, { passive: true });

  const tick = (now: number) => {
    if (stopped) return;
    const t = Math.min(1, (now - started) / durationMs);
    const eased = easeInOutCubic(t);
    apply(
      fromLat + (target.lat - fromLat) * eased,
      fromLng + (target.lng - fromLng) * eased,
      startZoom + (target.zoom - startZoom) * eased
    );
    if (t < 1) {
      frame = requestAnimationFrame(tick);
    } else {
      finish();
    }
  };

  function finish() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    drag.remove();
    map.getDiv().removeEventListener("wheel", onWheel);
  }

  frame = requestAnimationFrame(tick);
  return finish;
}
