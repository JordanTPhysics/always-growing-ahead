import {
  blankToNull,
  csvEscape,
  normalizeHeader,
  parseCsv,
  parseOptionalCoord,
} from "@/lib/csv";

export type BusinessCsvInput = {
  company_name: string;
  company_description?: string | null;
  website_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  linkedin_url?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  postcode?: string | null;
  address_text?: string | null;
  external_id?: string | null;
};

export const BUSINESS_CSV_MAX_ROWS = 500;
export const BUSINESS_CSV_MAX_BYTES = 2 * 1024 * 1024;

/** Native headers. Google Places exports are accepted via aliases (`name`, `url`, `id`, …). */
export const BUSINESS_CSV_HEADERS = [
  "company_name",
  "company_description",
  "website_url",
  "contact_phone",
  "contact_email",
  "address_text",
  "postcode",
  "location_lat",
  "location_lng",
  "external_id",
] as const;

type BusinessCsvHeader =
  | (typeof BUSINESS_CSV_HEADERS)[number]
  | "categories"
  | "search_query"
  | "linkedin_url";

const HEADER_ALIASES: Record<string, BusinessCsvHeader> = {
  company_name: "company_name",
  name: "company_name",
  business_name: "company_name",
  company_description: "company_description",
  description: "company_description",
  categories: "categories",
  search_query: "search_query",
  website_url: "website_url",
  website: "website_url",
  url: "website_url",
  contact_phone: "contact_phone",
  phone: "contact_phone",
  contact_email: "contact_email",
  email: "contact_email",
  address_text: "address_text",
  address: "address_text",
  postcode: "postcode",
  location_lat: "location_lat",
  lat: "location_lat",
  location_lng: "location_lng",
  lng: "location_lng",
  lon: "location_lng",
  longitude: "location_lng",
  external_id: "external_id",
  place_id: "external_id",
  id: "external_id",
  linkedin_url: "linkedin_url",
  linkedin: "linkedin_url",
};

const GENERIC_PLACE_TYPES = new Set([
  "point_of_interest",
  "establishment",
  "store",
  "health",
  "service",
  "finance",
]);

const UK_POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;

export type ParsedBusinessCsvRow = {
  line: number;
  input: BusinessCsvInput;
};

export type BusinessCsvRowError = {
  line: number;
  error: string;
};

function humanizePlaceType(value: string): string {
  const words = value.replace(/_/g, " ").trim();
  return words.replace(/\b\w/g, (char) => char.toUpperCase());
}

function describeCategories(
  categories: string | null,
  searchQuery: string | null
): string | null {
  const names = (categories ?? "")
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part && !GENERIC_PLACE_TYPES.has(part))
    .slice(0, 4)
    .map(humanizePlaceType);
  if (names.length > 0) return names.join(", ");
  return searchQuery;
}

function extractUkPostcode(address: string | null): string | null {
  if (!address) return null;
  const match = address.match(UK_POSTCODE);
  if (!match?.[1] || !match[2]) return null;
  const formatted = `${match[1].toUpperCase()} ${match[2].toUpperCase()}`;
  return formatted.length <= 10 ? formatted : null;
}

