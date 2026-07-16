/** Approximate geographic centre of Great Britain for default map view. */
export const UK_MAP_CENTER = {
  latitude: 54.5,
  longitude: -2.5,
  zoom: 5.6,
} as const;

/** Nottingham city centre — used for demo / mock map focus. */
export const NOTTINGHAM_CENTER = {
  latitude: 52.950001,
  longitude: -1.15,
  zoom: 11,
} as const;

export const RADIUS_PRESETS_MI = [1, 5, 10, 25] as const;

export type RadiusMiles = (typeof RADIUS_PRESETS_MI)[number] | "nationwide";

export function milesToMeters(miles: number): number {
  return miles * 1609.344;
}

export function metersToMiles(meters: number): number {
  return meters / 1609.344;
}

export function formatDistance(meters: number | null | undefined): string | null {
  if (meters == null || Number.isNaN(meters)) return null;
  const miles = metersToMiles(meters);
  if (miles < 0.1) return "< 0.1 mi";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

export function formatSalary(
  min: number | null | undefined,
  max: number | null | undefined,
  type?: string | null
): string | null {
  if (min == null && max == null) return null;
  const range =
    min != null && max != null
      ? `£${min.toLocaleString()}–£${max.toLocaleString()}`
      : min != null
        ? `From £${min.toLocaleString()}`
        : `Up to £${max!.toLocaleString()}`;
  return type ? `${range} / ${type}` : range;
}
