import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a minimal standalone server bundle for Docker deployment.
  output: "standalone",
};

export default nextConfig;
