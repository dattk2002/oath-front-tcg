import { testOrigin, testPort } from "./tests/e2e/test-origin.js";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: testOrigin,
    browserName: "chromium",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm --filter @oathfront/api exec tsx tests/browser-server.mjs",
      url: "http://127.0.0.1:3101/health/ready",
      env: { OATHFRONT_E2E_ORIGIN: testOrigin },
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command:
        process.env.OATHFRONT_E2E_PRODUCTION === "1"
          ? "node apps/web/.next/standalone/apps/web/server.js"
          : `pnpm --filter @oathfront/web exec next dev --webpack --hostname localhost --port ${testPort}`,
      url: testOrigin,
      env: {
        OATHFRONT_TEST_DEV:
          process.env.OATHFRONT_E2E_PRODUCTION === "1" ? "0" : "1",
        API_ORIGIN: "http://127.0.0.1:3101",
        PORT: String(testPort),
        HOSTNAME: "localhost",
      },
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
