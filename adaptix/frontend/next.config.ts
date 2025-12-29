import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  /* config options here */
  // @ts-ignore
  turbopack: {},
  experimental: {
    // This silences the error about custom webpack config while using Turbopack
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8101/api/:path*",
      },
    ];
  },
  trailingSlash: true,
};

export default withNextIntl(withSerwist(nextConfig));
