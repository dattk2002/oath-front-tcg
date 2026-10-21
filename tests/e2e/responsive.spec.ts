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
      page.getByRole("button", { name: "End phase", exact: true }),
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
      name: "Rotate your device or use a larger screen to play",
    }),
  ).toBeVisible();
  await page.getByText("Read the current board", { exact: true }).click();
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
    .getByRole("button", { name: "Learn to play", exact: true })
    .click();
  await page.waitForURL(/matches/);
  const next = async (name = "Continue") => {
    await page
      .getByRole("complementary", { name: "Tutorial" })
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
          page.getByRole("button", { name: "Keep for later", exact: true }),
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
    page.locator(".hand-card").filter({ hasText: "Lanternkeeper" }),
  ).toHaveAttribute("data-playable-unit", "true");
  await check("G01");
  await page.locator(".hand-card").filter({ hasText: "Lanternkeeper" }).click();
  await page.locator('[data-lane-id="2"]').click();
  await next();
  await expect(page.locator(".tutorial-panel")).toHaveAttribute(
    "data-step",
    "G02",
  );
  await check("G02");
  await page.locator(".hand-card").filter({ hasText: "Leaf Knight" }).click();
  await expect(
    page.getByText("Requires 2 energy; you have 0.", { exact: false }),
  ).toBeVisible();
  for (const [width, height] of [
    [1440, 900],
    [1024, 640],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    const inspect = page.getByRole("complementary", {
      name: "Selection details",
    });
    const tutorial = page.getByRole("complementary", {
      name: "Tutorial",
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
      name: "Got it",
      exact: true,
    });
    await expect(proceed).toBeInViewport({ ratio: 1 });
    await proceed.click({ trial: true, timeout: 2000 });
    await inspect
      .getByRole("button", { name: "Cancel selection · Esc" })
      .focus();
    await expect(
      inspect.getByRole("button", { name: "Cancel selection · Esc" }),
    ).toBeInViewport({ ratio: 1 });
    const skip = tutorial.getByRole("button", {
      name: "Skip tutorial",
      exact: true,
    });
    await skip.focus();
    await writeFile(
      `${evidence}/tutorial-skip-focus-${width}.json`,
      JSON.stringify(
        await skip.evaluate((button) => {
          const panel = button.closest(".tutorial-panel")!;
          const bounds = button.getBoundingClientRect();
          const panelBounds = panel.getBoundingClientRect();
          return {
            button: {
              top: bounds.top,
              bottom: bounds.bottom,
              height: bounds.height,
            },
            panel: { top: panelBounds.top, bottom: panelBounds.bottom },
            scrollTop: panel.scrollTop,
            scrollHeight: panel.scrollHeight,
            clientHeight: panel.clientHeight,
            viewportHeight: innerHeight,
          };
        }),
      ),
    );
    await expect(skip).toBeInViewport({ ratio: 1 });
    await proceed.focus();
    await expect(proceed).toBeInViewport({ ratio: 1 });
  }
  await next("Got it");
  await page.getByRole("button", { name: "End phase", exact: true }).click();
  await next("Next lesson");
  await expect(page.locator(".tutorial-panel")).toHaveAttribute(
    "data-step",
    "G04",
  );
  await expect(
    page.locator(".hand-card").filter({ hasText: "Lantern Ray" }),
  ).toHaveAttribute("data-playable", "true");
  await page.locator(".hand-card").filter({ hasText: "Lantern Ray" }).click();
  await page
    .getByRole("button", { name: /Lane 4, Ash Soldier.*legal target/ })
    .click();
  await next();
  await page.getByRole("button", { name: "End phase", exact: true }).click();
  await next("Next lesson");
  await expect(page.locator(".tutorial-panel")).toHaveAttribute(
    "data-step",
    "G06",
  );
  await expect(
    page.locator(".hand-card").filter({ hasText: "Shieldseed" }),
  ).toHaveAttribute("data-playable-unit", "true");
  await page.locator(".hand-card").filter({ hasText: "Shieldseed" }).click();
  await page.locator('[data-lane-id="3"]').click();
  await next("Next lesson");
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
    /\/assets\/fivefold-cards-v3\/atlases\/[^/]+\.webp$/,
  );
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.route("**/assets/fivefold-cards-v3/atlases/**", (r) => r.abort());
  await page.goto(`/matches/${dto.view.matchId}`);
  await expect(page.locator('[data-scene-status="fallback"]')).toBeAttached({
    timeout: 15000,
  });
  await expect(
    page.getByText("Your hand is empty.", { exact: false }),
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
  await page.getByRole("button", { name: "End phase", exact: true }).click();
  await expect(page.getByTestId("command-status")).toContainText("Checking…");
  await fits(page, '[data-testid="command-status"]');
  await page.screenshot({
    path: `${evidence}/pending.png`,
  });
  release();
  await expect(page.getByTestId("command-status")).not.toContainText(
    "Checking…",
  );
  expect(errors).toEqual([]);
});
