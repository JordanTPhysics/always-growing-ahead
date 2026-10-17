import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { settleTrials } from "@/lib/stripe/trial";

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
  const result = await settleTrials();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return POST(request);
}
