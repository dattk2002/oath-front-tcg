import { observeConsole, finishEvidence } from "./recovery-fixtures.js";
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
    const { id } = await create(page, faction);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        !(
          message.text().includes("status of 410") &&
          message.location().url.endsWith(`/api/v1/matches/${id}`)
        )
      )
        errors.push(message.text());
    });
    await page.goto(`/matches/${id}`);
    await page.getByRole("button", { name: "Xác nhận đổi bài" }).click();
    for (let i = 0; i < 100; i++) {
      const s = await snapshot(page, id);
      if (!["ACTIVE", "PAUSED"].includes(s.view.lifecycle)) break;
      const pass = page.getByRole("button", {
        name: "Kết thúc hành động",
        exact: true,
      });
      const keep = page.getByRole("button", { name: "Để dành", exact: true });
      await expect
        .poll(
          async () =>
            (await page.getByRole("dialog").count()) > 0 ||
            (await page
              .getByRole("button", { name: /^(Kết thúc hành động|Để dành)$/ })
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
      page.getByRole("dialog", { name: /Thất bại|Chiến thắng|Hòa/ }),
    ).toBeVisible();
    const resultDialog = page.getByRole("dialog", {
      name: /Thất bại|Chiến thắng|Hòa/,
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
    await captureEvidence(page, `${faction.toLowerCase()}-result`, errors);
    if (faction === "GOOD") {
      await page.setViewportSize({ width: 1024, height: 768 });
      await captureEvidence(page, "result-tablet", errors);
      await page.setViewportSize({ width: 375, height: 812 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await captureEvidence(page, "result-mobile", errors);
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    await page.reload();
    await expect(
      page.getByText("Thời gian hoạt động", { exact: true }),
    ).toBeVisible();
    const owner = ownerPool();
    try {
      await owner.query("DELETE FROM match_checkpoints WHERE match_id=$1", [
        id,
      ]);
    } finally {
      await owner.end();
    }
    await page.goto(`/matches/${id}`);
    await expect(
      page.getByText("Thời gian hoạt động", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Bàn năm lộ" })).toHaveCount(
      0,
    );
    await page.goto(`/history/${id}`);
    await expect(
      page.getByRole("button", { name: "Chơi lại", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Chơi lại", exact: true })
      .dblclick();
    await expect(page).toHaveURL(/\/matches\//);
    expect(page.url()).not.toContain(id);
    await expect(
      page.getByRole("heading", { name: "Đổi bài đầu trận" }),
    ).toBeVisible();
    const fresh = await snapshot(page, page.url().split("/").at(-1)!);
    expect(fresh.view.self.side).toBe(faction);
    expect(fresh.view.turn).toBe(0);
    expect(errors).toEqual([]);
    await captureEvidence(page, `${faction.toLowerCase()}-rematch`, errors);
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
  await page.getByRole("button", { name: "Chơi lại", exact: true }).click();
  const review = page.getByRole("region", { name: "Xem lại bộ bài" });
  await expect(review).toContainText("D_G_BP");
  await expect(review).toContainText("core_v0");
  await expect(review).toContainText("core_v1");
  expect(creates).toBe(0);
  await captureEvidence(page, "version-review");
});
test("lost rematch response is restored after reload and retries the same exact create", async ({
  page,
}) => {
  const { id, csrf } = await blockFixture(page);
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
      await route.abort("failed");
    } else await route.continue();
  });
  await page.goto(`/history/${id}`);
  await page.getByRole("button", { name: "Chơi lại", exact: true }).click();
  await expect(page.getByText(/Chưa xác định kết quả tạo trận/)).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Chơi lại", exact: true }).click();
  await expect(page).toHaveURL(/\/matches\//);
  await expect(
    page.getByRole("heading", { name: "Đổi bài đầu trận" }),
  ).toBeVisible();
  expect(sent).toHaveLength(2);
  expect(sent[1]).toEqual(sent[0]);
});
test("direct in-app rematch discards the old store and ignores a delayed old-match snapshot", async ({
  page,
}) => {
  const { id, csrf } = await blockFixture(page);
  await command(page, id, csrf, { kind: "SURRENDER" });
  await page.goto(`/matches/${id}`);
  await expect(
    page.getByRole("button", { name: "Chơi lại", exact: true }),
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
  await page.getByRole("button", { name: "Chơi lại", exact: true }).click();
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
    page.getByRole("heading", { name: "Đổi bài đầu trận" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator('[data-own-unit="true"]')).toHaveCount(0);
  const fresh = await snapshot(page, page.url().split("/").at(-1)!);
  expect(fresh.view.turn).toBe(0);
  await expect(
    page.getByRole("button", { name: "Xác nhận đổi bài" }),
  ).toBeEnabled();
});
