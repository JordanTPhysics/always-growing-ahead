import { PushNotifications } from "@capacitor/push-notifications";
import { App as CapApp } from "@capacitor/app";
import { getNativePlatform, isNativePlatform } from "@/lib/native/platform";

export async function registerForPushNotifications(): Promise<string | null> {
  if (!isNativePlatform()) return null;

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return null;

  await PushNotifications.register();

  return await new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 15_000);

    void PushNotifications.addListener("registration", (token) => {
      clearTimeout(timeout);
      resolve(token.value);
    });

    void PushNotifications.addListener("registrationError", () => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}

export async function syncPushTokenWithServer(): Promise<void> {
  const token = await registerForPushNotifications();
  if (!token) return;

  const platform = getNativePlatform();
  if (platform === "web") return;

  await fetch("/api/device-tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, platform }),
  });
}

/** Open in-app paths from push/deep links when running natively. */
export function listenForAppUrlOpen(
  onOpen: (path: string) => void
): () => void {
  if (!isNativePlatform()) return () => {};

  let remove: (() => void) | undefined;

  void CapApp.addListener("appUrlOpen", (event) => {
    try {
      const url = new URL(event.url);
      onOpen(url.pathname + url.search);
    } catch {
      // ignore malformed
    }
  }).then((handle) => {
    remove = () => {
      void handle.remove();
    };
  });

  return () => {
    remove?.();
  };
}
