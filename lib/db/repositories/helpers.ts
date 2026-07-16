function parseJsonArray<T>(value: unknown): T[] | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function mapWorkerRow<T extends { desired_job_types?: unknown }>(
  row: T
): T & { desired_job_types: ReturnType<typeof parseJsonArray> } {
  return {
    ...row,
    desired_job_types: parseJsonArray(row.desired_job_types),
  };
}

export function pointParams(
  lat: number | null | undefined,
  lng: number | null | undefined
): [number | null, number | null, number | null, number | null] {
  if (lat == null || lng == null) {
    return [null, null, null, null];
  }
  return [lat, lng, lng, lat];
}
