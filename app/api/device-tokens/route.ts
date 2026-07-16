import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api/auth";
import {
  deleteDeviceToken,
  registerDeviceToken,
} from "@/lib/db/repositories/device-tokens";

const tokenSchema = z.object({
  token: z.string().min(1).max(4096),
});

const createSchema = tokenSchema.extend({
  platform: z.enum(["web", "ios", "android"]),
});

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid device token");

  const deviceToken = await registerDeviceToken({
    userId: Number(session.user.id),
    ...parsed.data,
  });
  return NextResponse.json({ deviceToken }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const parsed = tokenSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid device token");

  await deleteDeviceToken(parsed.data.token, Number(session.user.id));
  return NextResponse.json({ ok: true });
}
