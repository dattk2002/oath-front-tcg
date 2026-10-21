import { evidencePath } from "./evidence-path.js";
import { test, expect } from "@playwright/test";
import {
  checkpoint,
  prepare,
  enter,
  collectBrowserErrors,
  createQualityGuest,
} from "./quality-fixtures.js";
const evidence =
  process.env.OATHFRONT_QUALITY_EVIDENCE_DIR ??
  evidencePath("task16", "docs/implementation/evidence/task16");
test.beforeAll(() => mkdir(evidence, { recursive: true }).then(() => {}));
test("keyboard settings focus and full hand labels", async ({ page }) => {
  const dto = checkpoint();
  Object.assign(dto.view.board[0]!.evil!.statuses, {
    shield: true,
    armor: 1,
    poisoned: true,
    stunned: true,
  });
  const errors = await prepare(page, dto);
  await enter(page, dto.view.matchId);
  await expect(page.locator(".board-unit").first()).toHaveAccessibleName(
    "Lane 1, Ash Soldier 2 ATK / 6 HP Ashen Court · details · Shield · Armor 1 · Poison · Stun",
  );
  await page.getByRole("button", { name: "Settings", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Settings", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator(".board-unit").first()).toBeFocused();
  for (const card of await page.locator(".hand-card").all()) {
    await expect(card).toHaveAccessibleName(/energy/);
    const b = await card.boundingBox();
    expect(b!.width).toBeGreaterThanOrEqual(44);
    expect(b!.height).toBeGreaterThanOrEqual(44);
  }
  expect(errors).toEqual([]);
});

import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
test("WCAG AA scan, English copy, settings and 200 percent reflow", async ({
  page,
}) => {
  const dto = checkpoint();
  const errors = await prepare(page, dto);
  await enter(page, dto.view.matchId);
  await page.evaluate(() => document.fonts.ready);
  for (const state of ["battle", "settings", "zoom"]) {
    if (state === "settings")
      await page.getByRole("button", { name: "Settings", exact: true }).click();
    if (state === "zoom") {
      await page.keyboard.press("Escape");
      await page.setViewportSize({ width: 720, height: 450 });
      await page.getByText("Read the current board", { exact: true }).click();
      await expect(page.locator(".small-fallback ol li")).toHaveCount(5);
      await page.screenshot({ path: `${evidence}/zoom-200-reflow.png` });
    }
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    await writeFile(
      `${evidence}/axe-${state}.json`,
      JSON.stringify(result, null, 2),
    );
    expect(result.violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

import { create } from "./recovery-fixtures.js";
test("dirty Back Stay Leave preserves draft without Navigation API", async ({
  page,
  browserName,
  browser,
}) => {
  test.skip(
    browserName !== "firefox" || process.env.OATHFRONT_NO_NAVIGATION !== "1",
    "Real Firefox configured without Navigation API",
  );
  await create(page);
  await page.goto("/heroes/H_G_BV/decks");
  expect(await page.evaluate(() => "navigation" in window)).toBe(false);
  await page.getByRole("link", { name: "Create deck", exact: true }).click();
  await page
    .getByLabel("Deck name", { exact: true })
    .fill("Bản nháp không mất");
  await page.evaluate(() => history.back());
  await expect(page.getByRole("dialog")).toContainText(
    "Your deck has unsaved changes",
  );
  await page.getByRole("button", { name: "Stay", exact: true }).click();
  await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue(
    "Bản nháp không mất",
  );
  await page.reload();
  await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue(
    "Bản nháp không mất",
  );
  await page.evaluate(() => history.back());
  await expect(page.getByRole("dialog")).toContainText(
    "Your deck has unsaved changes",
  );
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(page).toHaveURL(/heroes\/H_G_BV\/decks/);
  await page.getByRole("link", { name: "Create deck", exact: true }).click();
  await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue(
    "New deck",
  );
  await writeFile(
    `${evidence}/firefox.json`,
    JSON.stringify(
      {
        version: browser.version(),
        navigationApi: await page.evaluate(() => "navigation" in window),
        preference: "dom.navigation.webidl.enabled=false",
        result:
          "Back/Stay/reload/Back/Leave; Stay preserves draft, explicit Leave clears draft",
      },
      null,
      2,
    ),
  );
});
test("normal text token contrast exceeds 4.5 even on the lightest game surface", async ({
  page,
}) => {
  await createQualityGuest(page);
  const errors = collectBrowserErrors(page);
  await page.goto("/");
  const tokens = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return Object.fromEntries(
      [
        "bg",
        "surface",
        "raised",
        "text",
        "muted",
        "good",
        "evil",
        "primary",
        "error",
      ].map((key) => [key, s.getPropertyValue(`--${key}`).trim()]),
    );
  });
  const lum = (hex: string) => {
    const channels = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return (
      channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
    );
  };
  const results = [];
  for (const fg of ["text", "muted", "good", "evil", "primary", "error"])
    for (const bg of ["bg", "surface", "raised"]) {
      const a = lum(tokens[fg]!),
        b = lum(tokens[bg]!);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      results.push({ fg, bg, ratio });
      expect(ratio, `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  await writeFile(
    `${evidence}/contrast.json`,
    JSON.stringify(
      {
        tokens,
        results,
        note: "Opaque HUD surfaces. Scanner gradient-incomplete cases require visual review; this is not a screenshot pixel contrast scanner.",
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
});
test("quality and legacy reduced-motion preferences persist without changing battle data", async ({
  page,
}) => {
  const dto = checkpoint();
  const errors = await prepare(page, dto);
  await page.addInitScript(() =>
    localStorage.setItem(
      "oathfront.settings.v1",
      JSON.stringify({
        version: 1,
        musicVolume: 0.15,
        sfxVolume: 0.8,
        muted: true,
        reducedMotion: true,
      }),
    ),
  );
  await enter(page, dto.view.matchId);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Reduce motion", { exact: true })).toBeChecked();
  await expect(
    page.getByRole("slider", { name: "Music", exact: true }),
  ).toHaveValue("0.15");
  await page.getByLabel("Visual quality", { exact: true }).selectOption("low");
  await expect(
    page.getByRole("button", { name: "Close settings", exact: true }),
  ).toBeVisible({ timeout: 5000 });
  await page
    .getByRole("button", { name: "Close settings", exact: true })
    .click({ timeout: 5000 });
  await expect(page.locator('[data-scene-status="ready"]')).toBeVisible();
  expect(
    await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .some((e) => e.name.includes("cutouts-low.webp")),
    ),
  ).toBe(true);
  await expect(page.getByTestId("own-energy")).toContainText("1 / 1");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("oathfront.settings.v1")!),
    ),
  ).toMatchObject({
    quality: "low",
    motion: "reduced",
    musicVolume: 0.15,
    sfxVolume: 0.8,
    muted: true,
    reducedMotion: true,
  });
  expect(errors).toEqual([]);
});

test("browser error collector retains unexpected console and page errors", async ({
  page,
}) => {
  const errors = collectBrowserErrors(
    page,
    /\/assets\/core-v1\/atlases\/[^/]+\.webp$/,
  );
  await page.setContent("<main>Collector regression</main>");
  await page.evaluate(() => {
    console.error("unexpected console sentinel");
    setTimeout(() => {
      throw Error("unexpected page sentinel");
    }, 0);
  });
  await expect
    .poll(() => errors)
    .toEqual(["unexpected console sentinel", "unexpected page sentinel"]);
});
