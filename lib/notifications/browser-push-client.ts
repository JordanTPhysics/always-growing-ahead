export type BrowserPushResult =
  | "granted"
  | "denied"
  | "unsupported"
  | "unconfigured"
  | "error";

function supported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export async function syncBrowserPushSubscription(): Promise<
  "granted" | "unconfigured" | "error" | "unsupported"
> {
  if (!supported()) return "unsupported";
  if (Notification.permission !== "granted") return "error";

  const keyResponse = await fetch("/api/push/vapid");
  if (keyResponse.status === 503) return "unconfigured";
  if (!keyResponse.ok) return "error";

  const { publicKey } = (await keyResponse.json()) as { publicKey?: string };
  if (!publicKey) return "unconfigured";

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    const response = await fetch("/api/device-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: JSON.stringify(subscription),
        platform: "web",
      }),
    });
    return response.ok ? "granted" : "error";
  } catch (err) {
    console.error("syncBrowserPushSubscription", err);
    return "error";
  }
}

export async function enableBrowserPush(): Promise<BrowserPushResult> {
  if (!supported()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  const saved = await syncBrowserPushSubscription();
  if (saved === "granted") return "granted";
  if (saved === "unconfigured") return "unconfigured";
  if (saved === "unsupported") return "unsupported";
  return "error";
}
