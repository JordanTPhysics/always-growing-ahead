import { readFile } from "node:fs/promises";
import path from "node:path";
import { getRequestConfig } from "next-intl/server";
import {
  defaultLocale,
  isActiveLocale,
  type ActiveLocale,
} from "@/lib/i18n/locales";
import { messageNamespaces } from "@/lib/i18n/message-namespaces";

async function readMessages(locale: ActiveLocale, namespace: string) {
  const filePath = path.join(
    process.cwd(),
    "messages",
    locale,
    `${namespace}.json`
  );
  const parsed = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Translation file must be a JSON object");
  }
  return parsed;
}

async function loadNamespace(locale: ActiveLocale, namespace: string) {
  try {
    return await readMessages(locale, namespace);
  } catch {
    if (locale === defaultLocale) return {};
    try {
      return await readMessages(defaultLocale, namespace);
    } catch {
      return {};
    }
  }
}

async function loadMessages(locale: ActiveLocale) {
  const messages: Record<string, unknown> = {};
  for (const namespace of messageNamespaces) {
    messages[namespace] = await loadNamespace(locale, namespace);
  }
  return messages;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale =
    requested && isActiveLocale(requested) ? requested : defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
    onError(error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[i18n]", error.message);
      }
    },
    getMessageFallback({ namespace, key }) {
      return [namespace, key].filter(Boolean).join(".");
    },
  };
});
