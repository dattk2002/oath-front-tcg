import { testOrigin } from "./test-origin.js";
import {
  observeConsole,
  finishEvidence,
  expectNetworkFailure,
  consoleEvidence,
} from "./recovery-fixtures.js";
import { test, expect } from "@playwright/test";
test.beforeEach(({ page }) => observeConsole(page));
test.afterEach(async ({ page }, testInfo) => {
  await finishEvidence(page, testInfo.title);
});
import {
  create,
  snapshot,
  blockFixture,
  command,
  captureEvidence,
} from "./recovery-fixtures.js";
import { ownerPool } from "../../packages/db/tests/helpers.js";
for (const faction of ["GOOD", "EVIL"] as const)
  test(`complete ${faction} match result reload history expiry rematch`, async ({
    page,
  }) => {
    test.setTimeout(180000);
    const { id } = await create(page, faction, "elements_v1");
    await page.goto(`/matches/${id}`);
    await page.getByRole("button", { name: "Confirm mulligan" }).click();
    for (let i = 0; i < 100; i++) {
      const s = await snapshot(page, id);
      if (!["ACTIVE", "PAUSED"].includes(s.view.lifecycle)) break;
      const pass = page.getByRole("button", {
        name: "End phase",
        exact: true,
      });
      const keep = page.getByRole("button", {
        name: "Keep for later",
        exact: true,
      });
      await expect
        .poll(
          async () =>
            (await page.getByRole("dialog").count()) > 0 ||
            (await page
              .getByRole("button", { name: /^(End phase|Keep for later)$/ })
              .evaluateAll((buttons) =>
                buttons.some(
                  (button) => !(button as HTMLButtonElement).disabled,
                ),
              )),
          { timeout: 20000 },
        )
        .toBe(true);
      if (await page.getByRole("dialog").count()) break;
      if (await keep.isVisible()) await keep.click();
      else await pass.click();
    }
    await expect(
      page.getByRole("dialog", { name: /Defeat|Victory|Draw/ }),
    ).toBeVisible();
    const resultDialog = page.getByRole("dialog", {
      name: /Defeat|Victory|Draw/,
    });
    await expect(resultDialog.locator("h2")).toBeFocused();
    for (const key of ["Tab", "Shift+Tab"])
      for (let tab = 0; tab < 8; tab++) {
        await page.keyboard.press(key);
        expect(
          await page.evaluate(
            () => !!document.activeElement?.closest("dialog"),
          ),
        ).toBe(true);
      }
    await page.keyboard.press("Escape");
    await expect(resultDialog).toBeVisible();
    await captureEvidence(
      page,
      `${faction.toLowerCase()}-result`,
      consoleEvidence(page).unexpected,
    );
    if (faction === "GOOD") {
      await page.setViewportSize({ width: 1024, height: 768 });
      await captureEvidence(
        page,
        "result-tablet",
        consoleEvidence(page).unexpected,
      );
      await page.setViewportSize({ width: 375, height: 812 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await captureEvidence(
        page,
        "result-mobile",
        consoleEvidence(page).unexpected,
      );
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    let releaseLog!: () => void;
    const logGate = new Promise<void>((resolve) => {
      releaseLog = resolve;
    });
    let logHeld = false;
    await page.route(
      `**/api/v1/matches/${id}/events?**`,
      async (route) => {
        logHeld = true;
        await logGate;
        await route.continue();
      },
      { times: 1 },
    );
    await page.reload();
    await expect(page.getByText("Active time", { exact: true })).toBeVisible();
    await expect.poll(() => logHeld).toBe(true);
    const stopSnapshotExpiry = expectNetworkFailure(page, {
      url: `${testOrigin}/api/v1/matches/${id}`,
      status: 410,
    });
    const stopLogExpiry = expectNetworkFailure(page, {
      url: new RegExp(`^${testOrigin}/api/v1/matches/${id}/events[?]`),
      status: 410,
    });
    const owner = ownerPool();
    try {
      await owner.query("DELETE FROM match_checkpoints WHERE match_id=$1", [
        id,
      ]);
    } finally {
      await owner.end();
    }
    const expiredLog = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === `/api/v1/matches/${id}/events` &&
        response.status() === 410,
    );
    releaseLog();
    await expiredLog;
    await page.goto(`/matches/${id}`);
    await expect(page.getByText("Active time", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Five-lane board" }),
    ).toHaveCount(0);
    await page.goto(`/history/${id}`);
    await expect(
      page.getByRole("button", { name: "Rematch", exact: true }),
    ).toBeEnabled();
    stopSnapshotExpiry();
    stopLogExpiry();
    await page.getByRole("button", { name: "Rematch", exact: true }).dblclick();
    await expect(page).toHaveURL(/\/matches\//);
    expect(page.url()).not.toContain(id);
    await expect(
      page.getByRole("heading", { name: "Opening mulligan" }),
    ).toBeVisible();
    const fresh = await snapshot(page, page.url().split("/").at(-1)!);
    expect(fresh.view.self.side).toBe(faction);
    expect(fresh.view.turn).toBe(0);
    expect(consoleEvidence(page).unexpected).toEqual([]);
    await captureEvidence(
      page,
      `${faction.toLowerCase()}-rematch`,
      consoleEvidence(page).unexpected,
    );
  });
test("version drift shows retained source and original/current versions without any replacement create", async ({
  page,
}) => {
  const { id, csrf } = await blockFixture(page);
  await command(page, id, csrf, { kind: "SURRENDER" });
  await page.route(`**/api/v1/matches/${id}/summary`, async (route) => {
    const response = await route.fetch();
    const summary = await response.json();
    summary.rematch.expectedContentVersion = "core_v0";
    await route.fulfill({ json: summary });
  });
  let creates = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/v1/matches"
    )
      creates++;
  });
  await page.goto(`/history/${id}`);
  await page.getByRole("button", { name: "Rematch", exact: true }).click();
  const review = page.getByRole("region", { name: "Review deck" });
  await expect(review).toContainText("D_G_BP");
  await expect(review).toContainText("core_v0");
  await expect(review).toContainText("elements_v1");
  expect(creates).toBe(0);
  await captureEvidence(page, "version-review");
});
test("lost rematch response is restored after reload and retries the same exact create", async ({
  page,
}) => {
  const { id, csrf } = await create(page, "GOOD", "elements_v1");
  await command(page, id, csrf, { kind: "SURRENDER" });
  const sent: unknown[] = [];
  let drop = true;
  await page.route("**/api/v1/matches", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    sent.push(route.request().postDataJSON());
    if (drop) {
      drop = false;
      const committed = await route.fetch();
      expect(committed.status()).toBe(201);
      expectNetworkFailure(page, {
        url: route.request().url(),
        once: true,
        errorText: "net::ERR_FAILED",
      });
      await route.abort("failed");
    } else await route.continue();
  });
  await page.goto(`/history/${id}`);
  await page.getByRole("button", { name: "Rematch", exact: true }).click();
  await expect(page.getByText(/Match creation is unconfirmed/)).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Rematch", exact: true }).click();
  await expect(page).toHaveURL(/\/matches\//);
  await expect(
    page.getByRole("heading", { name: "Opening mulligan" }),
  ).toBeVisible();
  expect(sent).toHaveLength(2);
  expect(sent[1]).toEqual(sent[0]);
});
test("direct in-app rematch discards the old store and ignores a delayed old-match snapshot", async ({
  page,
}) => {
  const { id, csrf } = await create(page, "GOOD", "elements_v1");
  await command(page, id, csrf, { kind: "SURRENDER" });
  await page.goto(`/matches/${id}`);
  await expect(
    page.getByRole("button", { name: "Rematch", exact: true }),
  ).toBeEnabled();
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let waiting!: () => void;
  const received = new Promise<void>((resolve) => {
    waiting = resolve;
  });
  await page.route(`**/api/v1/matches/${id}`, async (route) => {
    const old = await route.fetch();
    waiting();
    await held;
    await route.fulfill({ response: old });
  });
  await received;
  await page.getByRole("button", { name: "Rematch", exact: true }).click();
  await expect(page).not.toHaveURL(new RegExp(id));
  const oldResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === `/api/v1/matches/${id}`,
  );
  release();
  await oldResponse;
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await expect(
    page.getByRole("heading", { name: "Opening mulligan" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator('[data-own-unit="true"]')).toHaveCount(0);
  const fresh = await snapshot(page, page.url().split("/").at(-1)!);
  expect(fresh.view.turn).toBe(0);
  await expect(
    page.getByRole("button", { name: "Confirm mulligan" }),
  ).toBeEnabled();
});
