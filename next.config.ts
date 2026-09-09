import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  serverExternalPackages: ['mongoose'],
  devIndicators: false
};
module.exports = {
  allowedDevOrigins: ['192.168.0.148'],
}
export default nextConfig;
