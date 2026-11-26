import type { ActiveLocale } from "@/lib/i18n/locales";

/** Letters used by Central Kurdish (Sorani) and not by Arabic. */
const SORANI_LETTERS = /[ەێۆڵگچپژ]/u;
const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/u;

/**
 * Local script check. Sorani letters mean ckb, any other Arabic script means ar,
 * and everything else is treated as English.
 */
export function detectContentLocale(text: string): ActiveLocale {
  if (SORANI_LETTERS.test(text)) return "ckb";
  if (ARABIC_SCRIPT.test(text)) return "ar";
  return "en";
}

/** Azure Translator language code. Central Kurdish is `ku`, not `ckb` or `kmr`. */
export function azureLanguageCode(locale: ActiveLocale): "en" | "ar" | "ku" {
  if (locale === "ckb") return "ku";
  return locale;
}

/** Map an Azure `to` code back to an active locale. Azure `ckb` is not Sorani. */
export function localeFromAzure(code: string): ActiveLocale | null {
  if (code === "ku") return "ckb";
  if (code === "en" || code === "ar") return code;
  return null;
}
