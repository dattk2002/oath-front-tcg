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
});
