import { NextResponse } from "next/server";
import { searchDirectoryBusinesses } from "@/lib/db/repositories/employers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius");
  const field = searchParams.get("field");
  const filters = {
    lat: lat != null && lat !== "" ? Number(lat) : undefined,
    lng: lng != null && lng !== "" ? Number(lng) : undefined,
    radiusMeters:
      radius === "nationwide" || radius == null || radius === ""
        ? null
        : Number(radius),
    field: field?.trim() || undefined,
  };

  const businesses = await searchDirectoryBusinesses(filters);

  return NextResponse.json({ businesses });
}
