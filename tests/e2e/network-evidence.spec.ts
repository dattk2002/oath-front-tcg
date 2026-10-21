import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import {
  observeConsole,
  expectNetworkFailure,
  consoleEvidence,
} from "./recovery-fixtures.js";
import { testOrigin } from "./test-origin.js";
import { evidencePath } from "./evidence-path.js";

test("explicit network evidence rejects wrong resource status scope and unrelated errors", async ({
  page,
}) => {
  await page.goto("/api/v1/catalog/core_v1");
  observeConsole(page);
  const expectedUrl = `${testOrigin}/__console-evidence/match-a`;
  let expectedCalls = 0;
  await page.route("**/__console-evidence/*", (route) => {
    const expected = route.request().url() === expectedUrl;
    const status = expected && ++expectedCalls === 2 ? 503 : 410;
    return route.fulfill({ status, json: { deliberatelyInjected: true } });
  });
  const stop = expectNetworkFailure(page, { url: expectedUrl, status: 410 });
  const fetchStatus = (url: string) =>
    page.evaluate(async (target) => (await fetch(target)).status, url);
  expect(await fetchStatus(expectedUrl)).toBe(410);
  expect(await fetchStatus(expectedUrl)).toBe(503);
  expect(await fetchStatus(`${testOrigin}/__console-evidence/match-b`)).toBe(
    410,
  );
  await expect.poll(() => consoleEvidence(page).allErrors.length).toBe(3);
  stop();
  expect(await fetchStatus(expectedUrl)).toBe(410);
  await page.evaluate(() => {
    console.error(
      "Failed to load resource: the server responded with a status of 410 (Gone)",
    );
    setTimeout(() => {
      throw Error("unrelated page sentinel");
    }, 0);
  });
  await expect.poll(() => consoleEvidence(page).allErrors.length).toBe(6);
  expectNetworkFailure(page, { url: expectedUrl, status: 410, once: true });
  expect(await fetchStatus(expectedUrl)).toBe(410);
  expect(await fetchStatus(expectedUrl)).toBe(410);
  await expect.poll(() => consoleEvidence(page).allErrors.length).toBe(8);
  const result = consoleEvidence(page);
  expect(result.expected).toHaveLength(2);
  expect(result.expected[0]?.url).toBe(expectedUrl);
  expect(result.unexpected).toHaveLength(6);
  expect(result.unexpected).toContain("pageerror: unrelated page sentinel");
  expect(
    result.networkFailures.filter(
      (failure) => failure.expectedSince !== undefined,
    ),
  ).toHaveLength(2);
  const directory = evidencePath(
    "network-evidence",
    "artifacts/network-evidence",
  );
  await mkdir(directory, { recursive: true });
  await writeFile(
    `${directory}/negative-controls.json`,
    JSON.stringify(result, null, 2),
  );
});
