import { NextResponse } from "next/server";
import { countCommentsForEducationResources } from "@/lib/db/repositories/education-comments";

function parseIds(raw: string | null): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = parseIds(searchParams.get("ids"));
  const counts = await countCommentsForEducationResources(ids);
  return NextResponse.json({ counts });
}
