import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin";
import { listSponsoredItems } from "@/lib/db/repositories/sponsored";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const items = await listSponsoredItems();
  return NextResponse.json({ items });
}
