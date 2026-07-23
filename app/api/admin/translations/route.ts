import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/admin";
import { jsonError } from "@/lib/api/auth";
import { activeLocales, isActiveLocale } from "@/lib/i18n/locales";
import {
  isMessageNamespace,
  messageNamespaces,
} from "@/lib/i18n/message-namespaces";

function messagesRoot() {
  return path.join(process.cwd(), "messages");
}

function resolveMessagePath(locale: string, namespace: string) {
  if (!isActiveLocale(locale) || !isMessageNamespace(namespace)) {
    return null;
  }
  const root = messagesRoot();
  const absolute = path.resolve(root, locale, `${namespace}.json`);
  const expectedDir = path.resolve(root, locale);
  const relative = path.relative(expectedDir, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return absolute;
}

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale");
  const namespace = searchParams.get("namespace");

  if (!locale && !namespace) {
    return NextResponse.json({
      locales: activeLocales,
      namespaces: messageNamespaces,
    });
  }

  if (!locale || !namespace) {
    return jsonError("locale and namespace are required");
  }

  const filePath = resolveMessagePath(locale, namespace);
  if (!filePath) return jsonError("Invalid locale or namespace");

  try {
    const raw = await readFile(filePath, "utf8");
    const messages = JSON.parse(raw) as unknown;
    if (!messages || typeof messages !== "object" || Array.isArray(messages)) {
      return jsonError("Translation file must be a JSON object", 500);
    }
    return NextResponse.json({
      locale,
      namespace,
      content: JSON.stringify(messages, null, 2),
    });
  } catch {
    return jsonError("Translation file not found", 404);
  }
}

const putSchema = z.object({
  locale: z.string().min(1),
  namespace: z.string().min(1),
  content: z.string().min(2),
});

export async function PUT(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid translation payload");

  const filePath = resolveMessagePath(parsed.data.locale, parsed.data.namespace);
  if (!filePath) return jsonError("Invalid locale or namespace");

  let data: unknown;
  try {
    data = JSON.parse(parsed.data.content);
  } catch {
    return jsonError("Content must be valid JSON");
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return jsonError("Translation JSON must be an object");
  }

  const formatted = `${JSON.stringify(data, null, 2)}\n`;
  await writeFile(filePath, formatted, "utf8");

  return NextResponse.json({ ok: true });
}
