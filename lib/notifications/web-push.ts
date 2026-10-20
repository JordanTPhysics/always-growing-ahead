import {
  sendNotification,
  setVapidDetails,
  WebPushError,
  type PushSubscription,
} from "web-push";

export type WebPushPayload = {
  title: string;
  body: string;
  linkUrl?: string | null;
};

let configured = false;

export function isWebPushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim()
  );
}

export function getVapidPublicKey(): string | null {
  const key = process.env.VAPID_PUBLIC_KEY?.trim();
  return key || null;
}

function configure(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return false;
  if (!configured) {
    setVapidDetails(
      process.env.VAPID_SUBJECT?.trim() || "mailto:admin@alwaysgrowingahead.com",
      publicKey,
      privateKey
    );
    configured = true;
  }
  return true;
}

export function isStaleWebPushError(err: unknown): boolean {
  return (
    err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)
  );
}

export async function sendWebPush(
  subscriptionJson: string,
  payload: WebPushPayload
): Promise<void> {
  if (!configure()) return;
  const subscription = JSON.parse(subscriptionJson) as PushSubscription;
  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    throw new Error("Invalid push subscription");
  }
  await sendNotification(
    subscription,
    JSON.stringify({
      title: payload.title,
      body: payload.body,
      link: payload.linkUrl || "/notifications",
    })
  );
}
