import { NextResponse } from "next/server";
import {
  geocodeQuery,
  resolvePostcodeSuggestion,
  suggestPostcodes,
} from "@/lib/geocoding/postcodes";
import { jsonError } from "@/lib/api/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const resolve = searchParams.get("resolve");
  const id = searchParams.get("id");
  const label = searchParams.get("label");

  if (resolve === "1") {
    if (id && label) {
      const result = await resolvePostcodeSuggestion({ id, label });
      if (!result) return jsonError("Could not resolve location", 404);
      return NextResponse.json({ result });
    }
    if (q) {
      const result = await geocodeQuery(q);
      if (!result) return jsonError("Could not resolve location", 404);
      return NextResponse.json({ result });
    }
    return jsonError("Provide q or id+label to resolve");
  }

  if (!q) return NextResponse.json({ suggestions: [] });
  const suggestions = await suggestPostcodes(q);
  return NextResponse.json({ suggestions });
}
