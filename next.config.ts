import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  /* Do not set output: 'export' — Capacitor points at the live deployment (see PROJECT_SPEC). */
};

export default withNextIntl(nextConfig);
