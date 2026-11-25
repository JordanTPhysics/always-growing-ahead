import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { backfillSearchIndex, drainSearchIndex } from "@/lib/search/index/drain";

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
  const enqueued = await backfillSearchIndex();
  const drained = await drainSearchIndex({
    limit: 8,
    characterBudget: 20_000,
    order: "oldest",
  });
  return NextResponse.json({ ok: true, enqueued, ...drained });
}

export async function GET(request: Request) {
  return POST(request);
}
