import { jsonError, requireSession } from "@/lib/api/auth";
import { isAdmin } from "@/lib/db/repositories/users";

export async function requireAdmin() {
  const { session, error } = await requireSession();
  if (error) return { session: null, error };
  if (!(await isAdmin(Number(session.user.id)))) {
    return { session: null, error: jsonError("Forbidden", 403) };
  }
  return { session, error: null };
}
