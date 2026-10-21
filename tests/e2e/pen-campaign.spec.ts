import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const evidence =
  ".superpowers/sdd/2026-10-21-pen-design-implementation/browser";

test("Pen Home and profiles preserve guest entry and selected hero deck intent", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "FIVE LANES. ONE OATH." }),
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Play now · Play vs bot", exact: true })
    .click();
  await expect(page).toHaveURL(/\/heroes$/);
  await expect(page.locator('input[name="hero"]')).toHaveCount(6);
  await page.goto("/explore/heroes/H_E_FS");
  await expect(
    page.getByRole("heading", { name: "Vesper", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Choose deck", exact: false }).click();
  await expect(page).toHaveURL(/\/heroes\/H_E_FS\/decks$/, { timeout: 15000 });
  await expect(
    page.getByRole("link", { name: "Create deck", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("Public pages remain browsable when the game API is unavailable", async ({
  page,
}) => {
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({ status: 503, json: { error: "Unavailable" } }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "FIVE LANES. ONE OATH." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry connection" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Heroes", exact: true })
    .click();
  await expect(page.locator(".campaign-hero-card")).toHaveCount(6);
  await page.getByRole("link", { name: "Briar — The Living Bastion" }).click();
  await expect(
    page.getByRole("heading", { name: "Briar", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Dawn Shield", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Choose deck" }).click();
  await expect(page).toHaveURL(/\/explore\/heroes\/H_G_BV$/);
  await expect(page.locator(".campaign-feedback")).toContainText(
    "Game data is unavailable",
  );
});

test("Pen Home and hero pages retain artwork and readable responsive layouts", async ({
  page,
}) => {
  test.setTimeout(120000);
  await mkdir(evidence, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [width, height] of [
    [1440, 900],
    [1024, 640],
    [375, 812],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    for (const [path, name] of [
      ["/", "home"],
      ["/explore/heroes", "heroes"],
      ["/explore/heroes/H_G_BV", "briar"],
    ]) {
      await page.goto(path!);
      await expect(page.locator("main h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect
        .poll(() =>
          page
            .locator("main img")
            .evaluateAll(
              (images) =>
                images.length > 0 &&
                images
                  .filter(
                    (image) => image.getBoundingClientRect().top < innerHeight,
                  )
                  .every(
                    (image) =>
                      (image as HTMLImageElement).complete &&
                      (image as HTMLImageElement).naturalWidth > 0,
                  ),
            ),
        )
        .toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `${evidence}/${name}-${width}.png`,
        fullPage: true,
      });
    }
  }
  expect(errors).toEqual([]);
});
