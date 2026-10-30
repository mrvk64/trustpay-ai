import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
