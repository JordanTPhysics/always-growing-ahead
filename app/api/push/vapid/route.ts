import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { getVapidPublicKey } from "@/lib/notifications/web-push";

export const runtime = "nodejs";

export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) return jsonError("Browser push is not configured", 503);
  return NextResponse.json({ publicKey });
}
