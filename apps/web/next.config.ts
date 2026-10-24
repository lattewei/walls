import type { NextConfig } from "next";

const apiOrigin = (process.env.WALLS_API_PROXY ?? "http://127.0.0.1:8080").replace(
  /\/$/,
  "",
);

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
  // /api/v1/* is streamed by src/app/api/v1/[...path]/route.ts so Range and multipart survive.
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
