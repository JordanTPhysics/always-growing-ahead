import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api/auth";
import {
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/db/repositories/notifications";

const patchSchema = z.union([
  z.object({ id: z.number().int().positive() }),
  z.object({ all: z.literal(true) }),
]);

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const notifications = await listNotificationsForUser(Number(session.user.id), 50);
  return NextResponse.json({ notifications });
}

export async function PATCH(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid notification");

  const userId = Number(session.user.id);
  if ("all" in parsed.data) {
    await markAllNotificationsRead(userId);
  } else {
    await markNotificationRead(parsed.data.id, userId);
  }

  return NextResponse.json({ ok: true });
}
