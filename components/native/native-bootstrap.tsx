"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/lib/i18n/routing";
import { isNativePlatform } from "@/lib/native/platform";
import {
  listenForAppUrlOpen,
  syncPushTokenWithServer,
} from "@/lib/native/push";

/** Registers push tokens and deep-link handlers when running in Capacitor. */
export function NativeBootstrap() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isNativePlatform()) return;
    if (status !== "authenticated" || !session?.user) return;
    void syncPushTokenWithServer();
  }, [session?.user, status]);

  useEffect(() => {
    if (!isNativePlatform()) return;
    return listenForAppUrlOpen((path) => {
      const localeMatch = path.match(/^\/([a-z]{2,3})(\/.*)?$/);
      if (localeMatch?.[2]) {
        router.push(localeMatch[2] as "/");
      } else if (path.startsWith("/")) {
        router.push(path as "/");
      }
    });
  }, [router]);

  return null;
}
