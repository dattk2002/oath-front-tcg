import { evidencePath } from "./evidence-path.js";
import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID, randomBytes } from "node:crypto";
import { testOrigin } from "./test-origin.js";
import { cardFixture } from "./recovery-fixtures.js";
const evidence = evidencePath(
  "pen-game",
  ".superpowers/sdd/2026-10-21-pen-design-implementation/browser/game",
);
test("Pen presentation keeps hero selection, deck, settings and battle readable at supported sizes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("401 (Unauthorized)"))
      errors.push(m.text());
  });
  await mkdir(evidence, { recursive: true });
  const guest = await page.request.post("/api/v1/guest", {
    headers: { Origin: testOrigin },
    data: {
      commandId: randomUUID(),
      recoverySecret: randomBytes(32).toString("base64url"),
    },
  });
  expect(guest.status()).toBe(201);
  async function capture(name: string) {
    await page.evaluate(() => document.fonts.ready);
    if (await page.locator(".hero-detail").count())
      await expect
        .poll(() =>
          page
            .locator(".hero-detail")
            .evaluate((el) => getComputedStyle(el).opacity),
        )
        .toBe("1");
    await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  for (const [label, width, height] of [
    ["desktop", 1440, 900],
    ["tablet", 1024, 640],
    ["mobile", 375, 812],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator("[data-home-headline]")).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator(".campaign-home-art img")
          .evaluateAll(
            (imgs) =>
              imgs.length === 1 &&
              imgs.every((im) => (im as HTMLImageElement).naturalWidth > 0),
          ),
      )
      .toBe(true);
    await capture(`home-${label}`);
    await page.getByRole("button", { name: "Play now · Play vs bot" }).click();
    await expect(page.locator("[data-hero-stage]")).toBeVisible();
    await page.locator('input[name="hero"]').last().check();
    await expect(page.locator("[data-hero-name]")).toHaveText("Morrow");
    await page.locator('input[name="hero"]').first().check();
    await capture(`heroes-${label}`);
    await page
      .getByRole("button", { name: "Choose deck", exact: true })
      .click();
    await page.getByRole("link", { name: "Create deck", exact: true }).click();
    await expect(page.locator(".collection-card").first()).toBeVisible();
    const add = page
      .locator(".collection-card")
      .last()
      .getByRole("button", { name: /^Add / });
    await add.focus();
    const clearance = await add.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const f = document.querySelector(".deck-footer")!.getBoundingClientRect();
      return {
        top: r.top,
        bottom: r.bottom,
        height: r.height,
        width: r.width,
        footerTop: f.top,
        viewport: innerHeight,
      };
    });
    expect(clearance.height).toBeGreaterThanOrEqual(44);
    expect(clearance.width).toBeGreaterThanOrEqual(44);
    expect(clearance.top).toBeGreaterThanOrEqual(0);
    expect(clearance.bottom).toBeLessThanOrEqual(
      Math.min(clearance.viewport, clearance.footerTop),
    );
    await page
      .locator(".collection-card")
      .first()
      .getByRole("button", { name: /^Add / })
      .focus();
    await capture(`deck-${label}`);
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const tutorials = await page
      .locator(".settings-tutorial button")
      .evaluateAll((els) =>
        els.map((el) => el.getBoundingClientRect().toJSON()),
      );
    expect(tutorials[1]!.top - tutorials[0]!.bottom).toBeGreaterThanOrEqual(8);
    await capture(`settings-${label}`);
  }
  await page.setViewportSize({ width: 720, height: 450 });
  await page.goto("/heroes");
  await expect(page.locator("[data-hero-stage]")).toBeVisible();
  await capture("heroes-200-percent-reflow");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.context().clearCookies();
  const match = await cardFixture(page, true);
  await page.goto(`/matches/${match.id}`);
  await expect(page.locator(".small-fallback")).toBeVisible();
  await capture("battle-small-fallback");
  for (const [label, width, height] of [
    ["desktop", 1440, 900],
    ["tablet", 1024, 640],
  ] as const) {
    await page.setViewportSize({ width, height });
    await expect(page.locator('[data-scene-status="ready"]')).toHaveCount(1);
    await page.locator(".hand-card").first().click();
    await expect(page.locator(".inspect")).toBeVisible();
    const phase = await page
      .getByRole("button", { name: "End phase", exact: true })
      .boundingBox();
    expect(phase!.y + phase!.height).toBeLessThanOrEqual(height);
    await capture(`battle-${label}`);
  }
  await writeFile(`${evidence}/console.json`, JSON.stringify(errors, null, 2));
  expect(errors).toEqual([]);
});

test("compact arena keeps phase action visible without scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 640 });
  const match = await cardFixture(page, true);
  await page.setViewportSize({ width: 720, height: 450 });
  await page.goto("/heroes");
  await expect(page.locator("[data-hero-stage]")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".hero-detail")
        .evaluate((el) => getComputedStyle(el).opacity),
    )
    .toBe("1");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `${evidence}/heroes-200-percent-reflow.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.goto(`/matches/${match.id}`);
  await expect(page.locator('[data-scene-status="ready"]')).toHaveCount(1);
  await page.locator(".hand-card").first().click();
  await page.evaluate(() => window.scrollTo(0, 0));
  const phase = await page
    .getByRole("button", { name: "End phase", exact: true })
    .boundingBox();
  expect(phase!.y + phase!.height).toBeLessThanOrEqual(640);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await mkdir(evidence, { recursive: true });
  await page.screenshot({
    path: `${evidence}/battle-tablet.png`,
    fullPage: true,
  });
  await page.screenshot({ path: `${evidence}/battle-tablet-viewport.png` });
  await writeFile(
    `${evidence}/compact-bounds.json`,
    JSON.stringify(phase, null, 2),
  );
});
