import type { MetadataRoute } from "next";
import { activeLocales } from "@/lib/i18n/locales";
import { siteOrigin } from "@/lib/site";

/** Paths that redirect to sign-up or are account-only. */
const privateSegments = [
  "/admin",
  "/billing",
  "/notifications",
  "/employer",
  "/worker/profile",
  "/education",
  "/jobs/",
  "/workers/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        ...activeLocales.flatMap((locale) =>
          privateSegments.map((segment) => `/${locale}${segment}`),
        ),
      ],
    },
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}
