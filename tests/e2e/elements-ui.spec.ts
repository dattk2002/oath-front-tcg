import { test, expect } from "@playwright/test";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { testOrigin } from "./test-origin.js";
import { evidencePath } from "./evidence-path.js";
import { create } from "./recovery-fixtures.js";
import AxeBuilder from "@axe-core/playwright";
const evidence = evidencePath(
  "elements-ui",
  ".superpowers/sdd/2026-10-22-events-affinities/browser/elements-ui",
);

test("save a legal elements deck and enter a real match with rarity and system labels", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const guest = await page.request.post("/api/v1/guest", {
    headers: { Origin: testOrigin },
    data: {
      commandId: randomUUID(),
      recoverySecret: randomBytes(32).toString("base64url"),
    },
  });
  expect(guest.status()).toBe(201);
  await page.goto("/decks/new?hero=H_G_BV&preset=D_G_BV");
  await expect(
    page.getByRole("button", { name: "Save and continue", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Save and continue", exact: true })
    .click();
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page).toHaveURL(/\/matches\/[a-f0-9-]+$/);
  await expect(page.locator(".hand-card")).toHaveCount(4);
  await expect(page.locator(".hand-card .card-rarity-gem")).toHaveCount(4);
  await expect(page.locator(".hand-card .system-badge")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Confirm mulligan", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "End phase", exact: true }),
  ).toBeEnabled();
  const id = page.url().split("/").at(-1)!;
  const state = await (await page.request.get(`/api/v1/matches/${id}`)).json();
  expect(state.view.versions.content).toBe("elements_v1");
  for (const size of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(size);
    const card = page.locator(".hand-card").first();
    const bounds = await card.boundingBox();
    for (const badge of await card
      .locator(".card-rarity-gem, .system-badge")
      .all()) {
      const box = await badge.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(bounds!.x);
      expect(box!.x + box!.width).toBeLessThanOrEqual(
        bounds!.x + bounds!.width,
      );
      // The gem hangs slightly over the bottom frame in its reserved socket.
      const socketOverhang = await badge.evaluate((el) =>
        el.classList.contains("card-rarity-gem") ? 4 : 0,
      );
      expect(box!.y + box!.height).toBeLessThanOrEqual(
        bounds!.y + bounds!.height + socketOverhang,
      );
      expect(
        await badge.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await mkdir(evidence, { recursive: true });
  await page.screenshot({
    path: `${evidence}/elements-battle.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("new systems, rarity and owned copy controls remain legible at three sizes", async ({
  page,
}) => {
  test.skip(
    process.env.OATHFRONT_E2E_LIVE_CONTENT !== "1",
    "Requires the isolated revealed weekly schedule.",
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const guest = await page.request.post("/api/v1/guest", {
    headers: { Origin: testOrigin },
    data: {
      commandId: randomUUID(),
      recoverySecret: randomBytes(32).toString("base64url"),
    },
  });
  expect(guest.status()).toBe(201);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/heroes");
  const detail = page.getByRole("complementary", { name: "Hero details" });
  await expect(detail.locator(".system-badge")).toHaveText(["Grove", "Terra"]);
  await expect(
    detail.getByRole("button", { name: /Verdant Pulse/ }),
  ).toBeVisible();
  const heroArt = detail.locator("[data-hero-art] img");
  await expect
    .poll(() =>
      heroArt.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await expect(heroArt).toBeVisible();
  await expect(detail.locator("[data-hero-art]")).toHaveCSS("opacity", "1");
  expect(
    (
      await new AxeBuilder({ page })
        .include(".system-badge")
        .withRules(["color-contrast"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await mkdir(evidence, { recursive: true });
  for (const width of [1440, 1024, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({
      path: `${evidence}/heroes-${width}.png`,
      fullPage: true,
    });
  }
  await page.goto("/decks/new?hero=H_G_BV");
  await expect(
    page.getByRole("heading", { name: "Build your deck" }),
  ).toBeVisible();
  const collection = page.getByRole("region", { name: "Collection" });
  await collection
    .getByRole("combobox", { name: "Rarity", exact: true })
    .selectOption("E");
  const sentinel = collection.locator(".collection-card").filter({
    has: page.getByRole("button", {
      name: "Oathglass Sentinel",
      exact: true,
    }),
  });
  await expect(sentinel).toContainText("Owned 0/2");
  await expect(
    sentinel.getByRole("button", {
      name: "Add Oathglass Sentinel",
      exact: true,
    }),
  ).toBeDisabled();
  // UI-only ownership fixtures; backend ownership/settlement has separate real-DB integration tests.
  let copies = 1;
  await page.route("**/api/v1/collection", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.items.find(
      (item: { cardId: string }) => item.cardId === "E01",
    ).quantity = copies;
    await route.fulfill({ response, json: body });
  });
  await page.reload();
  await collection
    .getByRole("combobox", { name: "Rarity", exact: true })
    .selectOption("E");
  await expect(sentinel).toContainText("Owned 1/2");
  await sentinel
    .getByRole("button", { name: "Add Oathglass Sentinel", exact: true })
    .click();
  await expect(
    sentinel.getByRole("button", {
      name: "Add Oathglass Sentinel",
      exact: true,
    }),
  ).toBeDisabled();
  copies = 2;
  await page.reload();
  await collection
    .getByRole("combobox", { name: "Rarity", exact: true })
    .selectOption("E");
  await expect(sentinel).toContainText("Owned 2/2");
  await sentinel
    .getByRole("button", { name: "Add Oathglass Sentinel", exact: true })
    .click();
  await expect(
    sentinel.getByRole("button", {
      name: "Add Oathglass Sentinel",
      exact: true,
    }),
  ).toBeDisabled();
  await sentinel
    .getByRole("button", { name: "Oathglass Sentinel", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toContainText("E · Event");
  await page
    .getByRole("button", { name: "Close card details", exact: true })
    .click();
  for (const width of [375, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({
      path: `${evidence}/collection-${width}.png`,
      fullPage: true,
    });
  }
  await page.route("**/assets/card-scenes-v1/cards/e01-thumb.webp", (route) =>
    route.abort(),
  );
  await page.reload();
  await collection
    .getByRole("combobox", { name: "Rarity", exact: true })
    .selectOption("E");
  await expect(sentinel.locator(".art-fallback")).toBeVisible();
  await page.unroute("**/assets/card-scenes-v1/cards/e01-thumb.webp");
  await sentinel
    .getByRole("button", { name: "Retry art Oathglass Sentinel", exact: true })
    .click();
  await expect(sentinel.locator(".card-art img")).toBeVisible();
  expect(errors).toEqual([]);
});

test("an active legacy match requests its own catalog and never receives rarity metadata", async ({
  page,
}) => {
  const old = await create(page);
  const versions: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/v1/catalog/"))
      versions.push(r.url().split("/").at(-1)!);
  });
  await page.goto(`/matches/${old.id}`);
  await expect(page.locator(".hand-card").first()).toBeVisible();
  expect(versions).toContain("core_v1");
  await expect(page.locator(".hand-card .card-rarity-gem")).toHaveCount(0);
  await page.screenshot({
    path: `${evidence}/legacy-battle.png`,
    fullPage: true,
  });
});
