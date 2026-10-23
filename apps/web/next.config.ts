import type { NextConfig } from "next";

function websocketOrigin(value: string) {
  const url = new URL(value);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.hostname.includes("*") ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("INVALID_REALTIME_ORIGIN");
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.origin;
}
function realtimeConnectSources() {
  if (process.env.OATHFRONT_HOSTED_PROXY === "1") {
    const upstream = process.env.API_UPSTREAM_ORIGIN;
    if (!upstream || new URL(upstream).protocol !== "https:")
      throw new Error("INVALID_REALTIME_ORIGIN");
    return `'self' ${websocketOrigin(upstream)}`;
  }
  const sources = new Set(["'self'"]);
  if (process.env.APP_ORIGIN)
    sources.add(websocketOrigin(process.env.APP_ORIGIN));
  const apiOrigin = process.env.API_ORIGIN ?? "http://127.0.0.1:3001";
  if (["localhost", "127.0.0.1", "[::1]"].includes(new URL(apiOrigin).hostname))
    sources.add(websocketOrigin(apiOrigin));
  return [...sources].join(" ");
}
const config: NextConfig = {
  output: "standalone",
  // The dev badge otherwise covers the lobby pagination on short screens.
  devIndicators: false,
  // Separate lock/cache for a user-driven dev server alongside test dev servers.
  distDir:
    process.env.OATHFRONT_INTERACTIVE === "1"
      ? ".next-interactive"
      : process.env.OATHFRONT_TEST_DEV === "1"
        ? ".next-e2e"
        : ".next",
  // OAuth callbacks can contain one-time verifiers; never log raw request URLs.
  logging: false,
  experimental: { extensionAlias: { ".js": [".ts", ".tsx", ".js"] } },
  transpilePackages: [
    "@oathfront/contracts",
    "@oathfront/game-engine",
    "@oathfront/game-content",
  ],
  async rewrites() {
    if (process.env.OATHFRONT_HOSTED_PROXY === "1")
      return [
        { source: "/api/v1/:path*", destination: "/api/forward-v1/:path*" },
      ];
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
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Content-Security-Policy",
                  value: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src ${realtimeConnectSources()}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`,
                },
              ]
            : []),
        ],
      },
    ];
  },
};
export default config;
