import type { MetadataRoute } from "next";
import { activeLocales, defaultLocale, type ActiveLocale } from "@/lib/i18n/locales";
import { siteOrigin } from "@/lib/site";

const publicPaths: Array<{
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
}> = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/jobs", changeFrequency: "daily", priority: 0.8 },
  { path: "/workers", changeFrequency: "daily", priority: 0.8 },
  { path: "/marketplace", changeFrequency: "daily", priority: 0.8 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.5 },
];

function localizedUrl(locale: ActiveLocale, path: string) {
  return `${siteOrigin}/${locale}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.flatMap(({ path, changeFrequency, priority }) => {
    const languages = {
      "x-default": localizedUrl(defaultLocale, path),
      en: localizedUrl("en", path),
      ar: localizedUrl("ar", path),
      ckb: localizedUrl("ckb", path),
    };

    return activeLocales.map((locale) => ({
      url: localizedUrl(locale, path),
      changeFrequency,
      priority,
      alternates: { languages },
    }));
  });
}
