import { afterEach, expect, it, vi } from "vitest";
import config from "../next.config.js";
afterEach(() => vi.unstubAllEnvs());
async function connectSources() {
  const headers = await config.headers!();
  const policy = headers
    .flatMap((entry) => entry.headers)
    .find((header) => header.key === "Content-Security-Policy")?.value;
  return policy
    ?.split(";")
    .find((directive) => directive.trim().startsWith("connect-src"))
    ?.trim();
}
it("allows only the hosted API websocket origin alongside same-origin requests", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("OATHFRONT_HOSTED_PROXY", "1");
  vi.stubEnv("API_UPSTREAM_ORIGIN", "https://oathfront-api.vercel.app");
  vi.stubEnv("API_ORIGIN", "http://internal-api:3001");
  vi.stubEnv("APP_ORIGIN", "https://oathfront.vercel.app");
  expect(await connectSources()).toBe(
    "connect-src 'self' wss://oathfront-api.vercel.app",
  );
});
it("allows exact public same-origin and loopback websocket endpoints in production local builds", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("OATHFRONT_HOSTED_PROXY", "0");
  vi.stubEnv("API_ORIGIN", "http://127.0.0.1:3001");
  vi.stubEnv("APP_ORIGIN", "http://localhost:3300");
  expect(await connectSources()).toBe(
    "connect-src 'self' ws://localhost:3300 ws://127.0.0.1:3001",
  );
});
it("does not add Docker-only API hostnames or accept arbitrary origins into the browser allowlist", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("OATHFRONT_HOSTED_PROXY", "0");
  vi.stubEnv("API_ORIGIN", "http://api:3001");
  vi.stubEnv("APP_ORIGIN", "http://localhost:3300");
  expect(await connectSources()).toBe("connect-src 'self' ws://localhost:3300");
  vi.stubEnv("OATHFRONT_HOSTED_PROXY", "1");
  vi.stubEnv(
    "API_UPSTREAM_ORIGIN",
    "https://api.example.test/path?token=secret",
  );
  await expect(connectSources()).rejects.toThrow("INVALID_REALTIME_ORIGIN");
  vi.stubEnv("API_UPSTREAM_ORIGIN", "https://*.example.test");
  await expect(connectSources()).rejects.toThrow("INVALID_REALTIME_ORIGIN");
});
