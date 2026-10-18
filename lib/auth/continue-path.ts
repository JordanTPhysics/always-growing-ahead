const AUTH_PATHS = new Set([
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
]);

export function isSafeAppPath(value: string | null | undefined): value is string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return false;
  if (value.includes("\\") || value.includes(":")) return false;
  return true;
}

function returnPath(value: string | null | undefined): string | null {
  if (!isSafeAppPath(value)) return null;
  const path = value.split(/[?#]/)[0];
  if (!path || path === "/" || AUTH_PATHS.has(path)) return null;
  return value;
}

export function continuePath(
  input: {
    intent?: string | null;
    next?: string | null;
  },
  mode: "sign-in" | "sign-up" = "sign-in"
): string {
  if (mode === "sign-up" && input.intent === "billing") return "/billing";
  return returnPath(input.next) ?? (input.intent === "billing" ? "/billing" : "/");
}

export function authHref(
  path: "/sign-in" | "/sign-up",
  options?: {
    next?: string | null;
    paid?: boolean;
    notice?: "education";
  }
): string {
  const params = new URLSearchParams();
  if (options?.notice) params.set("notice", options.notice);
  if (options?.paid) params.set("intent", "billing");
  const next = returnPath(options?.next);
  if (next) params.set("next", next);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function authSearchQuery(params: {
  get(name: string): string | null;
}): string {
  const next = new URLSearchParams();
  const intent = params.get("intent");
  const notice = params.get("notice");
  const returnTo = returnPath(params.get("next"));
  if (intent === "billing") next.set("intent", "billing");
  if (notice === "education") next.set("notice", "education");
  if (returnTo) next.set("next", returnTo);
  const query = next.toString();
  return query ? `?${query}` : "";
}
