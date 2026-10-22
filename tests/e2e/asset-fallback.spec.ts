import { evidencePath } from "./evidence-path.js";
import { randomUUID, randomBytes } from "node:crypto";
import { test, expect } from "@playwright/test";
import { testOrigin } from "./test-origin.js";
import { cardFixture } from "./recovery-fixtures.js";
import { mkdir, writeFile } from "node:fs/promises";
const evidence =
  process.env.OATHFRONT_ASSET_EVIDENCE_DIR ??
  evidencePath("task15", "docs/implementation/evidence/task15");
test("missing lobby art retains names and profile retry; slow portraits reserve their slot", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.request.post("/api/v1/guest", {
    headers: { Origin: testOrigin },
    data: {
      commandId: randomUUID(),
      recoverySecret: randomBytes(32).toString("base64url"),
    },
  });
  let fail = true;
  await page.route("**/assets/heroes-v5/heroes/briar/*", (route) =>
    fail
      ? route.fulfill({ status: 404, body: "intentional asset failure" })
      : route.continue(),
  );
  await page.goto("/heroes");
  const tile = page.locator(".hero-tile").first();
  await expect(tile.locator(".art-fallback")).toBeVisible();
  await expect(tile.getByText("Briar", { exact: true }).last()).toBeVisible();
  await expect(tile.getByRole("button")).toHaveCount(0);
  const retry = page
    .locator(".hero-bust")
    .getByRole("button", { name: "Retry art Briar" });
  await expect(retry).toBeVisible();
  for (const size of [
    { width: 1440, height: 900 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(size);
    const box = await retry.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await retry.click({ trial: true });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  fail = false;
  await retry.click();
  await expect
    .poll(() =>
      page
        .locator(".hero-bust img")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(page.locator("input[name=hero]:checked")).toHaveValue("H_G_BV");
  await page.route(
    "**/assets/heroes-v4/heroes/aster/thumb.webp",
    async (route) => {
      await new Promise((r) => setTimeout(r, 900));
      await route.continue();
    },
  );
  await page.reload();
  const slot = page.locator(".hero-tile").nth(1).locator(".hero-portrait");
  const before = await slot.boundingBox();
  await expect
    .poll(() =>
      slot.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  const after = await slot.boundingBox();
  expect(after?.height).toBe(before?.height);
  for (const size of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(size);
    await expect(page.locator(".hero-tile")).toHaveCount(
      size.width > 860 ? 6 : 4,
    );
    const boxes = await page
      .locator(".hero-portrait img")
      .evaluateAll((images) =>
        images.map((image) => ({
          image: image.getBoundingClientRect().height,
          slot: image.parentElement!.getBoundingClientRect().height,
          fit: getComputedStyle(image).objectFit,
        })),
      );
    for (const box of boxes) {
      expect(box.image).toBeLessThanOrEqual(box.slot);
      expect(box.fit).toBe("contain");
    }
  }
});
test("battle atlas failure retries the complete public terrain pool and integrated art survives responsive layouts", async ({
  page,
}) => {
  const errors: string[] = [],
    consoleErrors: string[] = [],
    terrain = new Set<string>();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("request", (r) => {
    if (/\/locations\/[^/]+-strip\.webp$/.test(r.url()))
      terrain.add(new URL(r.url()).pathname);
  });
  let fail = true;
  await page.route("**/atlases/cutouts-high.webp", async (route) => {
    if (fail)
      await route.fulfill({ status: 404, body: "intentional atlas failure" });
    else {
      await new Promise((r) => setTimeout(r, 800));
      await route.continue();
    }
  });
  const match = await cardFixture(page, true);
  await page.goto(`/matches/${match.id}`);
  await expect(page.locator("[data-scene-status=fallback]")).toHaveCount(1);
  await expect.poll(() => terrain.size).toBe(8);
  await expect(
    page.getByRole("button", { name: /Lanternkeeper/ }),
  ).toBeVisible();
  fail = false;
  await page
    .getByRole("button", { name: "Retry artwork", exact: true })
    .click();
  await expect(page.locator("[data-scene-status=loading]")).toHaveCount(1);
  await expect(page.locator("[data-scene-status=ready]")).toHaveCount(1);
  await expect
    .poll(() =>
      page
        .locator(".scene-art img")
        .evaluateAll((images) =>
          images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
        ),
    )
    .toBe(true);
  await expect(page.locator(".hero-hud-art img")).toHaveCount(2);
  await page.locator(".hand-card").first().click();
  await expect(page.locator(".inspect-art img")).toBeVisible();
  await mkdir(evidence, { recursive: true });
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["tablet", 1024, 768],
    ["mobile", 375, 812],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.screenshot({
      path: `${evidence}/assets-${name}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator("[data-scene-status=ready]")).toHaveCount(1);
  await page.screenshot({
    path: `${evidence}/assets-reduced.png`,
    fullPage: true,
  });
  const unexpected = consoleErrors.filter(
    (message) => !message.includes("404 (Not Found)"),
  );
  await writeFile(
    `${evidence}/asset-browser.json`,
    JSON.stringify(
      {
        terrainRequests: [...terrain].sort(),
        pageErrors: errors,
        consoleErrors,
        unexpected,
        renderer: await page
          .locator(".battle-canvas")
          .evaluate((canvas: HTMLCanvasElement) => ({
            width: canvas.width,
            height: canvas.height,
          })),
      },
      null,
      2,
    ) + "\n",
  );
  expect(errors).toEqual([]);
  expect(unexpected).toEqual([]);
});
