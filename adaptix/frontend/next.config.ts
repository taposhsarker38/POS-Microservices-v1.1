import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

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

export default withSerwist(nextConfig);
