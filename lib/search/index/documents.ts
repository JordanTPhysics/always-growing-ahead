import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db/pool";
import { activeLocales, type ActiveLocale } from "@/lib/i18n/locales";
import { detectContentLocale } from "@/lib/search/language";
import type { SearchEntityType } from "@/lib/search/index/types";

export const EMBEDDING_PASSAGE_CHARS = 2000;

export type IndexFieldName = "title" | "description";

export type IndexField = {
  fieldName: IndexFieldName;
  human: Partial<Record<ActiveLocale, string>>;
};

export type IndexSource = {
  entityType: SearchEntityType;
  entityId: number;
  indexable: boolean;
  fields: IndexField[];
  passage: string;
};

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed : null;
}

function joinLines(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join("\n");
}

function singleField(
  fieldName: IndexFieldName,
  text: string | null
): IndexField | null {
  if (!text) return null;
  return { fieldName, human: { [detectContentLocale(text)]: text } };
}

function educationField(
  fieldName: IndexFieldName,
  texts: Partial<Record<ActiveLocale, string | null | undefined>>
): IndexField | null {
  const human: Partial<Record<ActiveLocale, string>> = {};
  for (const locale of activeLocales) {
    const text = clean(texts[locale]);
    if (text) human[locale] = text;
  }
  return Object.keys(human).length > 0 ? { fieldName, human } : null;
}

function presentFields(fields: Array<IndexField | null>): IndexField[] {
  return fields.filter((field): field is IndexField => Boolean(field));
}

export function embeddingPassage(original: string, extras: string[]): string {
  const known = new Set(
    original
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  );
  const parts = [original.trim()];
  for (const extra of extras) {
    const text = extra.trim();
    if (!text || known.has(text)) continue;
    known.add(text);
    parts.push(text);
  }
  const joined = parts.filter(Boolean).join("\n");
  return joined.length <= EMBEDDING_PASSAGE_CHARS
    ? joined
    : joined.slice(0, EMBEDDING_PASSAGE_CHARS);
}

type TextRow = RowDataPacket & Record<string, string | number | null>;

export async function loadIndexSource(
  entityType: SearchEntityType,
  entityId: number
): Promise<IndexSource | null> {
  switch (entityType) {
    case "job":
      return loadJob(entityId);
    case "worker":
      return loadWorker(entityId);
    case "employer":
      return loadEmployer(entityId);
    case "education":
      return loadEducation(entityId);
    case "marketplace":
      return loadMarketplace(entityId);
  }
}

async function loadJob(id: number): Promise<IndexSource | null> {
  const [rows] = await pool.execute<TextRow[]>(
    `SELECT j.title, j.description, j.requirements, j.status, j.job_type,
            j.postcode, j.address_text, e.company_name,
            (
              SELECT GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ')
              FROM job_skills js
              JOIN skills s ON s.id = js.skill_id
              WHERE js.job_id = j.id
            ) AS skills
     FROM jobs j
     JOIN employer_profiles e ON e.id = j.employer_id
     WHERE j.id = ?
     LIMIT 1`,
    [id]
  );
  const row = rows[0];
  if (!row) return null;
  const title = clean(stringOrNull(row.title));
  const description = clean(stringOrNull(row.description));
  return {
    entityType: "job",
    entityId: id,
    indexable: row.status === "active",
    fields: presentFields([
      singleField("title", title),
      singleField("description", description),
    ]),
    passage: joinLines([
      title,
      description,
      stringOrNull(row.requirements),
      stringOrNull(row.skills),
      stringOrNull(row.company_name),
      stringOrNull(row.address_text),
      stringOrNull(row.postcode),
      stringOrNull(row.job_type),
    ]),
  };
}

