import { evidencePath } from "./evidence-path.js";
import { test, expect, type Page } from "@playwright/test";
import {
  checkpoint,
  prepare,
  enter,
  collectBrowserErrors,
  createQualityGuest,
} from "./quality-fixtures.js";
import { mkdir, writeFile } from "node:fs/promises";
const evidence =
  process.env.OATHFRONT_QUALITY_EVIDENCE_DIR ??
  evidencePath("task16", "docs/implementation/evidence/task16");
test.beforeAll(() => mkdir(evidence, { recursive: true }).then(() => {}));
export async function fits(page: Page, selector: string) {
  const bounds = await page.locator(selector).evaluateAll((nodes) =>
    nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return {
        top: r.top,
        bottom: r.bottom,
        left: r.left,
        right: r.right,
        width: r.width,
        height: r.height,
      };
    }),
  );
  for (const r of bounds) {
    expect(r.top, selector).toBeGreaterThanOrEqual(0);
    expect(r.bottom, selector).toBeLessThanOrEqual(page.viewportSize()!.height);
    expect(r.left, selector).toBeGreaterThanOrEqual(0);
    expect(r.right, selector).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
}
for (const [width, height] of [
  [1440, 900],
  [1366, 768],
  [1280, 720],
  [1024, 768],
  [1024, 640],
])
  test(`ten cards and ten units fit ${width}x${height}`, async ({ page }) => {
    const dto = checkpoint();
    const errors = await prepare(page, dto);
    await page.setViewportSize({ width: width!, height: height! });
    await enter(page, dto.view.matchId);
    await expect(
      page.getByRole("button", { name: "Kết thúc hành động", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await fits(page, ".hero-panel,.lane,.hand-card,.phase-controls");
    const cards = await page.locator(".hand-card").evaluateAll((nodes) =>
      nodes.map((n) => {
        const r = n.getBoundingClientRect();
        return {
          left: r.left,
          right: r.right,
          width: r.width,
          height: r.height,
        };
      }),
    );
    expect(cards).toHaveLength(10);
    for (const [index, card] of cards.entries()) {
      expect(card.width).toBeGreaterThanOrEqual(44);
      expect(card.height).toBeGreaterThanOrEqual(44);
      if (index > 0)
        expect(card.left - cards[index - 1]!.right).toBeGreaterThanOrEqual(8);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `${evidence}/battle-${width}-${height}.png`,
    });
    expect(errors).toEqual([]);
  });
test("375px fallback preserves readable lane list", async ({ page }) => {
  const dto = checkpoint();
  const errors = await prepare(page, dto);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/matches/${dto.view.matchId}`);
  await expect(
    page.getByRole("heading", {
      name: "Xoay ngang hoặc dùng màn hình lớn để vào trận",
    }),
  ).toBeVisible();
  await page.getByText("Đọc bàn hiện tại", { exact: true }).click();
  await expect(page.locator(".small-fallback ol li")).toHaveCount(5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("actionable tutorial G01 G02 and block fit low tablet and desktop", async ({
  page,
}) => {
  await createQualityGuest(page);
  const errors = collectBrowserErrors(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Học cách chơi", exact: true })
    .click();
  await page.waitForURL(/matches/);
  const next = async (name = "Tiếp tục") => {
    await page
      .getByRole("complementary", { name: "Hướng dẫn chơi" })
      .getByRole("button", { name, exact: true })
      .click();
  };
  const check = async (label: string) => {
    for (const [width, height] of [
      [1440, 900],
      [1024, 640],
    ]) {
      await page.setViewportSize({ width: width!, height: height! });
      await page.screenshot({
        path: `${evidence}/tutorial-${label}-${width}.png`,
      });
      await fits(page, ".hero-panel,.lane,.tutorial-panel");
      if (await page.locator(".block-response").count()) {
        await fits(page, ".block-response");
        await expect(
          page.getByRole("button", { name: "Để dành", exact: true }),
        ).toBeInViewport({ ratio: 1 });
      } else await fits(page, ".hand-card,.phase-controls");
    }
  };
  await expect(page.locator(".tutorial-panel")).toHaveAttribute(
    "data-step",
    "G01",
  );
  await expect(page.locator(".hand-card").first()).toBeVisible();
  await expect(
    page.locator(".hand-card").filter({ hasText: "Người Gác Đèn" }),
  ).toHaveAttribute("data-playable-unit", "true");
  await check("G01");
  await page.locator(".hand-card").filter({ hasText: "Người Gác Đèn" }).click();
  await page.locator('[data-lane-id="2"]').click();
  await next();
  await expect(page.locator(".tutorial-panel")).toHaveAttribute(
    "data-step",
    "G02",
  );
  await check("G02");
  await page.locator(".hand-card").filter({ hasText: "Kỵ Sĩ Lá" }).click();
  await expect(
    page.getByText("Cần 2 năng lượng, hiện có 0.", { exact: false }),
  ).toBeVisible();
  for (const [width, height] of [
    [1440, 900],
    [1024, 640],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    const inspect = page.getByRole("complementary", {
      name: "Chi tiết lựa chọn",
    });
    const tutorial = page.getByRole("complementary", {
      name: "Hướng dẫn chơi",
    });
    const bounds = {
      inspect: await inspect.boundingBox(),
      tutorial: await tutorial.boundingBox(),
    };
    await writeFile(
      `${evidence}/tutorial-inspect-${width}.json`,
      JSON.stringify(bounds),
    );
    await page.screenshot({
      path: `${evidence}/tutorial-inspect-${width}.png`,
    });
    expect(bounds.inspect!.y).toBeGreaterThanOrEqual(
      bounds.tutorial!.y + bounds.tutorial!.height,
    );
    const proceed = tutorial.getByRole("button", {
      name: "Đã hiểu",
      exact: true,
    });
    await expect(proceed).toBeInViewport({ ratio: 1 });
    await proceed.click({ trial: true, timeout: 2000 });
    await inspect.getByRole("button", { name: "Hủy lựa chọn · Esc" }).focus();
    await expect(
      inspect.getByRole("button", { name: "Hủy lựa chọn · Esc" }),
    ).toBeInViewport({ ratio: 1 });
    const skip = tutorial.getByRole("button", {
      name: "Bỏ qua hướng dẫn",
      exact: true,
    });
    await skip.focus();
    await expect(skip).toBeInViewport({ ratio: 1 });
    await proceed.focus();
    await expect(proceed).toBeInViewport({ ratio: 1 });
  }
  await next("Đã hiểu");
  await page
    .getByRole("button", { name: "Kết thúc hành động", exact: true })
    .click();
  await next("Bài tiếp theo");
  await expect(page.locator(".tutorial-panel")).toHaveAttribute(
    "data-step",
    "G04",
  );
  await expect(
    page.locator(".hand-card").filter({ hasText: "Tia Đèn" }),
  ).toHaveAttribute("data-playable", "true");
  await page.locator(".hand-card").filter({ hasText: "Tia Đèn" }).click();
  await page
    .getByRole("button", { name: /Lộ 4, Lính Tro.*mục tiêu hợp lệ/ })
    .click();
  await next();
  await page
    .getByRole("button", { name: "Kết thúc hành động", exact: true })
    .click();
  await next("Bài tiếp theo");
  await expect(page.locator(".tutorial-panel")).toHaveAttribute(
    "data-step",
    "G06",
  );
  await expect(
    page.locator(".hand-card").filter({ hasText: "Mầm Khiên" }),
  ).toHaveAttribute("data-playable-unit", "true");
  await page.locator(".hand-card").filter({ hasText: "Mầm Khiên" }).click();
  await page.locator('[data-lane-id="3"]').click();
  await next("Bài tiếp theo");
  await expect(page.locator(".block-response")).toBeVisible();
  await expect(page.locator('[data-presentation="idle"]')).toBeAttached();
  await check("G07");
  await writeFile(
    `${evidence}/tutorial-inspect-console.json`,
    JSON.stringify(errors),
  );
  expect(errors).toEqual([]);
});
test("empty hand, pending command and renderer failure keep essential controls readable", async ({
  page,
}) => {
  const dto = checkpoint();
  dto.view.self.hand = [];
  dto.view.players.GOOD.handCount = 0;
  const errors = await prepare(
    page,
    dto,
    /\/assets\/core-v1\/atlases\/[^/]+\.webp$/,
  );
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.route("**/assets/core-v1/atlases/**", (r) => r.abort());
  await page.goto(`/matches/${dto.view.matchId}`);
  await expect(page.locator('[data-scene-status="fallback"]')).toBeAttached({
    timeout: 15000,
  });
  await expect(
    page.getByText("Tay bài trống.", { exact: false }),
  ).toBeVisible();
  await fits(page, ".hero-panel,.lane,.phase-controls");
  await page.screenshot({
    path: `${evidence}/empty-renderer-fallback.png`,
  });
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/commands", async (r) => {
    await gate;
    await r.fulfill({ json: { ...dto, revision: 2 } });
  });
  await page
    .getByRole("button", { name: "Kết thúc hành động", exact: true })
    .click();
  await expect(page.getByTestId("command-status")).toContainText(
    "Đang xác nhận",
  );
  await fits(page, '[data-testid="command-status"]');
  await page.screenshot({
    path: `${evidence}/pending.png`,
  });
  release();
  await expect(page.getByTestId("command-status")).not.toContainText(
    "Đang xác nhận",
  );
  expect(errors).toEqual([]);
});
