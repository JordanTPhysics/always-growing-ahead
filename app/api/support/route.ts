import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { jsonError } from "@/lib/api/auth";
import { createSupportQuery } from "@/lib/db/repositories/support-queries";
import { logAnalyticsEvent } from "@/lib/db/repositories/analytics";

const schema = z.object({
  name: z.string().trim().max(100).optional().nullable(),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional().nullable(),
  message: z.string().trim().min(10).max(5000),
  locale: z.string().trim().max(10).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid support query");

  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  const email =
    userId && session?.user?.email
      ? session.user.email
      : parsed.data.email.trim().toLowerCase();

  const query = await createSupportQuery({
    userId,
    name: parsed.data.name,
    email,
    phone: parsed.data.phone,
    message: parsed.data.message,
    locale: parsed.data.locale,
  });

  await logAnalyticsEvent({
    userId,
    eventName: "support_query",
    properties: { queryId: query.id },
  });

  return NextResponse.json({ ok: true, id: query.id }, { status: 201 });
}
