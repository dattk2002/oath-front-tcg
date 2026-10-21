import { testOrigin, testPort } from "./tests/e2e/test-origin.js";
import { defineConfig } from "@playwright/test";
// Playwright supplies FORCE_COLOR; inherited NO_COLOR otherwise warns in every worker.
delete process.env.NO_COLOR;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: testOrigin,
    browserName:
      process.env.OATHFRONT_BROWSER === "firefox" ? "firefox" : "chromium",
    ...(process.env.OATHFRONT_NO_NAVIGATION === "1"
      ? {
          launchOptions: {
            firefoxUserPrefs: { "dom.navigation.webidl.enabled": false },
          },
        }
      : {}),
    ...(process.env.OATHFRONT_BROWSER === "chrome"
      ? { headless: false, channel: "chrome" }
      : {}),
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm --filter @oathfront/api exec tsx tests/browser-server.mjs",
      url: "http://127.0.0.1:3101/health/ready",
      env: {
        OATHFRONT_E2E_ORIGIN: testOrigin,
        OATHFRONT_E2E_INGRESS: process.env.OATHFRONT_E2E_PRODUCTION ?? "0",
        UI_PROXY_SECRET: "local-test-proxy-".repeat(4),
      },
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command:
        process.env.OATHFRONT_E2E_PRODUCTION === "1"
          ? "node scripts/ui-server.mjs"
          : `pnpm --filter @oathfront/web exec next dev --webpack --hostname localhost --port ${testPort}`,
      url: testOrigin,
      env: {
        OATHFRONT_TEST_DEV:
          process.env.OATHFRONT_E2E_PRODUCTION === "1" ? "0" : "1",
        API_ORIGIN: "http://127.0.0.1:3101",
        PORT: String(testPort),
        HOSTNAME: "localhost",
        UI_PROXY_SECRET: "local-test-proxy-".repeat(4),
        NEXT_INTERNAL_PORT: String(testPort + 1),
      },
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
