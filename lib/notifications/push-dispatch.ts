import { deleteDeviceToken, listTokensForUser } from "@/lib/db/repositories/device-tokens";
import {
  isStaleWebPushError,
  isWebPushConfigured,
  sendWebPush,
} from "@/lib/notifications/web-push";

export type PushPayload = {
  title: string;
  body: string;
  linkUrl?: string | null;
};

/**
 * Best-effort dispatch. Browser subscriptions use VAPID web push.
 * iOS and Android tokens use FCM when FIREBASE_SERVER_KEY is set.
 * In-app notifications remain the primary channel.
 */
export async function dispatchPushToUser(
  userId: number,
  payload: PushPayload
): Promise<void> {
  const fcmKey = process.env.FIREBASE_SERVER_KEY;
  if (!fcmKey && !isWebPushConfigured()) return;

  let tokens;
  try {
    tokens = await listTokensForUser(userId);
  } catch (err) {
    console.error("dispatchPushToUser", err);
    return;
  }
  if (tokens.length === 0) return;

  await Promise.allSettled(
    tokens.map(async (row) => {
      try {
        if (row.platform === "web") {
          await sendWebPush(row.token, payload);
          return;
        }
        if (!fcmKey) return;
        await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            Authorization: `key=${fcmKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: row.token,
            notification: {
              title: payload.title,
              body: payload.body,
            },
            data: payload.linkUrl ? { link: payload.linkUrl } : undefined,
          }),
        });
      } catch (err) {
        const invalidSubscription =
          err instanceof Error && err.message === "Invalid push subscription";
        if (
          row.platform === "web" &&
          (isStaleWebPushError(err) ||
            err instanceof SyntaxError ||
            invalidSubscription)
        ) {
          await deleteDeviceToken(row.token, userId).catch(() => undefined);
          return;
        }
        console.error("dispatchPushToUser", userId, err);
      }
    })
  );
}

export async function dispatchPushToUsers(
  userIds: number[],
  payload: PushPayload
): Promise<void> {
  const pending = [...new Set(userIds)];
  const workers = Math.min(8, pending.length);
  if (workers === 0) return;

  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (pending.length > 0) {
        const userId = pending.shift();
        if (userId == null) return;
        await dispatchPushToUser(userId, payload);
      }
    })
  );
}
