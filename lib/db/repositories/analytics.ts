import { pool } from "@/lib/db/pool";
import type { AnalyticsEvent } from "@/lib/db/types";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

type AnalyticsEventRow = Omit<AnalyticsEvent, "properties"> & {
  properties: string | Record<string, unknown> | null;
} & RowDataPacket;

function parseAnalyticsEvent(row: AnalyticsEventRow): AnalyticsEvent {
  return {
    ...row,
    properties:
      typeof row.properties === "string"
        ? JSON.parse(row.properties)
        : row.properties,
  };
}

export async function logAnalyticsEvent(input: {
  userId?: number | null;
  eventName: string;
  properties?: Record<string, unknown> | null;
}): Promise<AnalyticsEvent> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO analytics_events (user_id, event_name, properties)
     VALUES (?, ?, ?)`,
    [
      input.userId ?? null,
      input.eventName,
      input.properties ? JSON.stringify(input.properties) : null,
    ]
  );
  const [rows] = await pool.execute<AnalyticsEventRow[]>(
    "SELECT * FROM analytics_events WHERE id = ? LIMIT 1",
    [result.insertId]
  );
  if (!rows[0]) throw new Error("Failed to load analytics event");
  return parseAnalyticsEvent(rows[0]);
}
