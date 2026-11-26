export function normalizeSearchQuery(raw: string) {
  return raw.replace(/\s+/g, " ").trim().slice(0, 80);
}

export function snippet(
  text: string | null | undefined,
  query: string,
  max = 140
): string | null {
  if (!text) return null;
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return null;

  const needle = query.trim().toLocaleLowerCase();
  const idx = needle ? clean.toLocaleLowerCase().indexOf(needle) : -1;
  if (idx < 0) {
    return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
  }

  const start = Math.max(0, idx - 48);
  const end = Math.min(clean.length, idx + needle.length + 80);
  let slice = clean.slice(start, end).trim();
  if (start > 0) slice = `…${slice}`;
  if (end < clean.length) slice = `${slice}…`;
  return slice;
}

export function likePattern(query: string, mode: "contains" | "prefix") {
  const escaped = query.replace(/[\\%_]/g, (char) => `\\${char}`);
  return mode === "prefix" ? `${escaped}%` : `%${escaped}%`;
}

export function searchTokens(text: string): string[] {
  return text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/**
 * LIKE pattern for a column wrapped by {@link boundedTextColumn}.
 * Spaces around the phrase keep "hair" from matching "chair".
 */
export function boundedLikePattern(
  query: string,
  mode: "contains" | "prefix"
): string | null {
  const phrase = searchTokens(query).join(" ");
  if (!phrase) return null;
  const escaped = phrase.replace(/[\\%_]/g, (char) => `\\${char}`);
  return mode === "prefix" ? ` ${escaped} %` : `% ${escaped} %`;
}

/** Lowercase text with punctuation turned into spaces, padded by one space. */
export function boundedTextColumn(column: string): string {
  return `CONCAT(' ', TRIM(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(COALESCE(${column}, '')), '[[:punct:]]+', ' '), '[[:space:]]+', ' ')), ' ')`;
}
