import { createNotification } from "@/lib/db/repositories/notifications";
import { listAdminUserIds } from "@/lib/db/repositories/users";
import { dispatchPushToUser } from "@/lib/notifications/push-dispatch";

function preview(body: string) {
  const trimmed = body.trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed;
}

export async function notifyAdminsOfUserMessage(body: string) {
  const title = "New live chat message";
  const text = preview(body);
  const linkUrl = "/admin?tab=chat";
  const adminIds = await listAdminUserIds();
  await Promise.all(
    adminIds.map(async (userId) => {
      await createNotification({
        userId,
        type: "chat_message",
        title,
        body: text,
        linkUrl,
      });
      void dispatchPushToUser(userId, { title, body: text, linkUrl });
    })
  );
}

export async function notifyUserOfAdminReply(userId: number, body: string) {
  const title = "Admin replied to your chat";
  const text = preview(body);
  await createNotification({
    userId,
    type: "chat_message",
    title,
    body: text,
    linkUrl: "/",
  });
  void dispatchPushToUser(userId, { title, body: text, linkUrl: "/" });
}
