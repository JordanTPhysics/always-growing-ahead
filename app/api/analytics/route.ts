import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { jsonError } from "@/lib/api/auth";
import { logAnalyticsEvent } from "@/lib/db/repositories/analytics";

const schema = z.object({
  event_name: z.string().trim().min(1).max(100),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid analytics event");

  const session = await auth();
  await logAnalyticsEvent({
    userId: session?.user?.id ? Number(session.user.id) : null,
    eventName: parsed.data.event_name,
    properties: parsed.data.properties,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
