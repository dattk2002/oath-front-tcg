import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://localhost:3100",
    browserName: "chromium",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm --filter @oathfront/api exec tsx tests/browser-server.mjs",
      url: "http://127.0.0.1:3101/health/ready",
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command:
        process.env.OATHFRONT_E2E_PRODUCTION === "1"
          ? "node apps/web/.next/standalone/apps/web/server.js"
          : "pnpm --filter @oathfront/web exec next dev --webpack --hostname localhost --port 3100",
      url: "http://localhost:3100",
      env: {
        API_ORIGIN: "http://127.0.0.1:3101",
        PORT: "3100",
        HOSTNAME: "localhost",
      },
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
