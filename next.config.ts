import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  /* Do not set output: 'export' — Capacitor points at the live deployment (see PROJECT_SPEC). */
  serverExternalPackages: ["minio", "nodemailer"],
  experimental: {
    // Default is 10MB; education videos are up to 2GB.
    proxyClientMaxBodySize: "2gb",
  },
};

export default withNextIntl(nextConfig);
