import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  transpilePackages: ["p5"],
  serverExternalPackages: ["sharp"],
  async headers() {
    const noStore = [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }];
    return [
      "logo-trim.png",
      "header.png",
      "mark-d.png",
      "favicon-32.png",
      "favicon-180.png",
      "favicon.svg",
    ].map((file) => ({ source: `/${file}`, headers: noStore }));
  },
};

export default nextConfig;
