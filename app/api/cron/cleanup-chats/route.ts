import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { deleteExpiredConversations } from "@/lib/db/repositories/chat";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header =
    request.headers.get("authorization") ??
    request.headers.get("x-cron-secret") ??
    "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  return token === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return jsonError("Unauthorized", 401);
  const deleted = await deleteExpiredConversations();
  return NextResponse.json({ ok: true, deleted });
}

export async function GET(request: Request) {
  return POST(request);
}
