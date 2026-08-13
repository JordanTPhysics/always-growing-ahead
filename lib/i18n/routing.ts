import { defineRouting } from "next-intl/routing";
import { activeLocales, defaultLocale } from "@/lib/i18n/locales";

export const routing = defineRouting({
  locales: activeLocales,
  defaultLocale,
  localePrefix: "always",
  localeCookie: {
    name: "NEXT_LOCALE",
  },
});
