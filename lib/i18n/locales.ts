export const locales = {
  en: { label: "English", dir: "ltr", font: "latin" },
  ar: { label: "العربية", dir: "rtl", font: "arabic" },
  ckb: { label: "کوردیی ناوەندی", dir: "rtl", font: "arabic" }, // Sorani
  kmr: { label: "Kurdî", dir: "ltr", font: "latin" }, // Kurmanji
} as const;

export type Locale = keyof typeof locales;

export const localeCodes = Object.keys(locales) as Locale[];

/** Locales with message files ready in Phase 1. */
export const activeLocales = ["en", "ar", "ckb"] as const satisfies readonly Locale[];

export type ActiveLocale = (typeof activeLocales)[number];

export const defaultLocale: ActiveLocale = "en";

export function isLocale(value: string): value is Locale {
  return value in locales;
}

export function isActiveLocale(value: string): value is ActiveLocale {
  return (activeLocales as readonly string[]).includes(value);
}
