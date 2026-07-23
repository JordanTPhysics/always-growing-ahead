import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/auth";
import { listRecentUsers, setUserRole } from "@/lib/db/repositories/users";

const schema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(["user", "admin"]),
});

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
