import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { evidencePath } from "./evidence-path.js";
import AxeBuilder from "@axe-core/playwright";
const evidence = evidencePath(
  "features-arenas",
  ".superpowers/sdd/2026-10-22-events-affinities/browser/features-arenas",
);

test("Features manual tabs, interruption, artwork fallback and static reduced mode", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/game-features");
  const tabs = page.getByRole("tablist", { name: "Game features" });
  await expect(tabs.getByRole("tab")).toHaveCount(4);
  await tabs.getByRole("tab", { name: "Two-system heroes" }).click();
  await expect(
    page.getByRole("heading", { name: "Two systems. One identity." }),
  ).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(
    tabs.getByRole("tab", { name: "Collectible cards" }),
  ).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Every card. A new possibility." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next feature" }).click();
  await expect(
    page.getByRole("heading", { name: "A fresh challenge. Every day." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Previous feature" }).click();
  await tabs.getByRole("tab").first().click();
  await tabs.getByRole("tab").last().click();
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
  await mkdir(evidence, { recursive: true });
  for (const width of [1440, 1024, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.locator(".arena-gallery figure").last().scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        page
          .locator(".arena-gallery img")
          .evaluateAll((nodes) =>
            nodes.every(
              (img) =>
                (img as HTMLImageElement).complete &&
                (img as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    await page
      .locator(".arena-gallery img")
      .evaluateAll((nodes) =>
        Promise.all(nodes.map((img) => (img as HTMLImageElement).decode())),
      );
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: `${evidence}/features-${width}.png`,
      fullPage: true,
    });
  }
  expect(
    (
      await new AxeBuilder({ page })
        .include(".feature-controls")
        .withRules(["color-contrast", "aria-valid-attr-value", "button-name"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".feature-panel:visible")).toHaveCount(4);
  await expect(tabs).not.toBeVisible();
  await page.screenshot({
    path: `${evidence}/features-reduced.png`,
    fullPage: true,
  });
  await page.route("**/assets/features-v2/*", (route) => route.abort());
  await page.reload();
  await expect(
    page.locator(".feature-panel .campaign-art-fallback").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Five lanes. Endless decisions." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Heroes", exact: true }).first().click();
  await expect(page).toHaveURL("/explore/heroes");
  expect(errors).toEqual([]);
});

import { checkpoint, prepare, enter } from "./quality-fixtures.js";
test("decorated current board preserves five equal lanes, stats and targets at supported sizes", async ({
  page,
}) => {
  const dto = checkpoint();
  dto.view.versions.content = "elements_v1";
  dto.view.board[0]!.location = {
    state: "REVEALED",
    definitionId: "ancient_forest",
    revealTurn: 1,
  };
  const errors = await prepare(page, dto, /\/assets\/world-v1\/.*\.webp$/);
  await enter(page, dto.view.matchId);
  await expect(page.locator(".board")).toHaveAttribute(
    "data-arena",
    "moonroot-conservatory",
  );
  await expect(page.locator(".arena-decor")).toHaveCSS(
    "pointer-events",
    "none",
  );
  await mkdir(evidence, { recursive: true });
  for (const [width, height] of [
    [1440, 900],
    [1366, 768],
    [1280, 720],
    [1024, 768],
    [1024, 640],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    await page.evaluate(() => document.fonts.ready);
    const boxes = await page.locator(".lane").evaluateAll((nodes) =>
      nodes.map((el) => {
        const r = el.getBoundingClientRect();
        const target = el
          .querySelector("[data-lane-id]")!
          .getBoundingClientRect();
        return {
          x: r.x,
          right: r.right,
          width: r.width,
          target: {
            x: target.x,
            right: target.right,
            width: target.width,
            height: target.height,
          },
        };
      }),
    );
    expect(boxes).toHaveLength(5);
    for (const box of boxes) {
      expect(Math.abs(box.width - boxes[0]!.width)).toBeLessThan(1);
      expect(box.target.x).toBeGreaterThanOrEqual(box.x);
      expect(box.target.right).toBeLessThanOrEqual(box.right);
      expect(box.target.width).toBeGreaterThanOrEqual(44);
      expect(box.target.height).toBeGreaterThanOrEqual(44);
    }
    for (const card of await page.locator(".hand-card").all()) {
      const b = await card.boundingBox();
      for (const metadata of await card
        .locator(".hand-meta,.hand-meta > span,.card-summary")
        .all()) {
        const r = await metadata.boundingBox();
        expect(r!.x + r!.width).toBeLessThanOrEqual(b!.x + b!.width + 1);
        expect(r!.y + r!.height).toBeLessThanOrEqual(b!.y + b!.height + 1);
      }
    }
    await expect(page.locator(".board-unit .unit-stats")).toHaveCount(10);
    await expect(
      page.getByRole("button", { name: "End phase", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `${evidence}/arena-${width}-${height}.png`,
      fullPage: true,
    });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".arena-mote").first()).toHaveCSS(
    "transform",
    "none",
  );
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator(".small-fallback")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: `${evidence}/arena-375.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/assets/world-v1/*", (r) => r.abort());
  await page.reload();
  await expect(page.locator(".arena-decor img")).toHaveCount(0);
  await expect(page.locator(".board-unit .unit-stats").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "End phase", exact: true }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
});
