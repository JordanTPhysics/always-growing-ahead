import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api/auth";
import { findOrCreateSkill } from "@/lib/db/repositories/skills";
import {
  getSkillModerationById,
  listSkillModeration,
  updateSkillModerationStatus,
} from "@/lib/db/repositories/skill-moderation";
import { isAdmin } from "@/lib/db/repositories/users";

const schema = z.object({
  id: z.number().int().positive(),
  action: z.enum(["approve", "reject"]),
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

  const skills = await listSkillModeration("pending");
  return NextResponse.json({ skills });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid moderation action");

  const requestToModerate = await getSkillModerationById(parsed.data.id);
  if (!requestToModerate || requestToModerate.status !== "pending") {
    return jsonError("Moderation request not found", 404);
  }

  if (parsed.data.action === "approve") {
    await findOrCreateSkill(requestToModerate.proposed_name);
  }
  await updateSkillModerationStatus(
    requestToModerate.id,
    parsed.data.action === "approve" ? "approved" : "rejected"
  );

  return NextResponse.json({ ok: true });
}
