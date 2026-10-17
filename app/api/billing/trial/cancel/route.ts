import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api/auth";
import { cancelTrial, getTrialForUser } from "@/lib/db/repositories/trials";

export async function POST() {
  const { session, error } = await requireSession();
  if (error) return error;

  const trial = await getTrialForUser(Number(session.user.id));
  if (
    !trial ||
    trial.status !== "active" ||
    new Date(trial.trial_ends_at).getTime() <= Date.now()
  ) {
    return jsonError("No active trial to cancel", 404);
  }

  const cancelled = await cancelTrial(trial.id);
  if (!cancelled) return jsonError("No active trial to cancel", 404);
  return NextResponse.json({ ok: true });
}
