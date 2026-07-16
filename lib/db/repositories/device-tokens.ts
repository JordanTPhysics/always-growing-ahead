import { pool } from "@/lib/db/pool";
import type { DevicePlatform, DeviceToken } from "@/lib/db/types";
import type { RowDataPacket } from "mysql2";

type DeviceTokenRow = DeviceToken & RowDataPacket;

export async function registerDeviceToken(input: {
  userId: number;
  token: string;
  platform: DevicePlatform;
}): Promise<DeviceToken> {
  await pool.execute(
    `INSERT INTO device_tokens (user_id, token, platform)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), platform = VALUES(platform)`,
    [input.userId, input.token, input.platform]
  );
  const [rows] = await pool.execute<DeviceTokenRow[]>(
    "SELECT * FROM device_tokens WHERE token = ? LIMIT 1",
    [input.token]
  );
  if (!rows[0]) throw new Error("Failed to load device token");
  return rows[0];
}

export async function deleteDeviceToken(
  token: string,
  userId: number
): Promise<void> {
  await pool.execute("DELETE FROM device_tokens WHERE token = ? AND user_id = ?", [
    token,
    userId,
  ]);
}

export async function listTokensForUser(
  userId: number
): Promise<DeviceToken[]> {
  const [rows] = await pool.execute<DeviceTokenRow[]>(
    "SELECT * FROM device_tokens WHERE user_id = ?",
    [userId]
  );
  return rows;
}
