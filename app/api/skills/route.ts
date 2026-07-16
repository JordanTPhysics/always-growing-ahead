import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api/auth";
import {
  listSkills,
  findOrCreateSkill,
  getSkillByName,
} from "@/lib/db/repositories/skills";
import { createSkillModeration } from "@/lib/db/repositories/skill-moderation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const skills = await listSkills(q);
  return NextResponse.json({ skills });
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().max(100).optional().nullable(),
});

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid skill");

  const name = parsed.data.name.trim();
  const existing = await getSkillByName(name);
  const skill =
    existing ??
    (await findOrCreateSkill(name, parsed.data.category ?? "Custom"));
  if (!existing) {
    await createSkillModeration({
      proposedName: name,
      proposedByUserId: Number(session.user.id),
      skillId: skill.id,
    });
  }
  return NextResponse.json({ skill }, { status: 201 });
}
