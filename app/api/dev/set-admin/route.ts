import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api/auth";
import { setUserRole } from "@/lib/db/repositories/users";

const schema = z.object({ admin: z.boolean() });

/** Local/dev helper for accessing the admin dashboard. Disabled in production. */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return jsonError("Not available", 404);
  }

  const { session, error } = await requireSession();
  if (error) return error;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid admin setting");

  await setUserRole(
    Number(session.user.id),
    parsed.data.admin ? "admin" : "user"
  );
  return NextResponse.json({ ok: true, admin: parsed.data.admin });
}
