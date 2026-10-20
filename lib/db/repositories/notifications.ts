import { pool } from "@/lib/db/pool";
import type { Notification } from "@/lib/db/types";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type NotificationRow = Notification & RowDataPacket;

export async function createNotification(input: {
  userId: number;
  type: string;
  title: string;
  body: string;
  linkUrl?: string | null;
}): Promise<Notification> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO notifications (user_id, type, title, body, link_url)
     VALUES (?, ?, ?, ?, ?)`,
    [input.userId, input.type, input.title, input.body, input.linkUrl ?? null]
  );
  const [rows] = await pool.execute<NotificationRow[]>(
    "SELECT * FROM notifications WHERE id = ? LIMIT 1",
    [result.insertId]
  );
  if (!rows[0]) throw new Error("Failed to load created notification");
  return rows[0];
}

export async function listNotificationsForUser(
  userId: number,
  limit = 50
): Promise<Notification[]> {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const [rows] = await pool.execute<NotificationRow[]>(
    `SELECT * FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ${safeLimit}`,
    [userId]
  );
  return rows;
}

export async function markNotificationRead(
  notificationId: number,
  userId: number
): Promise<void> {
  await pool.execute(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  );
}

export async function createNotificationsForUsers(
  userIds: number[],
  input: {
    type: string;
    title: string;
    body: string;
    linkUrl?: string | null;
  }
): Promise<void> {
  const ids = [
    ...new Set(userIds.filter((id) => Number.isInteger(id) && id > 0)),
  ];
  if (ids.length === 0) return;

  const title = input.title.slice(0, 255);
  const type = input.type.slice(0, 50);
  const linkUrl = input.linkUrl ?? null;

  const chunkSize = 100;
  for (let offset = 0; offset < ids.length; offset += chunkSize) {
    const chunk = ids.slice(offset, offset + chunkSize);
    const placeholders = chunk.map(() => "(?, ?, ?, ?, ?)").join(", ");
    const params = chunk.flatMap((userId) => [
      userId,
      type,
      title,
      input.body,
      linkUrl,
    ]);
    await pool.execute(
      `INSERT INTO notifications (user_id, type, title, body, link_url)
       VALUES ${placeholders}`,
      params
    );
  }
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  await pool.execute(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE user_id = ?`,
    [userId]
  );
}
