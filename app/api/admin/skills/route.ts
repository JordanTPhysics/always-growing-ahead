import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/auth";
import { findOrCreateSkill } from "@/lib/db/repositories/skills";
import {
  getSkillModerationById,
  listSkillModeration,
  updateSkillModerationStatus,
} from "@/lib/db/repositories/skill-moderation";

const schema = z.object({
  id: z.number().int().positive(),
  action: z.enum(["approve", "reject"]),
});

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
