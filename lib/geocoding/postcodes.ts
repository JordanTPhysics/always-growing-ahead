export type GeocodeResult = {
  lat: number;
  lng: number;
  postcode: string;
  address_text: string;
};

export type PostcodeSuggestion = {
  id: string;
  label: string;
};

/**
 * UK postcode / place lookup.
 * Prefer Ideal Postcodes when IDEAL_POSTCODES_API_KEY is set;
 * otherwise fall back to free postcodes.io.
 */
export async function suggestPostcodes(
  query: string
): Promise<PostcodeSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const idealKey = process.env.IDEAL_POSTCODES_API_KEY;
  if (idealKey) {
    const url = new URL(
      "https://api.ideal-postcodes.co.uk/v1/autocomplete/addresses"
    );
    url.searchParams.set("api_key", idealKey);
    url.searchParams.set("query", q);
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      result?: { hits?: { udprn?: number; suggestion?: string }[] };
    };
    return (data.result?.hits ?? []).slice(0, 8).map((hit) => ({
      id: String(hit.udprn ?? hit.suggestion),
      label: hit.suggestion ?? "",
    }));
  }

  const url = new URL("https://api.postcodes.io/postcodes");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "8");

  const res = await fetch(url);
  if (res.ok) {
    const data = (await res.json()) as {
      result?: { postcode: string }[] | null;
    };
    const postcodes = (data.result ?? []).map((r) => ({
      id: r.postcode,
      label: r.postcode,
    }));
    if (postcodes.length > 0) return postcodes;
  }

  const placesUrl = new URL("https://api.postcodes.io/places");
  placesUrl.searchParams.set("q", q);
  placesUrl.searchParams.set("limit", "8");
  const placesRes = await fetch(placesUrl);
  if (!placesRes.ok) return [];
  const placesData = (await placesRes.json()) as {
    result?: { code: string; name_1: string; local_type?: string }[] | null;
  };
  return (placesData.result ?? []).map((p) => ({
    id: `place:${p.code}`,
    label: p.local_type ? `${p.name_1} (${p.local_type})` : p.name_1,
  }));
}

export async function resolvePostcodeSuggestion(
  suggestion: PostcodeSuggestion
): Promise<GeocodeResult | null> {
  const idealKey = process.env.IDEAL_POSTCODES_API_KEY;
  if (idealKey && /^\d+$/.test(suggestion.id)) {
    const url = new URL(
      `https://api.ideal-postcodes.co.uk/v1/udprn/${suggestion.id}`
    );
    url.searchParams.set("api_key", idealKey);
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      result?: {
        latitude?: number;
        longitude?: number;
        postcode?: string;
        line_1?: string;
        post_town?: string;
      };
    };
    const r = data.result;
    if (!r?.latitude || !r?.longitude) return null;
    return {
      lat: r.latitude,
      lng: r.longitude,
      postcode: r.postcode ?? "",
      address_text: [r.line_1, r.post_town].filter(Boolean).join(", "),
    };
  }

  if (suggestion.id.startsWith("place:")) {
    const code = suggestion.id.slice("place:".length);
    const res = await fetch(
      `https://api.postcodes.io/places/${encodeURIComponent(code)}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      result?: {
        latitude?: number;
        longitude?: number;
        name_1?: string;
      };
    };
    const r = data.result;
    if (!r?.latitude || !r?.longitude) return null;
    return {
      lat: r.latitude,
      lng: r.longitude,
      postcode: "",
      address_text: r.name_1 ?? suggestion.label,
    };
  }

  return geocodeQuery(suggestion.label);
}

export async function geocodeQuery(query: string): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;

  const idealKey = process.env.IDEAL_POSTCODES_API_KEY;
  if (idealKey) {
    const compact = q.replace(/\s+/g, "").toUpperCase();
    if (/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/i.test(compact)) {
      const pcUrl = new URL(
        `https://api.ideal-postcodes.co.uk/v1/postcodes/${encodeURIComponent(compact)}`
      );
      pcUrl.searchParams.set("api_key", idealKey);
      const res = await fetch(pcUrl);
      if (res.ok) {
        const data = (await res.json()) as {
          result?: {
            latitude?: number;
            longitude?: number;
            postcode?: string;
            post_town?: string;
          }[];
        };
        const r = data.result?.[0];
        if (r?.latitude != null && r?.longitude != null) {
          return {
            lat: r.latitude,
            lng: r.longitude,
            postcode: r.postcode ?? compact,
            address_text: r.post_town ?? compact,
          };
        }
      }
    }
  }

  const compact = q.replace(/\s+/g, "").toUpperCase();
  const lookupUrl = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/i.test(compact)
    ? `https://api.postcodes.io/postcodes/${encodeURIComponent(compact)}`
    : null;

  if (lookupUrl) {
    const res = await fetch(lookupUrl);
    if (res.ok) {
      const data = (await res.json()) as {
        result?: {
          latitude?: number;
          longitude?: number;
          postcode?: string;
          admin_district?: string;
          parish?: string;
        };
      };
      const r = data.result;
      if (r?.latitude != null && r?.longitude != null) {
        return {
          lat: r.latitude,
          lng: r.longitude,
          postcode: r.postcode ?? compact,
          address_text:
            [r.admin_district, r.parish, r.postcode].filter(Boolean).join(", ") ||
            compact,
        };
      }
    }
  }

  const searchUrl = new URL("https://api.postcodes.io/postcodes");
  searchUrl.searchParams.set("q", q);
  searchUrl.searchParams.set("limit", "1");
  const searchRes = await fetch(searchUrl);
  if (searchRes.ok) {
    const searchData = (await searchRes.json()) as {
      result?: {
        latitude?: number;
        longitude?: number;
        postcode?: string;
        admin_district?: string;
      }[] | null;
    };
    const hit = searchData.result?.[0];
    if (hit?.latitude != null && hit?.longitude != null) {
      return {
        lat: hit.latitude,
        lng: hit.longitude,
        postcode: hit.postcode ?? "",
        address_text: [hit.admin_district, hit.postcode]
          .filter(Boolean)
          .join(", "),
      };
    }
  }

  const placesUrl = new URL("https://api.postcodes.io/places");
  placesUrl.searchParams.set("q", q);
  placesUrl.searchParams.set("limit", "1");
  const placesRes = await fetch(placesUrl);
  if (!placesRes.ok) return null;
  const placesData = (await placesRes.json()) as {
    result?: {
      latitude?: number;
      longitude?: number;
      name_1?: string;
    }[] | null;
  };
  const place = placesData.result?.[0];
  if (!place?.latitude || !place?.longitude) return null;
  return {
    lat: place.latitude,
    lng: place.longitude,
    postcode: "",
    address_text: place.name_1 ?? q,
  };
}
