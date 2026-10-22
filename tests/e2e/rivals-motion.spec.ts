import { evidencePath } from "./evidence-path.js";
import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID, randomBytes } from "node:crypto";
import { testOrigin } from "./test-origin.js";
const evidence = evidencePath(
  "pen-motion",
  ".superpowers/sdd/2026-10-21-pen-design-implementation/browser/motion",
);
test("home and roster expose intermediate motion; reduction, rapid selection and native dismissal settle cleanly", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
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
  await page.addInitScript(() => {
    const samples: {
      selector: string;
      transform: string;
      opacity: string;
      hero: string | null;
      loaded: boolean;
    }[] = [];
    Object.assign(window, { motionSamples: samples });
    let frames = 0;
    function sample() {
      const state = window as unknown as { motionOverflow?: number };
      state.motionOverflow = Math.max(
        state.motionOverflow ?? 0,
        document.documentElement.scrollWidth - innerWidth,
      );
      for (const selector of [
        "[data-home-headline]",
        "[data-hero-art] .asset-image",
        "dialog[open]",
      ]) {
        const el = document.querySelector(selector);
        if (el) {
          const style = getComputedStyle(el);
          if (style.transform !== "none")
            samples.push({
              selector,
              transform: style.transform,
              opacity: style.opacity,
              hero:
                el
                  .closest("[data-hero-stage]")
                  ?.getAttribute("data-hero-stage") ?? null,
              loaded:
                el instanceof HTMLImageElement
                  ? el.naturalWidth > 0
                  : !!el.querySelector("img")?.naturalWidth,
            });
        }
      }
      if (++frames < 1200) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  let releaseArt!: () => void;
  const artGate = new Promise<void>((resolve) => {
    releaseArt = resolve;
  });
  await page.route("**/heroes-v4/heroes/morrow/bust.webp", async (route) => {
    await artGate;
    await route.continue();
  });
  await page.goto("/");
  await expect(page.locator("[data-home-headline]")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as { motionSamples: { selector: string }[] }
        ).motionSamples.some((s) => s.selector === "[data-home-headline]"),
      ),
    )
    .toBe(true);
  expect(
    await page.evaluate(
      () => (window as unknown as { motionOverflow: number }).motionOverflow,
    ),
  ).toBe(0);
  await page.screenshot({ path: `${evidence}/home.png` });
  await page.mouse.move(1100, 350);
  await expect
    .poll(() =>
      page
        .locator(".campaign-home-art img")
        .first()
        .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41),
    )
    .not.toBe(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("[data-home-headline]")).toHaveCSS(
    "transform",
    "none",
  );
  await expect(page.locator(".campaign-home-art img").first()).toHaveCSS(
    "transform",
    "none",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.getByRole("button", { name: "Play now · Play vs bot" }).click();
  await expect(page.locator("[data-hero-stage]")).toBeVisible();
  await page.locator('input[name="hero"]').evaluateAll((inputs) => {
    for (const i of [1, 2, 4, 5]) (inputs[i] as HTMLInputElement).click();
  });
  await expect(page.locator("[data-hero-name]")).toHaveText("Morrow");
  // Let the old immediate reveal expire before the first image arrives.
  await page.waitForTimeout(400);
  releaseArt();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as {
            motionSamples: {
              hero: string;
              loaded: boolean;
              transform: string;
            }[];
          }
        ).motionSamples.some(
          (s) =>
            s.hero === "H_E_XS" &&
            s.loaded &&
            Math.abs(new DOMMatrix(s.transform).m41) > 0,
        ),
      ),
    )
    .toBe(true);
  await page.screenshot({ path: `${evidence}/hero-intermediate.png` });
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as { motionSamples: { selector: string }[] }
        ).motionSamples.some(
          (s) => s.selector === "[data-hero-art] .asset-image",
        ),
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page
        .locator("[data-hero-art] .asset-image")
        .evaluate((el) => getComputedStyle(el).transform),
    )
    .toBe("none");
  await expect(page.locator("[data-hero-art] .asset-image")).toHaveCSS(
    "opacity",
    "1",
  );
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("checkbox", { name: "Reduce motion", exact: true })
    .check();
  await expect(page.locator("dialog")).toHaveCSS("transform", "none");
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Settings", exact: true }),
  ).toBeFocused();
  await page.locator('input[name="hero"]').first().check();
  await expect(page.locator("[data-hero-art] .asset-image")).toHaveCSS(
    "transform",
    "none",
  );
  await writeFile(
    `${evidence}/dom-motion-samples.json`,
    JSON.stringify(
      await page.evaluate(
        () => (window as unknown as { motionSamples: unknown }).motionSamples,
      ),
      null,
      2,
    ),
  );
  await page.goto("/");
  await expect(page.locator("[data-home-headline]")).toHaveCSS(
    "transform",
    "none",
  );
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Reduce motion", exact: true })
    .uncheck();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("dialog")).toHaveCSS("transform", "none");
  await page.keyboard.press("Escape");
  await page.screenshot({ path: `${evidence}/reduced-home.png` });
  expect(errors).toEqual([]);
});

test("home and roster motion fit compact and mobile surfaces", async ({
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
  await page.addInitScript(() => {
    const state = window as unknown as {
      maxOverflow: number;
      overflowNodes?: string[];
    };
    state.maxOverflow = 0;
    let frames = 0;
    function sample() {
      const overflow = document.documentElement.scrollWidth - innerWidth;
      if (overflow > state.maxOverflow) {
        state.maxOverflow = overflow;
        state.overflowNodes = Array.from(document.querySelectorAll("main *"))
          .filter((el) => el.getBoundingClientRect().right > innerWidth)
          .map(
            (el) =>
              `${el.tagName}.${el.className}: ${Math.round(el.getBoundingClientRect().right)}px`,
          );
      }
      if (++frames < 1000) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  for (const [label, width, height] of [
    ["compact", 1024, 640],
    ["mobile", 375, 812],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator("[data-home-headline]")).toBeVisible();
    await expect(page.locator("[data-home-headline]")).toHaveCSS(
      "transform",
      "none",
    );
    await expect
      .poll(() =>
        page
          .locator(".campaign-home-art img")
          .evaluateAll((images) =>
            images.every(
              (image) => (image as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    await page.screenshot({
      path: `${evidence}/home-${label}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Play now · Play vs bot" }).click();
    await expect
      .poll(() =>
        page
          .locator("[data-hero-art] img")
          .evaluate((image) => (image as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
    await expect(page.locator("[data-hero-art] .asset-image")).toHaveCSS(
      "transform",
      "none",
    );
    await page.screenshot({
      path: `${evidence}/hero-${label}.png`,
      fullPage: true,
    });
    const overflow = await page.evaluate(() => {
      const state = window as unknown as {
        maxOverflow: number;
        overflowNodes?: string[];
      };
      return { max: state.maxOverflow, nodes: state.overflowNodes };
    });
    expect(overflow.max, `${label}: ${JSON.stringify(overflow.nodes)}`).toBe(0);
  }
});