async function loadWorker(id: number): Promise<IndexSource | null> {
  const [rows] = await pool.execute<TextRow[]>(
    `SELECT w.headline, w.bio, w.visibility, w.postcode, w.address_text,
            (
              SELECT GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ')
              FROM worker_skills ws
              JOIN skills s ON s.id = ws.skill_id
              WHERE ws.worker_id = w.id
            ) AS skills
     FROM worker_profiles w
     WHERE w.id = ?
     LIMIT 1`,
    [id]
  );
  const row = rows[0];
  if (!row) return null;
  const [experience] = await pool.execute<TextRow[]>(
    `SELECT job_title, employer_name, description
     FROM worker_experience
     WHERE worker_id = ?
     ORDER BY start_date DESC, id DESC`,
    [id]
  );
  const [qualifications] = await pool.execute<TextRow[]>(
    `SELECT qualification_name, institution
     FROM worker_qualifications
     WHERE worker_id = ?
     ORDER BY year_awarded DESC, id DESC`,
    [id]
  );
  const headline = clean(stringOrNull(row.headline));
  const bio = clean(stringOrNull(row.bio));
  return {
    entityType: "worker",
    entityId: id,
    indexable: row.visibility === "public",
    fields: presentFields([
      singleField("title", headline),
      singleField("description", bio),
    ]),
    passage: joinLines([
      headline,
      bio,
      stringOrNull(row.skills),
      ...experience.flatMap((entry) => [
        stringOrNull(entry.job_title),
        stringOrNull(entry.employer_name),
        stringOrNull(entry.description),
      ]),
      ...qualifications.flatMap((entry) => [
        stringOrNull(entry.qualification_name),
        stringOrNull(entry.institution),
      ]),
      stringOrNull(row.address_text),
      stringOrNull(row.postcode),
    ]),
  };
}

async function loadEmployer(id: number): Promise<IndexSource | null> {
  const [rows] = await pool.execute<TextRow[]>(
    `SELECT company_name, company_description, website_url, postcode, address_text
     FROM employer_profiles
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  const row = rows[0];
  if (!row) return null;
  const name = clean(stringOrNull(row.company_name));
  const description = clean(stringOrNull(row.company_description));
  return {
    entityType: "employer",
    entityId: id,
    indexable: true,
    fields: presentFields([
      singleField("title", name),
      singleField("description", description),
    ]),
    passage: joinLines([
      name,
      description,
      stringOrNull(row.address_text),
      stringOrNull(row.postcode),
      stringOrNull(row.website_url),
    ]),
  };
}

async function loadEducation(id: number): Promise<IndexSource | null> {
  const [rows] = await pool.execute<TextRow[]>(
    `SELECT topic, is_published, file_name,
            title_en, title_ar, title_ckb,
            description_en, description_ar, description_ckb
     FROM education_resources
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    entityType: "education",
    entityId: id,
    indexable: Number(row.is_published) === 1,
    fields: presentFields([
      educationField("title", {
        en: stringOrNull(row.title_en),
        ar: stringOrNull(row.title_ar),
        ckb: stringOrNull(row.title_ckb),
      }),
      educationField("description", {
        en: stringOrNull(row.description_en),
        ar: stringOrNull(row.description_ar),
        ckb: stringOrNull(row.description_ckb),
      }),
    ]),
    passage: joinLines([
      stringOrNull(row.topic),
      stringOrNull(row.title_en),
      stringOrNull(row.title_ar),
      stringOrNull(row.title_ckb),
      stringOrNull(row.description_en),
      stringOrNull(row.description_ar),
      stringOrNull(row.description_ckb),
      stringOrNull(row.file_name),
    ]),
  };
}

async function loadMarketplace(id: number): Promise<IndexSource | null> {
  const [rows] = await pool.execute<TextRow[]>(
    `SELECT title, description, price, location, category
     FROM marketplace_listings
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  const row = rows[0];
  if (!row) return null;
  const title = clean(stringOrNull(row.title));
  const description = clean(stringOrNull(row.description));
  return {
    entityType: "marketplace",
    entityId: id,
    indexable: true,
    fields: presentFields([
      singleField("title", title),
      singleField("description", description),
    ]),
    passage: joinLines([
      title,
      description,
      stringOrNull(row.category),
      stringOrNull(row.location),
      stringOrNull(row.price),
    ]),
  };
}

function stringOrNull(value: string | number | null | undefined): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
}
