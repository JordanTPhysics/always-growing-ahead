import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api/auth";
import { notifyAdminsOfUserMessage } from "@/lib/chat/notify";
import {
  countUnreadForUser,
  createMessage,
  getActiveConversationForUser,
  getOrCreateConversationForUser,
  listMessages,
  markConversationRead,
} from "@/lib/db/repositories/chat";
import { isAdmin } from "@/lib/db/repositories/users";

const createSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export async function GET(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  if (await isAdmin(Number(session.user.id))) {
    return jsonError("Admins use the admin chat inbox", 403);
  }

  const userId = Number(session.user.id);
  const metaOnly = new URL(request.url).searchParams.get("meta") === "1";
  const unread = await countUnreadForUser(userId);

  if (metaOnly) {
    return NextResponse.json({ unread });
  }

  const conversation = await getActiveConversationForUser(userId);
  if (!conversation) {
    return NextResponse.json({ conversation: null, messages: [], unread: 0 });
  }

  await markConversationRead(conversation.id, "user");
  const messages = await listMessages(conversation.id);
  return NextResponse.json({ conversation, messages, unread: 0 });
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  if (await isAdmin(Number(session.user.id))) {
    return jsonError("Admins use the admin chat inbox", 403);
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid chat message");

  const userId = Number(session.user.id);
  const conversation = await getOrCreateConversationForUser(userId);
  const message = await createMessage({
    conversationId: conversation.id,
    senderId: userId,
    senderRole: "user",
    body: parsed.data.body,
  });
  await markConversationRead(conversation.id, "user");
  await notifyAdminsOfUserMessage(parsed.data.body);

  return NextResponse.json({ conversation, message }, { status: 201 });
}
