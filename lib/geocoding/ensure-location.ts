import { geocodeQuery } from "@/lib/geocoding/postcodes";

type Locatable = {
  location_lat?: number | null;
  location_lng?: number | null;
  postcode?: string | null;
  address_text?: string | null;
};

/**
 * Ensure map-ready coordinates. If lat/lng are missing, geocode from
 * postcode (preferred) or address text.
 */
export async function ensureLocationCoords<T extends Locatable>(
  input: T
): Promise<T> {
  if (
    input.location_lat != null &&
    input.location_lng != null &&
    Number.isFinite(Number(input.location_lat)) &&
    Number.isFinite(Number(input.location_lng))
  ) {
    return input;
  }

  const query = (input.postcode || input.address_text || "").trim();
  if (!query) return input;

  const result = await geocodeQuery(query);
  if (!result) return input;

  return {
    ...input,
    location_lat: result.lat,
    location_lng: result.lng,
    postcode: input.postcode || result.postcode || null,
    address_text: input.address_text || result.address_text || null,
  };
}
