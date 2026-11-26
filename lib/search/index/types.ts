export const SEARCH_ENTITY_TYPES = [
  "job",
  "worker",
  "employer",
  "education",
  "marketplace",
] as const;

export type SearchEntityType = (typeof SEARCH_ENTITY_TYPES)[number];

export function isSearchEntityType(value: string): value is SearchEntityType {
  return (SEARCH_ENTITY_TYPES as readonly string[]).includes(value);
}
