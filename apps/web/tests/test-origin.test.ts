import { afterEach, expect, it, vi } from "vitest";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
it("isolates the configurable API from UI and keeps loopback-only fixture origins", async () => {
  vi.stubEnv("OATHFRONT_E2E_API_PORT", "3121");
  const config = await import("../../../tests/e2e/test-origin.js");
  expect(config.testApiOrigin).toBe("http://127.0.0.1:3121");
  expect(config.testApiPort).toBe(3121);
});
it.each([
  "3000",
  "3001",
  "3100",
  "3200",
  "3201",
  "0",
  "65536",
  "NaN",
  "3121.5",
  "http://remote:3121",
])("rejects unsafe API port %s before starting a fixture", async (port) => {
  vi.stubEnv("OATHFRONT_E2E_API_PORT", port);
  await expect(import("../../../tests/e2e/test-origin.js")).rejects.toThrow(
    /fixture port/,
  );
});
