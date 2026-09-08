import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/auth";
import { notifyUserOfAdminReply } from "@/lib/chat/notify";
import {
  createMessage,
  getConversationById,
  getUserAccountSummary,
  listMessages,
  markConversationRead,
} from "@/lib/db/repositories/chat";

const createSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const conversationId = Number((await params).id);
  if (!Number.isInteger(conversationId) || conversationId < 1) {
    return jsonError("Invalid conversation");
  }

  const conversation = await getConversationById(conversationId);
  if (!conversation) return jsonError("Conversation not found", 404);

  await markConversationRead(conversation.id, "admin");
  const [messages, user] = await Promise.all([
    listMessages(conversation.id),
    getUserAccountSummary(conversation.user_id),
  ]);

  return NextResponse.json({ conversation, messages, user });
}

export async function POST(request: Request, { params }: Params) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const conversationId = Number((await params).id);
  if (!Number.isInteger(conversationId) || conversationId < 1) {
    return jsonError("Invalid conversation");
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid chat message");

  const conversation = await getConversationById(conversationId);
  if (!conversation) return jsonError("Conversation not found", 404);

  const message = await createMessage({
    conversationId: conversation.id,
    senderId: Number(session.user.id),
    senderRole: "admin",
    body: parsed.data.body,
  });
  await markConversationRead(conversation.id, "admin");
  await notifyUserOfAdminReply(conversation.user_id, parsed.data.body);

  return NextResponse.json({ conversation, message }, { status: 201 });
}
