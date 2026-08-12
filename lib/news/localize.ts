import type { NewsExcerpt } from "@/lib/db/types";
import type { ActiveLocale } from "@/lib/i18n/locales";

export function localizedNewsBody(
  excerpt: NewsExcerpt,
  locale: ActiveLocale
) {
  if (locale === "ar") return excerpt.body_ar || excerpt.body_en;
  if (locale === "ckb") return excerpt.body_ckb || excerpt.body_en;
  return excerpt.body_en;
}
