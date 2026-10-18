export type GeocodeResult = {
  lat: number;
  lng: number;
  postcode: string;
  address_text: string;
  city: string;
  district: string;
};

function tidyPlace(value: string | null | undefined): string {
  return (value ?? "").replace(/,\s*unparished area$/i, "").trim();
}

function firstPlace(value: string | string[] | null | undefined): string {
  const raw = Array.isArray(value) ? value.find((item) => tidyPlace(item)) : value;
  return tidyPlace(raw);
}

function describePlace(input: {
  postTown?: string | null;
  locality?: string | null;
  adminDistrict?: string | string[] | null;
  adminWard?: string | string[] | null;
  parish?: string | string[] | null;
}): { city: string; district: string } {
  const city = tidyPlace(input.postTown) || firstPlace(input.adminDistrict);
  const different = (value: string) =>
    value && value.toLowerCase() !== city.toLowerCase() ? value : "";
  const district =
    different(tidyPlace(input.locality)) ||
    different(firstPlace(input.adminWard)) ||
    different(firstPlace(input.parish)) ||
    city;
  return { city, district };
}

function located(
  result: Omit<GeocodeResult, "city" | "district"> & {
    city?: string;
    district?: string;
  }
): GeocodeResult {
  const city = result.city?.trim() ?? "";
  return {
    ...result,
    city,
    district: result.district?.trim() || city,
  };
}

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
        dependant_locality?: string;
        ward?: string;
        district?: string;
      };
    };
    const r = data.result;
    if (!r?.latitude || !r?.longitude) return null;
    const place = describePlace({
      postTown: r.post_town,
      locality: r.dependant_locality,
      adminDistrict: r.district,
      adminWard: r.ward,
    });
    return located({
      lat: r.latitude,
      lng: r.longitude,
      postcode: r.postcode ?? "",
      address_text: [r.line_1, r.post_town].filter(Boolean).join(", "),
      ...place,
    });
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
    const name = r.name_1 ?? suggestion.label;
    return located({
      lat: r.latitude,
      lng: r.longitude,
      postcode: "",
      address_text: name,
      city: name,
      district: name,
    });
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
            dependant_locality?: string;
            ward?: string;
            district?: string;
          }[];
        };
        const r = data.result?.[0];
        if (r?.latitude != null && r?.longitude != null) {
          return located({
            lat: r.latitude,
            lng: r.longitude,
            postcode: r.postcode ?? compact,
            address_text: r.post_town ?? compact,
            ...describePlace({
              postTown: r.post_town,
              locality: r.dependant_locality,
              adminDistrict: r.district,
              adminWard: r.ward,
            }),
          });
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
          admin_ward?: string;
          parish?: string;
        };
      };
      const r = data.result;
      if (r?.latitude != null && r?.longitude != null) {
        return located({
          lat: r.latitude,
          lng: r.longitude,
          postcode: r.postcode ?? compact,
          address_text:
            [r.admin_district, r.parish, r.postcode].filter(Boolean).join(", ") ||
            compact,
          ...describePlace({
            adminDistrict: r.admin_district,
            adminWard: r.admin_ward,
            parish: r.parish,
          }),
        });
      }
    }
  }

  if (
    !/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/i.test(compact) &&
    /^[A-Z]{1,2}\d[A-Z\d]?$/i.test(compact)
  ) {
    const outRes = await fetch(
      `https://api.postcodes.io/outcodes/${encodeURIComponent(compact)}`
    );
    if (outRes.ok) {
      const outData = (await outRes.json()) as {
        result?: {
          latitude?: number;
          longitude?: number;
          outcode?: string;
          admin_district?: string[];
          admin_ward?: string[];
          parish?: string[];
        };
      };
      const out = outData.result;
      if (out?.latitude != null && out?.longitude != null) {
        const place = describePlace({
          adminDistrict: out.admin_district,
          adminWard: out.admin_ward,
          parish: out.parish,
        });
        return located({
          lat: out.latitude,
          lng: out.longitude,
          postcode: out.outcode ?? compact,
          address_text: [place.city, place.district, out.outcode]
            .filter(Boolean)
            .join(", "),
          ...place,
        });
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
        admin_ward?: string;
        parish?: string;
      }[] | null;
    };
    const hit = searchData.result?.[0];
    if (hit?.latitude != null && hit?.longitude != null) {
      return located({
        lat: hit.latitude,
        lng: hit.longitude,
        postcode: hit.postcode ?? "",
        address_text: [hit.admin_district, hit.postcode]
          .filter(Boolean)
          .join(", "),
        ...describePlace({
          adminDistrict: hit.admin_district,
          adminWard: hit.admin_ward,
          parish: hit.parish,
        }),
      });
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
  const name = place.name_1 ?? q;
  return located({
    lat: place.latitude,
    lng: place.longitude,
    postcode: "",
    address_text: name,
    city: name,
    district: name,
  });
}
