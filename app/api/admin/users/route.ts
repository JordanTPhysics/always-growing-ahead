import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api/auth";
import {
  isAdmin,
  listRecentUsers,
  setUserRole,
} from "@/lib/db/repositories/users";

const schema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(["user", "admin"]),
});

async function requireAdmin() {
  const { session, error } = await requireSession();
  if (error) return { session: null, error };
  if (!(await isAdmin(Number(session.user.id)))) {
    return { session: null, error: jsonError("Forbidden", 403) };
  }
  return { session, error: null };
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const users = await listRecentUsers();
  return NextResponse.json({ users });
}

export async function PATCH(request: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid user role");
  if (
    parsed.data.userId === Number(session!.user.id) &&
    parsed.data.role !== "admin"
  ) {
    return jsonError("You cannot remove your own admin role");
  }

  await setUserRole(parsed.data.userId, parsed.data.role);
  return NextResponse.json({ ok: true });
}
