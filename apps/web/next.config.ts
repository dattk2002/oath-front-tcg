import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  experimental: { extensionAlias: { ".js": [".ts", ".tsx", ".js"] } },
  transpilePackages: [
    "@oathfront/contracts",
    "@oathfront/game-engine",
    "@oathfront/game-content",
  ],
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.API_ORIGIN ?? "http://127.0.0.1:3001"}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};
export default config;
