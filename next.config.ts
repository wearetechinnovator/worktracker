import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  serverExternalPackages: ['mongoose'],
  devIndicators: false
};

export default nextConfig;
