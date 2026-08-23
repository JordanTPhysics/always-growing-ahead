export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else if (c !== "\r") {
      field += c;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

export function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export function blankToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

export function parseOptionalInt(
  value: string | null,
  label: string
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (value == null) return { ok: true, value: null };
  const n = Number(value);
  if (!Number.isInteger(n)) return { ok: false, error: `${label} must be an integer` };
  return { ok: true, value: n };
}

export function parseOptionalCoord(
  value: string | null,
  label: string,
  min: number,
  max: number
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (value == null) return { ok: true, value: null };
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    return { ok: false, error: `${label} must be a number between ${min} and ${max}` };
  }
  return { ok: true, value: n };
}

export function parseEnum<T extends string>(
  value: string | null,
  allowed: readonly T[],
  label: string
): { ok: true; value: T | null } | { ok: false; error: string } {
  if (value == null) return { ok: true, value: null };
  if ((allowed as readonly string[]).includes(value)) {
    return { ok: true, value: value as T };
  }
  return {
    ok: false,
    error: `${label} must be one of: ${allowed.join(", ")}`,
  };
}

export function parseOptionalBoolean(
  value: string | null,
  label: string
): { ok: true; value: boolean | null } | { ok: false; error: string } {
  if (value == null) return { ok: true, value: null };
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) {
    return { ok: true, value: true };
  }
  if (["false", "0", "no", "n"].includes(normalized)) {
    return { ok: true, value: false };
  }
  return { ok: false, error: `${label} must be true or false` };
}

export function parseSkillNames(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[|;]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

export function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
