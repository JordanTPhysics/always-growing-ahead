"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/lib/i18n/navigation";

export function useRequireAuth() {
  const { status } = useSession();
  const router = useRouter();

  const requireAuth = useCallback(
    (action: () => void) => {
      if (status === "loading") return;
      if (status === "unauthenticated") {
        router.push("/sign-up");
        return;
      }
      action();
    },
    [status, router]
  );

  return { requireAuth, isAuthenticated: status === "authenticated" };
}
