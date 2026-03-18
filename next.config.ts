import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/agent-insurance-demo",
  images: { unoptimized: true },
};

export default nextConfig;