export function parseBusinessCsv(text: string): {
  rows: ParsedBusinessCsvRow[];
  errors: BusinessCsvRowError[];
  error?: string;
} {
  const table = parseCsv(text);
  if (table.length === 0) {
    return { rows: [], errors: [], error: "CSV file is empty" };
  }

  const headerCells = table[0] ?? [];
  const indexByField = new Map<BusinessCsvHeader, number>();
  for (let i = 0; i < headerCells.length; i++) {
    const mapped = HEADER_ALIASES[normalizeHeader(headerCells[i] ?? "")];
    if (mapped && !indexByField.has(mapped)) indexByField.set(mapped, i);
  }

  if (!indexByField.has("company_name")) {
    return {
      rows: [],
      errors: [],
      error:
        "Missing required header: name (or company_name). Google Places exports and the sample CSV are both accepted.",
    };
  }

  const dataRows = table.slice(1);
  if (dataRows.length > BUSINESS_CSV_MAX_ROWS) {
    return {
      rows: [],
      errors: [],
      error: `Too many rows (max ${BUSINESS_CSV_MAX_ROWS})`,
    };
  }

  const rows: ParsedBusinessCsvRow[] = [];
  const errors: BusinessCsvRowError[] = [];

  dataRows.forEach((cells, offset) => {
    const line = offset + 2;
    const get = (field: BusinessCsvHeader) => {
      const index = indexByField.get(field);
      return index == null ? undefined : cells[index];
    };

    const companyName = blankToNull(get("company_name"));
    if (!companyName) {
      errors.push({ line, error: "name is required" });
      return;
    }
    if (companyName.length > 255) {
      errors.push({ line, error: "name must be 255 characters or fewer" });
      return;
    }

    const website = blankToNull(get("website_url"));
    if (website && website.length > 500) {
      errors.push({ line, error: "url must be 500 characters or fewer" });
      return;
    }

    const contactEmail = blankToNull(get("contact_email"));
    if (contactEmail && contactEmail.length > 255) {
      errors.push({
        line,
        error: "contact_email must be 255 characters or fewer",
      });
      return;
    }

    const contactPhone = blankToNull(get("contact_phone"));
    if (contactPhone && contactPhone.length > 30) {
      errors.push({ line, error: "phone must be 30 characters or fewer" });
      return;
    }

    const linkedin = blankToNull(get("linkedin_url"));
    if (linkedin && linkedin.length > 500) {
      errors.push({ line, error: "linkedin_url must be 500 characters or fewer" });
      return;
    }

    const address = blankToNull(get("address_text"));
    if (address && address.length > 255) {
      errors.push({ line, error: "address must be 255 characters or fewer" });
      return;
    }

    const explicitPostcode = blankToNull(get("postcode"));
    const postcode = explicitPostcode ?? extractUkPostcode(address);
    if (postcode && postcode.length > 10) {
      errors.push({ line, error: "postcode must be 10 characters or fewer" });
      return;
    }

    const externalId = blankToNull(get("external_id"));
    if (externalId && externalId.length > 128) {
      errors.push({ line, error: "id must be 128 characters or fewer" });
      return;
    }

    const explicitDescription = blankToNull(get("company_description"));
    const description =
      explicitDescription ??
      describeCategories(
        blankToNull(get("categories")),
        blankToNull(get("search_query"))
      );
    if (description && description.length > 5000) {
      errors.push({
        line,
        error: "description must be 5000 characters or fewer",
      });
      return;
    }

    const lat = parseOptionalCoord(
      blankToNull(get("location_lat")),
      "lat",
      -90,
      90
    );
    if (!lat.ok) {
      errors.push({ line, error: lat.error });
      return;
    }

    const lng = parseOptionalCoord(
      blankToNull(get("location_lng")),
      "lng",
      -180,
      180
    );
    if (!lng.ok) {
      errors.push({ line, error: lng.error });
      return;
    }

    rows.push({
      line,
      input: {
        company_name: companyName,
        company_description: description,
        website_url: website,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        linkedin_url: linkedin,
        postcode,
        address_text: address,
        location_lat: lat.value,
        location_lng: lng.value,
        external_id: externalId,
      },
    });
  });

  return { rows, errors };
}

export function buildBusinessCsvTemplate(): string {
  const sample = [
    [
      "Ozan Barber",
      "Barber shop",
      "http://example.com",
      "07310362938",
      "",
      "99 Central Ave, Beeston, Nottingham NG9 2QS, UK",
      "NG9 2QS",
      "52.9354788",
      "-1.2202163",
      "sample-place-1",
    ],
  ];

  return [
    BUSINESS_CSV_HEADERS.join(","),
    ...sample.map((row) => row.map(csvEscape).join(",")),
  ].join("\n");
}
