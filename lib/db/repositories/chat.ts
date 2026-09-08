import { pool } from "@/lib/db/pool";
import type {
  ChatConversation,
  ChatConversationListItem,
  ChatMessage,
  ChatSenderRole,
  UserAccountSummary,
} from "@/lib/db/types";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export const CHAT_TTL_MS = 48 * 60 * 60 * 1000;

type ConversationRow = ChatConversation & RowDataPacket;
type MessageRow = ChatMessage & RowDataPacket;
type ConversationListRow = ChatConversationListItem & RowDataPacket;
type AccountRow = UserAccountSummary & RowDataPacket;

export async function deleteExpiredConversations(): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    "DELETE FROM chat_conversations WHERE expires_at < UTC_TIMESTAMP()"
  );
  return result.affectedRows;
}

export async function getActiveConversationForUser(
  userId: number
): Promise<ChatConversation | null> {
  await deleteExpiredConversations();
  const [rows] = await pool.execute<ConversationRow[]>(
    `SELECT * FROM chat_conversations
     WHERE user_id = ? AND expires_at >= UTC_TIMESTAMP()
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function getConversationById(
  conversationId: number
): Promise<ChatConversation | null> {
  await deleteExpiredConversations();
  const [rows] = await pool.execute<ConversationRow[]>(
    `SELECT * FROM chat_conversations
     WHERE id = ? AND expires_at >= UTC_TIMESTAMP()
     LIMIT 1`,
    [conversationId]
  );
  return rows[0] ?? null;
}

export async function createConversation(
  userId: number
): Promise<ChatConversation> {
  const expiresAt = new Date(Date.now() + CHAT_TTL_MS);
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO chat_conversations (user_id, expires_at, last_message_at)
     VALUES (?, ?, UTC_TIMESTAMP())`,
    [userId, expiresAt]
  );
  const conversation = await getConversationById(result.insertId);
  if (!conversation) throw new Error("Failed to load created conversation");
  return conversation;
}

export async function getOrCreateConversationForUser(
  userId: number
): Promise<ChatConversation> {
  const existing = await getActiveConversationForUser(userId);
  if (existing) return existing;
  return createConversation(userId);
}

export async function listMessages(
  conversationId: number
): Promise<ChatMessage[]> {
  const [rows] = await pool.execute<MessageRow[]>(
    `SELECT * FROM chat_messages
     WHERE conversation_id = ?
     ORDER BY created_at ASC, id ASC`,
    [conversationId]
  );
  return rows;
}

export async function createMessage(input: {
  conversationId: number;
  senderId: number;
  senderRole: ChatSenderRole;
  body: string;
}): Promise<ChatMessage> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO chat_messages (conversation_id, sender_id, sender_role, body)
     VALUES (?, ?, ?, ?)`,
    [input.conversationId, input.senderId, input.senderRole, input.body]
  );
  await pool.execute(
    `UPDATE chat_conversations
     SET last_message_at = UTC_TIMESTAMP()
     WHERE id = ?`,
    [input.conversationId]
  );
  const [rows] = await pool.execute<MessageRow[]>(
    "SELECT * FROM chat_messages WHERE id = ? LIMIT 1",
    [result.insertId]
  );
  if (!rows[0]) throw new Error("Failed to load created message");
  return rows[0];
}

export async function markConversationRead(
  conversationId: number,
  reader: ChatSenderRole
): Promise<void> {
  const column =
    reader === "admin" ? "admin_last_read_at" : "user_last_read_at";
  await pool.execute(
    `UPDATE chat_conversations
     SET ${column} = UTC_TIMESTAMP()
     WHERE id = ?`,
    [conversationId]
  );
}

export async function countUnreadForUser(userId: number): Promise<number> {
  await deleteExpiredConversations();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM chat_messages m
     JOIN chat_conversations c ON c.id = m.conversation_id
     WHERE c.user_id = ?
       AND c.expires_at >= UTC_TIMESTAMP()
       AND m.sender_role = 'admin'
       AND (c.user_last_read_at IS NULL OR m.created_at > c.user_last_read_at)`,
    [userId]
  );
  return Number(rows[0]?.total ?? 0);
}

export async function listConversationsForAdmin(): Promise<
  ChatConversationListItem[]
> {
  await deleteExpiredConversations();
  const [rows] = await pool.execute<ConversationListRow[]>(
    `SELECT
       c.*,
       u.email AS user_email,
       u.username AS user_username,
       (
         SELECT m.body
         FROM chat_messages m
         WHERE m.conversation_id = c.id
         ORDER BY m.created_at DESC, m.id DESC
         LIMIT 1
       ) AS last_message_body,
       (
         SELECT COUNT(*)
         FROM chat_messages m
         WHERE m.conversation_id = c.id
           AND m.sender_role = 'user'
           AND (c.admin_last_read_at IS NULL OR m.created_at > c.admin_last_read_at)
       ) AS unread_count,
       wp.id AS worker_profile_id,
       ep.id AS employer_profile_id
     FROM chat_conversations c
     JOIN users u ON u.id = c.user_id
     LEFT JOIN worker_profiles wp ON wp.user_id = u.id
     LEFT JOIN employer_profiles ep ON ep.user_id = u.id
     WHERE c.expires_at >= UTC_TIMESTAMP()
     ORDER BY c.last_message_at DESC`
  );
  return rows.map((row) => ({
    ...row,
    unread_count: Number(row.unread_count ?? 0),
    worker_profile_id: row.worker_profile_id
      ? Number(row.worker_profile_id)
      : null,
    employer_profile_id: row.employer_profile_id
      ? Number(row.employer_profile_id)
      : null,
  }));
}

export async function getUserAccountSummary(
  userId: number
): Promise<UserAccountSummary | null> {
  const [rows] = await pool.execute<AccountRow[]>(
    `SELECT
       u.id,
       u.email,
       u.username,
       u.phone,
       u.city,
       u.district,
       u.subscription_tier,
       u.role,
       u.email_verified_at,
       u.created_at,
       wp.id AS worker_profile_id,
       ep.id AS employer_profile_id
     FROM users u
     LEFT JOIN worker_profiles wp ON wp.user_id = u.id
     LEFT JOIN employer_profiles ep ON ep.user_id = u.id
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    worker_profile_id: row.worker_profile_id
      ? Number(row.worker_profile_id)
      : null,
    employer_profile_id: row.employer_profile_id
      ? Number(row.employer_profile_id)
      : null,
  };
}
