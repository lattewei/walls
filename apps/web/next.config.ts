import type { NextConfig } from "next";

const apiOrigin = (process.env.WALLS_API_PROXY ?? "http://127.0.0.1:8080").replace(
  /\/$/,
  "",
);

const nextConfig: NextConfig = {
  // /api/v1/* is handled by src/app/api/v1/[...path]/route.ts (multipart-safe).
  // Keep health rewrite only.
  async rewrites() {
    return [
      {
        source: "/health",
        destination: `${apiOrigin}/health`,
      },
    ];
  },
};

export default nextConfig;
