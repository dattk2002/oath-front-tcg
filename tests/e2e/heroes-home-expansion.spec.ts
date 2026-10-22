import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { evidencePath } from "./evidence-path.js";
const evidence = evidencePath(
  "heroes-home",
  ".superpowers/sdd/2026-10-22-playable-heroes-home/browser",
);
test("expanded Home has six useful sections, keyboard phase preview and responsive art", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (msg) => {
    if (
      msg.type() === "error" &&
      !(
        msg.location().url.endsWith("/api/v1/session") && /401/.test(msg.text())
      )
    )
      errors.push(msg.text());
  });
  await mkdir(evidence, { recursive: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [width, height] of [
    [1440, 900],
    [1024, 640],
    [375, 812],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    await page.goto("/");
    await expect(page.locator(".campaign-home > section")).toHaveCount(6);
    await expect(page.locator("main h1")).toHaveText("FIVE LANES.ONE OATH.");
    await expect(page.locator(".home-tactics-board")).toBeVisible();
    const lanes = await page
      .locator(".home-tactics-board-lane")
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const r = node.getBoundingClientRect();
          return { x: r.x, y: r.y };
        }),
      );
    expect(lanes).toHaveLength(5);
    for (let i = 1; i < lanes.length; i++) {
      expect(lanes[i]!.x).toBeGreaterThan(lanes[i - 1]!.x);
      expect(Math.abs(lanes[i]!.y - lanes[0]!.y)).toBeLessThan(2);
    }
    const combat = page.getByRole("button", { name: "Combat", exact: true });
    await combat.focus();
    await page.keyboard.press("Enter");
    await expect(combat).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#home-phase-description")).toContainText(
      "Both units strike simultaneously within each lane",
    );
    for (const img of await page.locator("main img").all())
      await img.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        page
          .locator("main img")
          .evaluateAll((images) =>
            images.every(
              (img) =>
                (img as HTMLImageElement).complete &&
                (img as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => {
      window.scrollTo(0, 0);
      await Promise.all(
        [...document.querySelectorAll("main img")].map((img) =>
          (img as HTMLImageElement).decode(),
        ),
      );
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    });
    await page.screenshot({
      path: `${evidence}/home-${width}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});
test("new hero profile enters a real versioned PvE match and resumes after reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/explore/heroes/H_G_SOL");
  await expect(
    page.getByRole("heading", { name: "Solenne", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Solar Accord", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Choose deck" }).click();
  await expect(page).toHaveURL(/\/heroes\/H_G_SOL\/decks$/);
  await page
    .getByRole("button", { name: "Use this deck", exact: true })
    .click();
  await page.getByLabel("Opponent hero").selectOption("H_E_VAN");
  const created = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" && r.url().endsWith("/api/v1/matches"),
  );
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  const dto = await response.json();
  expect(dto.view.versions.content).toBe("heroes_v1");
  expect(dto.view.players.GOOD.heroId).toBe("H_G_SOL");
  expect(dto.view.players.EVIL.heroId).toBe("H_E_VAN");
  await expect(page).toHaveURL(new RegExp(`/matches/${dto.view.matchId}$`));
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Opening mulligan" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("twenty public profiles expose their original names and four powers", async ({
  page,
}) => {
  test.setTimeout(120000);
  const catalog = await (
    await page.request.get("/api/v1/catalog/heroes_v1")
  ).json();
  for (const hero of catalog.heroes) {
    await page.goto(`/explore/heroes/${hero.id}`);
    await expect(page.locator(".campaign-powers article")).toHaveCount(4);
    await expect(
      page.locator(".campaign-profile .profile-portrait img"),
    ).toHaveAttribute("src", /heroes-v4/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("mobile hero names and banner retain visible geometry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const banner = page.locator(".campaign-home-art img");
  await expect(banner).toBeVisible();
  expect((await banner.boundingBox())!.height).toBeGreaterThan(150);
  await banner.evaluate((img) => (img as HTMLImageElement).decode());
  await page.screenshot({ path: `${evidence}/home-mobile-first-viewport.png` });
  await page
    .getByRole("button", { name: "Play now · Play vs bot", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/heroes$/);
  await page.locator('input[name="hero"][value="H_E_GRA"]').check();
  await expect(
    page.getByRole("heading", { name: "Gravemarch", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const label of await page.locator(".hero-tile strong").all())
    expect(
      await label.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
  await page.screenshot({
    path: `${evidence}/gravemarch-mobile.png`,
    fullPage: true,
  });
});

test("missing ensemble artwork preserves Home copy and actions", async ({
  page,
}) => {
  await page.route("**/assets/home-v2/**", (route) => route.abort());
  await page.goto("/");
  await expect(
    page.locator(".campaign-home-art .campaign-art-fallback"),
  ).toBeVisible();
  await expect(page.locator("main h1")).toHaveText("FIVE LANES.ONE OATH.");
  await expect(
    page
      .getByRole("button", { name: "Play now · Play vs bot", exact: true })
      .first(),
  ).toBeEnabled();
  await page.getByRole("link", { name: "Meet the roster" }).click();
  await expect(page).toHaveURL(/\/explore\/heroes$/);
});
