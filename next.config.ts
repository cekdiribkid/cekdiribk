import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Hide the Next.js dev tools indicator (the floating "N" badge) by default
  devIndicators: false,
  allowedDevOrigins: [
    ".space-z.ai",
    ".z.ai",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
