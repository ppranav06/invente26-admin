import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.BUILD_STANDALONE === "true" ? { output: "standalone" } : {}),
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://localhost:4000";

    return [
      {
        source: "/organizers/api/:path*",
        destination: `${backendUrl}/organizers/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
