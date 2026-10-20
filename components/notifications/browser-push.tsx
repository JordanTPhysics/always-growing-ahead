"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isNativePlatform } from "@/lib/native/platform";
import {
  enableBrowserPush,
  syncBrowserPushSubscription,
  type BrowserPushResult,
} from "@/lib/notifications/browser-push-client";

export function BrowserPushSync() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (isNativePlatform()) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    void syncBrowserPushSubscription();
  }, [status]);

  return null;
}

export function BrowserPushSettings() {
  const t = useTranslations("notifications");
  const { status } = useSession();
  const [state, setState] = useState<BrowserPushResult | "hidden" | "ready">(
    "hidden"
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || isNativePlatform()) {
      setState("hidden");
      return;
    }
    if (
      typeof Notification === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    if (Notification.permission === "granted") {
      void syncBrowserPushSubscription().then((result) => {
        setState(result === "unsupported" ? "error" : result);
      });
      return;
    }
    setState("ready");
  }, [status]);

  if (state === "hidden") return null;

  async function onEnable() {
    setBusy(true);
    setState(await enableBrowserPush());
    setBusy(false);
  }

  const message =
    state === "granted"
      ? t("pushEnabled")
      : state === "denied"
        ? t("pushDenied")
        : state === "unsupported"
          ? t("pushUnsupported")
          : state === "unconfigured"
            ? t("pushUnavailable")
            : state === "error"
              ? t("pushError")
              : t("pushPrompt");

  return (
    <Card elevation="nested" className="p-4">
      <h2 className="font-medium">{t("pushTitle")}</h2>
      <p className="mt-1 text-sm text-muted">{message}</p>
      {state === "ready" || state === "error" ? (
        <Button
          type="button"
          className="mt-3"
          disabled={busy}
          onClick={() => void onEnable()}
        >
          {busy ? t("pushEnabling") : t("enablePush")}
        </Button>
      ) : null}
    </Card>
  );
}
