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
};

export default withNextIntl(withSerwist(nextConfig));
