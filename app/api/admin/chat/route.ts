import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin";
import { listConversationsForAdmin } from "@/lib/db/repositories/chat";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const conversations = await listConversationsForAdmin();
  return NextResponse.json({ conversations });
}
