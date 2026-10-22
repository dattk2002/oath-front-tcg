import { selectLobbyHero } from "./lobby-controls.js";
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("hero lobby keeps equal tiles and Play in view at desktop, tablet and mobile sizes", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Play now · Play vs bot", exact: true })
    .click();
  await expect(page).toHaveURL(/\/heroes$/);
  for (const [width, height] of [
    [1440, 900],
    [1024, 640],
    [768, 1024],
    [375, 812],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    const play = page.getByRole("button", { name: "Play", exact: true });
    await expect(play).toBeVisible();
    await expect(
      page
        .locator(".hero-stage-main")
        .getByRole("button", { name: "Play", exact: true }),
    ).toBeVisible();
    await mkdir(".superpowers/lobby-ui", { recursive: true });
    await page.screenshot({
      path: `.superpowers/lobby-ui/heroes-${width}.png`,
    });
    const boxes = await page
      .locator(".hero-tile:visible")
      .evaluateAll((nodes) =>
        nodes.map((n) => {
          const r = n.getBoundingClientRect();
          return { width: r.width, height: r.height };
        }),
      );
    expect(
      Math.max(...boxes.map((b) => b.width)) -
        Math.min(...boxes.map((b) => b.width)),
    ).toBeLessThan(2);
    expect(
      Math.max(...boxes.map((b) => b.height)) -
        Math.min(...boxes.map((b) => b.height)),
    ).toBeLessThan(2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight + 2,
      ),
    ).toBe(true);
    const bounds = await page.locator(".hero-stage-main").evaluate((stage) => {
      const s = stage.getBoundingClientRect();
      return [...stage.querySelectorAll(".hero-stage-copy, .hero-bust")].map(
        (child) => {
          const r = child.getBoundingClientRect();
          return {
            bottom: r.bottom,
            top: r.top,
            stageBottom: s.bottom,
            stageTop: s.top,
          };
        },
      );
    });
    for (const b of bounds) {
      expect(b.bottom).toBeLessThanOrEqual(b.stageBottom + 2);
      expect(b.top).toBeGreaterThanOrEqual(b.stageTop - 2);
    }
    const r = await play.boundingBox();
    expect(r!.y + r!.height).toBeLessThan(height!);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  for (let i = 0; i < 3; i++) {
    const longName = page.getByRole("radio", { name: /GRAVEMARCH/i });
    if (await longName.count()) break;
    await page
      .getByRole("button", { name: "Next heroes", exact: true })
      .click();
  }
  await page.getByRole("radio", { name: /GRAVEMARCH/i }).check();
  await expect(page.locator("[data-hero-name]")).toHaveText("Gravemarch");
  expect(
    await page
      .locator("[data-hero-name]")
      .evaluate((e) => e.scrollWidth <= e.clientWidth),
  ).toBe(true);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Choose your opponent", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Gravemarch · Ashen Court", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page).toHaveURL(/\/matches\//);
  await expect(page.locator(".hand-card")).toHaveCount(4);
});

test("account controls are compact and deck preview shows actual card art and quantities", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Play now · Play vs bot", exact: true })
    .click();
  await expect(page).toHaveURL(/\/heroes$/);
  await expect(
    page.getByText("Save decks and matches to your account.", { exact: true }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in with Google", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Account", exact: true }),
  ).toBeFocused();
  await page.goto("/heroes/H_E_GRA/decks");
  await expect(
    page.getByRole("region", { name: "Deck cards", exact: true }),
  ).toBeVisible();
  expect(
    await page.locator(".deck-preview-card img[data-art-key]").count(),
  ).toBeGreaterThan(10);
  const total = await page
    .locator(".deck-preview-card")
    .evaluateAll((nodes) =>
      nodes.reduce((n, e) => n + Number(e.getAttribute("data-quantity")), 0),
    );
  expect(total).toBe(30);
  await page.locator(".deck-preview-card").first().click();
  await expect(
    page.getByRole("dialog", { name: "Card details" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".deck-preview-card").first()).toBeFocused();
  await mkdir(".superpowers/lobby-ui", { recursive: true });
  await page.screenshot({
    path: ".superpowers/lobby-ui/decks-desktop.png",
    fullPage: true,
  });
  for (const width of [768, 375]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.superpowers/lobby-ui/decks-${width}.png`,
      fullPage: true,
    });
  }
  const audit = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
});

test("roster motion responds to pointer and settles when reduced motion is enabled", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Play now · Play vs bot", exact: true })
    .click();
  const image = page.locator(".hero-tile .asset-image").first();
  await expect(image).toBeVisible();
  const tile = await page.locator(".hero-tile").first().boundingBox();
  await page.mouse.move(tile!.x + tile!.width - 15, tile!.y + 20);
  await expect
    .poll(() => image.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe("none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() => image.evaluate((el) => getComputedStyle(el).transform))
    .toBe("none");
  for (let i = 0; i < 4; i++) await page.getByRole("radio").nth(i).check();
  const power = page.locator(".power-list > button").first();
  await power.click();
  await expect(
    page.getByRole("dialog", { name: "Power details" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(power).toBeFocused();
  expect(errors).toEqual([]);
});

test("all twenty heroes fit their frames and retain full names at compact sizes", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Play now · Play vs bot", exact: true })
    .click();
  const catalog = await (
    await page.request.get("/api/v1/catalog/elements_v1")
  ).json();
  for (const size of [
    { width: 1024, height: 640 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(size);
    for (const hero of catalog.heroes) {
      await selectLobbyHero(page, hero.id);
      expect(
        await page
          .locator("[data-hero-name]")
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
        hero.id,
      ).toBe(true);
      const bounds = await page.locator(".hero-stage-main").evaluate((el) => {
        const stage = el.getBoundingClientRect();
        const copy = el
          .querySelector(".hero-stage-copy")!
          .getBoundingClientRect();
        return {
          top: copy.top,
          bottom: copy.bottom,
          stageTop: stage.top,
          stageBottom: stage.bottom,
        };
      });
      expect(bounds.top, hero.id).toBeGreaterThanOrEqual(bounds.stageTop - 2);
      expect(bounds.bottom, hero.id).toBeLessThanOrEqual(
        bounds.stageBottom + 2,
      );
    }
    await selectLobbyHero(page, "H_E_GRA");
    await page.screenshot({
      path: `.superpowers/lobby-ui/gravemarch-${size.width}.png`,
    });
  }
  const audit = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.setViewportSize({ width: 720, height: 450 });
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
