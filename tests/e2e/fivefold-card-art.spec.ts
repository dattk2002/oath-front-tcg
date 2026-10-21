import { evidencePath } from "./evidence-path.js";
import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { testOrigin } from "./test-origin.js";
import { cardFixture } from "./recovery-fixtures.js";

const evidence = evidencePath(
  "cards",
  ".superpowers/sdd/2026-10-21-oathfront-rivals-redesign/task-3-evidence",
);

test("all sixty new card images load through the actual hero collections", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().includes("401 (Unauthorized)")
    )
      errors.push(message.text());
  });
  const guest = await page.request.post("/api/v1/guest", {
    headers: { Origin: testOrigin },
    data: {
      commandId: randomUUID(),
      recoverySecret: randomBytes(32).toString("base64url"),
    },
  });
  expect(guest.status()).toBe(201);
  const loaded = new Set<string>();
  for (const hero of [
    "H_G_BV",
    "H_G_BP",
    "H_G_VP",
    "H_E_FX",
    "H_E_FS",
    "H_E_XS",
  ]) {
    await page.goto(`/decks/new?hero=${hero}`);
    await expect(page.locator(".collection-card").first()).toBeVisible();
    await page.locator(".collection-card img").evaluateAll((images) =>
      images.forEach((image) => {
        (image as HTMLImageElement).loading = "eager";
      }),
    );
    await expect
      .poll(() =>
        page
          .locator(".collection-card img")
          .evaluateAll(
            (images) =>
              images.length > 0 &&
              images.every(
                (image) =>
                  (image as HTMLImageElement).complete &&
                  (image as HTMLImageElement).naturalWidth > 0,
              ),
          ),
      )
      .toBe(true);
    const artBounds = await page
      .locator(".collection-card .card-art")
      .first()
      .evaluate((slot) => ({
        slot: slot.getBoundingClientRect().toJSON(),
        image: slot.querySelector("img")!.getBoundingClientRect().toJSON(),
      }));
    expect(artBounds.image.top).toBeGreaterThanOrEqual(artBounds.slot.top);
    expect(artBounds.image.bottom).toBeLessThanOrEqual(artBounds.slot.bottom);
    for (const image of await page
      .locator(".collection-card img")
      .evaluateAll((images) =>
        images.map((image) => ({
          key: image.getAttribute("data-art-key"),
          src: image.getAttribute("src"),
        })),
      )) {
      expect(image.src).toMatch(/^\/assets\/fivefold-cards-v3\/cards\//);
      loaded.add(image.key!);
    }
  }
  expect(loaded.size).toBe(60);
  await mkdir(evidence, { recursive: true });
  for (const [label, width, height] of [
    ["desktop", 1440, 900],
    ["tablet", 1024, 640],
    ["mobile", 375, 812],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.screenshot({
      path: `${evidence}/collection-${label}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("a missing new card image keeps its name and retry does not open card details", async ({
  page,
}) => {
  const guest = await page.request.post("/api/v1/guest", {
    headers: { Origin: testOrigin },
    data: {
      commandId: randomUUID(),
      recoverySecret: randomBytes(32).toString("base64url"),
    },
  });
  expect(guest.status()).toBe(201);
  let fail = true;
  await page.route(
    "**/assets/fivefold-cards-v3/cards/gc01-thumb.webp",
    async (route) => {
      if (fail)
        await route.fulfill({ status: 404, body: "intentional art failure" });
      else await route.continue();
    },
  );
  await page.goto("/decks/new?hero=H_G_BV");
  const card = page.locator(".collection-card").filter({
    has: page.getByRole("button", { name: "Lanternkeeper", exact: true }),
  });
  await expect(card).toBeVisible();
  await expect(
    card.locator('[data-art-fallback="cards/gc01.webp"]'),
  ).toBeVisible();
  await expect(
    card.getByText("Lanternkeeper", { exact: true }).first(),
  ).toBeVisible();
  fail = false;
  await card.getByRole("button", { name: "Retry art Lanternkeeper" }).click();
  await expect(
    card.locator('img[data-art-key="cards/gc01.webp"]'),
  ).toBeVisible();
  await expect
    .poll(() =>
      card
        .locator("img")
        .evaluate((image: HTMLImageElement) => image.naturalWidth > 0),
    )
    .toBe(true);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("new trick hand art and unit board art load in a seeded battle", async ({
  page,
}) => {
  const match = await cardFixture(page, true);
  await page.goto(`/matches/${match.id}`);
  await expect(page.locator('[data-scene-status="ready"]')).toHaveCount(1);
  await expect
    .poll(() =>
      page
        .locator(".hand-art img")
        .evaluateAll((images) =>
          images.some(
            (image) =>
              image
                .getAttribute("src")
                ?.includes("/fivefold-cards-v3/cards/f06-thumb.webp") &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page
        .locator(".scene-art img")
        .evaluateAll((images) =>
          images.some(
            (image) =>
              image
                .getAttribute("src")
                ?.includes("/fivefold-cards-v3/cards/gc01-cutout.webp") &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  const art = await page
    .locator(".board-unit .scene-art")
    .first()
    .boundingBox();
  expect(art?.width).toBeGreaterThanOrEqual(84);
  expect(art?.height).toBeGreaterThanOrEqual(84);
  const unitName = await page
    .locator(".board-unit strong")
    .first()
    .boundingBox();
  expect(unitName?.height).toBeLessThanOrEqual(24);
  await mkdir(evidence, { recursive: true });
  await page.screenshot({
    path: `${evidence}/battle-card-art.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.screenshot({ path: `${evidence}/battle-card-art-compact.png` });
  const endPhase = await page
    .getByRole("button", { name: "End phase" })
    .boundingBox();
  expect(
    endPhase ? endPhase.y + endPhase.height : Infinity,
  ).toBeLessThanOrEqual(640);
});
