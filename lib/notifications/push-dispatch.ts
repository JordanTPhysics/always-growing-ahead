import { listTokensForUser } from "@/lib/db/repositories/device-tokens";

/**
 * Best-effort FCM dispatch. When FIREBASE_SERVER_KEY is unset, tokens are still
 * stored and in-app notifications remain the primary channel.
 */
export async function dispatchPushToUser(
  userId: number,
  payload: { title: string; body: string; linkUrl?: string | null }
): Promise<void> {
  const key = process.env.FIREBASE_SERVER_KEY;
  if (!key) return;

  const tokens = await listTokensForUser(userId);
  if (tokens.length === 0) return;

  await Promise.allSettled(
    tokens.map(async (row) => {
      await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          Authorization: `key=${key}`,
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
    })
  );
}
