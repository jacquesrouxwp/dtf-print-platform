import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  transpilePackages: ["p5"],
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
