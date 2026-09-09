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
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/uploads/:path*",
          destination: "/api/files/:path*",
        },
      ],
    };
  },
  async redirects() {
    return [
      {
        source: "/:locale(en|ar|ckb)/help",
        destination: "/:locale#help",
        permanent: true,
      },
      {
        source: "/:locale(en|ar|ckb)/privacy",
        destination: "/:locale#privacy",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
