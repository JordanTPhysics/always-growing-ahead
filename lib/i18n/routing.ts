import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";
import { activeLocales, defaultLocale } from "@/lib/i18n/locales";

export const routing = defineRouting({
  locales: activeLocales,
  defaultLocale,
  localePrefix: "always",
  localeCookie: {
    name: "NEXT_LOCALE",
  },
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
