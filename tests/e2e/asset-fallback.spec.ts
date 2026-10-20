import { randomUUID, randomBytes } from "node:crypto";
import { test, expect } from "@playwright/test";
import { testOrigin } from "./test-origin.js";
import { cardFixture } from "./recovery-fixtures.js";
import { mkdir, writeFile } from "node:fs/promises";
const evidence =
  process.env.OATHFRONT_ASSET_EVIDENCE_DIR ??
  "docs/implementation/evidence/task15";
test("missing artwork keeps its Vietnamese name and supports explicit retry; slow art reserves its slot", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.request.post("/api/v1/guest", {
    headers: { Origin: testOrigin },
    data: {
      commandId: randomUUID(),
      recoverySecret: randomBytes(32).toString("base64url"),
    },
  });
  let fail = true;
  await page.route(
    "**/assets/core-v1/heroes/h_g_bv/hud.webp",
    async (route) => {
      if (fail)
        await route.fulfill({ status: 404, body: "intentional asset failure" });
      else await route.continue();
    },
  );
  await page.goto("/heroes");
  const tile = page.locator(".hero-tile").first();
  await expect(
    tile.getByText("An Nhiên", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    tile.getByRole("button", { name: "Thử lại hình An Nhiên" }),
  ).toBeVisible();
  // Retry a different hero so accidental label/radio activation is observable.
  await page.locator("input[name=hero]").last().check();
  const selected = await page
    .locator("input[name=hero]:checked")
    .getAttribute("value");
  const retry = tile.getByRole("button", { name: "Thử lại hình An Nhiên" });
  const failedBounds = [];
  await mkdir(evidence, { recursive: true });
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["narrow", 375, 812],
  ] as const) {
    await page.setViewportSize({ width, height });
    await tile.locator(".hero-portrait").scrollIntoViewIfNeeded();
    await expect(
      tile.locator(".art-fallback").getByText("An Nhiên", { exact: true }),
    ).toBeVisible();
    const bounds = await retry.evaluate((button) => {
      const portrait = button
        .closest(".hero-portrait")!
        .getBoundingClientRect();
      const rect = button.getBoundingClientRect();
      const visibleHeight = Math.max(
        0,
        Math.min(rect.bottom, portrait.bottom, innerHeight) -
          Math.max(rect.top, portrait.top, 0),
      );
      // Probe each edge midpoint; rounded button corners are intentionally outside its hit shape.
      const points = [
        [rect.width / 2, 1],
        [rect.width / 2, rect.height / 2],
        [rect.width / 2, rect.height - 1],
        [1, rect.height / 2],
        [rect.width - 1, rect.height / 2],
      ].map(([x, y]) => ({ x: rect.left + x!, y: rect.top + y! }));
      return {
        portrait: portrait.toJSON(),
        retry: rect.toJSON(),
        visibleHeight,
        hitTestable: points.every((p) => {
          const hit = document.elementFromPoint(p.x, p.y);
          return !!hit && button.contains(hit);
        }),
      };
    });
    failedBounds.push({ viewport: name, ...bounds });
    await page.screenshot({ path: `${evidence}/fix1-hero-failed-${name}.png` });
    await writeFile(
      `${evidence}/fix1-hero-fallback-bounds.json`,
      JSON.stringify(failedBounds, null, 2) + "\n",
    );
    expect(bounds.retry.top).toBeGreaterThanOrEqual(bounds.portrait.top);
    expect(bounds.retry.bottom).toBeLessThanOrEqual(bounds.portrait.bottom);
    expect(bounds.retry.left).toBeGreaterThanOrEqual(bounds.portrait.left);
    expect(bounds.retry.right).toBeLessThanOrEqual(bounds.portrait.right);
    expect(bounds.retry.height).toBeGreaterThanOrEqual(44);
    expect(bounds.retry.width).toBeGreaterThanOrEqual(44);
    expect(bounds.visibleHeight).toBeGreaterThanOrEqual(44);
    expect(bounds.hitTestable).toBe(true);
  }
  fail = false;
  await tile.getByRole("button", { name: "Thử lại hình An Nhiên" }).click();
  await expect(page.locator("input[name=hero]:checked")).toHaveValue(selected!);
  await expect(tile.locator("img[data-art-key]")).toBeVisible();
  await expect
    .poll(() =>
      tile
        .locator("img")
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    )
    .toBe(true);
  await page.screenshot({ path: `${evidence}/fix1-hero-recovered-narrow.png` });
  await page.setViewportSize({ width: 1440, height: 900 });
  await tile.locator(".hero-portrait").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `${evidence}/fix1-hero-recovered-desktop.png`,
  });
  await page.route(
    "**/assets/core-v1/heroes/h_g_bp/hud.webp",
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
      slot
        .locator("img")
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    )
    .toBe(true);
  const after = await slot.boundingBox();
  expect(after?.height).toBe(before?.height);
  await mkdir(evidence, { recursive: true });
  await page.locator("input[name=hero]").last().check();
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["tablet", 1024, 768],
    ["mobile", 375, 812],
  ] as const) {
    await page.setViewportSize({ width, height });
    await expect
      .poll(() =>
        page
          .locator(".hero-portrait img")
          .evaluateAll(
            (images) =>
              images.length === 6 &&
              images.every(
                (image) =>
                  (image as HTMLImageElement).complete &&
                  (image as HTMLImageElement).naturalWidth > 0,
              ),
          ),
      )
      .toBe(true);
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
    await page.screenshot({
      path: `${evidence}/heroes-${name}.png`,
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
    page.getByRole("button", { name: /Người Gác Đèn/ }),
  ).toBeVisible();
  fail = false;
  await page
    .getByRole("button", { name: "Thử lại hình ảnh", exact: true })
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
