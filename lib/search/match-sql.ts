import { boundedLikePattern, boundedTextColumn } from "@/lib/search/text";

export type CompiledTerm = {
  contains: string;
  prefix: string;
};

export function compileSearchTerms(terms: string[]): CompiledTerm[] {
  const compiled: CompiledTerm[] = [];
  const seen = new Set<string>();
  for (const term of terms) {
    const contains = boundedLikePattern(term, "contains");
    const prefix = boundedLikePattern(term, "prefix");
    if (!contains || !prefix || seen.has(contains)) continue;
    seen.add(contains);
    compiled.push({ contains, prefix });
  }
  return compiled;
}

export function textMatch(column: string, pattern: string, params: string[]): string {
  params.push(pattern);
  return `${boundedTextColumn(column)} LIKE ?`;
}

export function anyTextMatch(
  columns: string[],
  patterns: string[],
  params: string[]
): string | null {
  if (columns.length === 0 || patterns.length === 0) return null;
  const parts: string[] = [];
  for (const pattern of patterns) {
    for (const column of columns) parts.push(textMatch(column, pattern, params));
  }
  return parts.join(" OR ");
}

export function translationMatch(
  entityType: "job" | "worker" | "employer" | "education" | "marketplace",
  idExpression: string,
  origin: "human" | "machine",
  patterns: string[],
  params: string[]
): string | null {
  if (patterns.length === 0) return null;
  const likes = patterns.map((pattern) => textMatch("t.text", pattern, params));
  return `EXISTS (
    SELECT 1 FROM content_translations t
    WHERE t.entity_type = '${entityType}'
      AND t.entity_id = ${idExpression}
      AND t.origin = '${origin}'
      AND (${likes.join(" OR ")})
  )`;
}

export function joinOr(parts: Array<string | null | undefined | false>): string | null {
  const present = parts.filter((part): part is string => Boolean(part));
  return present.length > 0 ? present.join(" OR ") : null;
}
