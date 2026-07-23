import { readFile } from "node:fs/promises";
import path from "node:path";
import { getRequestConfig } from "next-intl/server";
import {
  defaultLocale,
  isActiveLocale,
  type ActiveLocale,
} from "@/lib/i18n/locales";
import { messageNamespaces } from "@/lib/i18n/message-namespaces";

async function loadMessages(locale: ActiveLocale) {
  const messages: Record<string, unknown> = {};
  for (const namespace of messageNamespaces) {
    const filePath = path.join(
      process.cwd(),
      "messages",
      locale,
      `${namespace}.json`
    );
    try {
      const raw = await readFile(filePath, "utf8");
      messages[namespace] = JSON.parse(raw) as unknown;
    } catch {
      if (locale !== defaultLocale) {
        const fallbackPath = path.join(
          process.cwd(),
          "messages",
          defaultLocale,
          `${namespace}.json`
        );
        try {
          const raw = await readFile(fallbackPath, "utf8");
          messages[namespace] = JSON.parse(raw) as unknown;
        } catch {
          messages[namespace] = {};
        }
      } else {
        messages[namespace] = {};
      }
    }
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
