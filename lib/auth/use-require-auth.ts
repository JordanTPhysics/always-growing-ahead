"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { authHref } from "@/lib/auth/continue-path";

export function useRequireAuth() {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const requireAuth = useCallback(
    (action: () => void, next?: string) => {
      if (status === "loading") return;
      if (status === "unauthenticated") {
        router.push(authHref("/sign-up", { next: next ?? pathname }));
        return;
      }
      action();
    },
    [pathname, status, router]
  );

  return { requireAuth, isAuthenticated: status === "authenticated" };
}
