import { getRequestConfig } from "next-intl/server";
import {
  defaultLocale,
  isActiveLocale,
  type ActiveLocale,
} from "@/lib/i18n/locales";
import { messageNamespaces } from "@/lib/i18n/message-namespaces";

async function loadNamespace(locale: ActiveLocale, namespace: string) {
  try {
    return (await import(`../messages/${locale}/${namespace}.json`)).default;
  } catch {
    if (locale === defaultLocale) return {};
    try {
      return (await import(`../messages/${defaultLocale}/${namespace}.json`))
        .default;
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
