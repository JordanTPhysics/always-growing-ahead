import { createHash } from "node:crypto";
import { pool } from "@/lib/db/pool";
import type { DevicePlatform, DeviceToken } from "@/lib/db/types";
import type { RowDataPacket } from "mysql2";

type DeviceTokenRow = DeviceToken & RowDataPacket;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function registerDeviceToken(input: {
  userId: number;
  token: string;
  platform: DevicePlatform;
}): Promise<DeviceToken> {
  const tokenHash = hashToken(input.token);
  await pool.execute(
    `INSERT INTO device_tokens (user_id, token, token_hash, platform)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       user_id = VALUES(user_id),
       token = VALUES(token),
       platform = VALUES(platform)`,
    [input.userId, input.token, tokenHash, input.platform]
  );
  const [rows] = await pool.execute<DeviceTokenRow[]>(
    "SELECT * FROM device_tokens WHERE token_hash = ? LIMIT 1",
    [tokenHash]
  );
  if (!rows[0]) throw new Error("Failed to load device token");
  return rows[0];
}

export async function deleteDeviceToken(
  token: string,
  userId: number
): Promise<void> {
  await pool.execute(
    "DELETE FROM device_tokens WHERE token_hash = ? AND user_id = ?",
    [hashToken(token), userId]
  );
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
