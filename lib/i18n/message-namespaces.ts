/** Namespaces with JSON files under messages/{locale}/ */
export const messageNamespaces = [
  "common",
  "auth",
  "worker-profile",
  "employer-profile",
  "jobs",
  "job-search",
  "worker-search",
  "billing",
  "notifications",
  "admin",
  "education",
  "help",
  "pricing",
] as const;

export type MessageNamespace = (typeof messageNamespaces)[number];

export function isMessageNamespace(value: string): value is MessageNamespace {
  return (messageNamespaces as readonly string[]).includes(value);
}
