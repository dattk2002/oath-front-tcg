import { evidencePath } from "./evidence-path.js";
import { test, expect } from "@playwright/test";
test("new player can open tutorial and independent sound settings", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Learn to play", exact: true }),
  ).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Music" })).toBeVisible();
  await expect(
    page.getByRole("slider", { name: "Sound effects" }),
  ).toBeVisible();
});

import type { Page } from "@playwright/test";
import type { CommandResponse } from "../../packages/contracts/src/index.js";
async function snapshot(page: Page) {
  const id = new URL(page.url()).pathname.split("/")[2];
  const r = await page.request.get(`/api/v1/matches/${id}`);
  expect(r.ok()).toBe(true);
  return r.json() as Promise<CommandResponse>;
}
async function step(page: Page, id: string) {
  await expect(
    page.locator(`.tutorial-panel[data-step="${id}"]`),
  ).toBeVisible();
}
async function next(page: Page, label = "Continue") {
  const button = page
    .getByRole("complementary", { name: "Tutorial" })
    .getByRole("button", { name: label, exact: true });
  await expect(button).toBeEnabled();
  await button.click();
}
async function card(page: Page, name: string, lane: number, keyboard: boolean) {
  const source = page.locator(".hand-card").filter({ hasText: name });
  await expect(source).toBeVisible();
  await expect(source).toHaveAttribute("data-playable-unit", "true");
  if (keyboard) {
    await source.focus();
    await page.keyboard.press("Enter");
  } else await source.click();
  const target = page.locator(`[data-lane-id="${lane}"]`);
  await expect(target).toBeEnabled();
  if (keyboard) {
    await target.focus();
    await page.keyboard.press("Enter");
  } else await target.click();
}
for (const branch of ["USED", "KEPT"] as const)
  test(`TU12 visible GOOD ${branch}, reload, EVIL, skip/replay and settings persistence`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const keyboard = branch === "USED";
    await page.emulateMedia({
      reducedMotion: keyboard ? "reduce" : "no-preference",
    });
    await page.goto("/");
    await page
      .getByRole("button", { name: "Learn to play", exact: true })
      .click();
    await page.waitForURL(/\/matches\//);
    await step(page, "G01");
    await expect(page.locator(".hand-card").first()).toBeVisible();
    await expect(page.locator('[data-scene-status="ready"]')).toBeVisible();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(
      page.getByRole("slider", { name: "Music", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close settings" }).click();
    if (branch === "USED") {
      await mkdir(evidence, { recursive: true });
      for (const [label, width, height] of [
        ["desktop", 1440, 900],
        ["tablet", 1024, 768],
        ["mobile", 375, 812],
      ] as const) {
        await page.setViewportSize({ width, height });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: `${evidence}/tutorial-${label}.png`,
          fullPage: true,
        });
      }
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    await card(page, "Lanternkeeper", 2, keyboard);
    await next(page);
    await step(page, "G02");
    await page.locator(".hand-card").filter({ hasText: "Leaf Knight" }).click();
    await expect(
      page.getByText("Requires 2 energy; you have 0.", { exact: false }),
    ).toBeVisible();
    await next(page, "Got it");
    await step(page, "G03");
    await page.getByRole("button", { name: "End phase", exact: true }).click();
    await next(page, "Next lesson");
    await step(page, "G04");
    await page.locator(".hand-card").filter({ hasText: "Lantern Ray" }).click();
    await page
      .getByRole("button", { name: /Lane 4, Ash Soldier.*legal target/ })
      .click();
    await next(page);
    await step(page, "G05");
    await page.getByRole("button", { name: "End phase", exact: true }).click();
    await next(page, "Next lesson");
    await step(page, "G06");
    await card(page, "Shieldseed", 3, keyboard);
    await next(page, "Next lesson");
    await step(page, "G07");
    await expect(
      page.getByRole("heading", { name: "Attack blocked" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Attack blocked" }),
    ).toBeVisible();
    if (branch === "USED") {
      await page.screenshot({
        path: `${evidence}/tutorial-block.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Use now · 0" }).click();
      const target = page.getByRole("button", {
        name: /Lane 4, Leaf Knight.*legal target/,
      });
      await target.focus();
      await page.keyboard.press("Enter");
    } else
      await page
        .getByRole("button", { name: "Keep for later", exact: true })
        .click();
    await next(page);
    await step(page, "G08");
    await expect.poll(async () => (await snapshot(page)).view.turn).toBe(5);
    const s = await snapshot(page);
    expect(s.view.players.GOOD.hp).toBe(branch === "USED" ? 12 : 10);
    expect(s.view.players.EVIL.hp).toBe(18);
    await next(page, "Finish");
    await expect(
      page.getByRole("heading", { name: "Tutorial complete" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Learn Ashen Court", exact: true })
      .click();
    await step(page, "E01");
    await card(page, "Ash Soldier", 2, keyboard);
    await page
      .getByRole("button", { name: "End deployment", exact: true })
      .click();
    await next(page);
    await step(page, "E02");
    await expect
      .poll(async () => (await snapshot(page)).view.phase)
      .toBe("EVIL_TRICKS");
    await page.locator(".hand-card").filter({ hasText: "Coal Lance" }).click();
    await page
      .getByRole("button", { name: /Lane 5, Lanternkeeper.*legal target/ })
      .click();
    await page.getByRole("button", { name: "End tricks", exact: true }).click();
    await expect(
      page.getByText("Leaf Knight has 1 HP left", { exact: false }),
    ).toBeVisible();
    await next(page, "Finish");
    await expect(
      page.getByRole("heading", { name: "Tutorial complete" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Replay tutorial", exact: true })
      .click();
    await step(page, "G01");
    await next(page, "Restart scenario");
    await next(page, "Confirm");
    await step(page, "G01");
    await next(page, "Skip tutorial");
    await next(page, "Confirm");
    await expect(
      page.getByRole("heading", { name: "Tutorial skipped" }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

import { mkdir, writeFile } from "node:fs/promises";
const evidence =
  process.env.OATHFRONT_EVIDENCE_DIR ??
  evidencePath(
    "task14",
    ".superpowers/sdd/2026-10-20-oathfront-implementation/task-14-evidence",
  );
test("real Web Audio gesture, settings restore and desktop/tablet/mobile review", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const contexts: AudioContext[] = [];
    const gains: GainNode[] = [];
    let starts = 0;
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) {
        super(options);
        contexts.push(this);
      }
      override createGain() {
        const node = super.createGain();
        gains.push(node);
        return node;
      }
      override createBufferSource() {
        const node = super.createBufferSource();
        const start = node.start.bind(node);
        node.start = (when?: number) => {
          starts++;
          start(when);
        };
        return node;
      }
    };
    Object.defineProperty(window, "audioEvidence", {
      value: () => ({
        contexts: contexts.length,
        states: contexts.map((c) => c.state),
        gains: gains.map((g) => g.gain.value),
        starts,
      }),
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Learn to play", exact: true }),
  ).toBeVisible();
  const audio = () =>
    page.evaluate(() => {
      const inspect = Reflect.get(window, "audioEvidence") as () => {
        contexts: number;
        states: string[];
        gains: number[];
        starts: number;
      };
      return inspect();
    });
  expect((await audio()).contexts).toBe(0);
  expect((await audio()).starts).toBe(0);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect.poll(async () => (await audio()).states[0]).toBe("running");
  await expect.poll(async () => (await audio()).starts).toBeGreaterThan(0);
  const music = page.getByRole("slider", { name: "Music", exact: true });
  await music.focus();
  await page.keyboard.press("Home");
  await expect(music).toHaveValue("0");
  await expect(page.getByRole("slider", { name: "Sound effects" })).toHaveValue(
    "0.6",
  );
  await page.getByRole("checkbox", { name: "Mute all audio" }).check();
  expect((await audio()).gains.slice(0, 2)).toEqual([0, 0]);
  await page.getByRole("checkbox", { name: "Reduce motion" }).check();
  await mkdir(evidence, { recursive: true });
  for (const [label, width, height] of [
    ["desktop", 1440, 900],
    ["tablet", 1024, 768],
    ["mobile", 375, 812],
  ] as const) {
    await page.setViewportSize({ width, height });
    await expect(
      page.getByRole("button", { name: "Close settings" }),
    ).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `${evidence}/settings-${label}.png`,
      fullPage: true,
    });
    const lastTutorial = page.getByRole("button", {
      name: "Learn Ashen Court",
    });
    await lastTutorial.focus();
    await expect(lastTutorial).toBeFocused();
    await expect(lastTutorial).toBeInViewport({ ratio: 1 });
    const focusClearance = await lastTutorial.evaluate((button) => {
      const control = button.getBoundingClientRect();
      const body = button.closest(".settings-content")!.getBoundingClientRect();
      return Math.min(
        control.left - body.left,
        body.right - control.right,
        control.top - body.top,
        body.bottom - control.bottom,
      );
    });
    expect(focusClearance).toBeGreaterThanOrEqual(7);
    await page.screenshot({
      path: `${evidence}/settings-${label}-focused.png`,
    });
    await page.getByRole("checkbox", { name: "Mute all audio" }).focus();
  }
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Settings", exact: true }),
  ).toBeFocused();
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(music).toHaveValue("0");
  await expect(page.getByRole("slider", { name: "Sound effects" })).toHaveValue(
    "0.6",
  );
  await expect(
    page.getByRole("checkbox", { name: "Mute all audio" }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Reduce motion" }),
  ).toBeChecked();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("checkbox", { name: "Mute all audio" }).uncheck();
  await page.getByRole("button", { name: "Close settings" }).click();
  await page
    .getByRole("button", { name: "Learn to play", exact: true })
    .click();
  await page.waitForURL(/\/matches\//);
  await step(page, "G01");
  await expect(page.locator('[data-scene-status="ready"]')).toBeVisible();
  const beforePlay = (await audio()).starts;
  await card(page, "Lanternkeeper", 2, false);
  await expect
    .poll(async () => (await audio()).starts)
    .toBeGreaterThan(beforePlay);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect
    .poll(async () => (await audio()).states.at(-1))
    .toBe("suspended");
  await page
    .getByRole("dialog", { name: "Paused" })
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await expect(
    page.getByRole("slider", { name: "Music", exact: true }),
  ).toHaveValue("0");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Settings", exact: true }),
  ).toBeHidden();
  await expect(
    page.getByRole("dialog", { name: "Paused", exact: true }),
  ).toBeVisible();
  expect((await snapshot(page)).view.lifecycle).toBe("PAUSED");
  expect((await audio()).states.at(-1)).toBe("suspended");
  const pausedSettings = page
    .getByRole("dialog", { name: "Paused", exact: true })
    .getByRole("button", { name: "Settings", exact: true });
  await expect(pausedSettings).toBeFocused();
  await pausedSettings.click();
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(pausedSettings).toBeFocused();
  expect((await snapshot(page)).view.lifecycle).toBe("PAUSED");
  await page
    .getByRole("dialog", { name: "Paused" })
    .getByRole("button", { name: "Continue", exact: true })
    .click();
  await expect.poll(async () => (await audio()).states.at(-1)).toBe("running");
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect
    .poll(async () => (await audio()).states.at(-1))
    .toBe("suspended");
  await page.keyboard.press("Escape");
  await expect
    .poll(async () => (await snapshot(page)).view.lifecycle)
    .toBe("ACTIVE");
  await expect.poll(async () => (await audio()).states.at(-1)).toBe("running");
  await writeFile(
    `${evidence}/audio-browser.json`,
    JSON.stringify(
      {
        audio: await audio(),
        errors,
        settings: await page.evaluate(() =>
          localStorage.getItem("oathfront.settings.v1"),
        ),
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
});

test("settled tutorial layout exposes settings, energy focus and small-screen fallback", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Learn to play", exact: true })
    .click();
  await page.waitForURL(/\/matches\//);
  await step(page, "G01");
  await expect(page.locator(".hand-card").first()).toBeVisible();
  await expect(page.locator('[data-scene-status="ready"]')).toBeVisible();
  await mkdir(evidence, { recursive: true });
  for (const [label, width, height] of [
    ["desktop", 1440, 900],
    ["tablet", 1024, 768],
    ["mobile", 375, 812],
  ] as const) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `${evidence}/tutorial-${label}.png`,
      fullPage: true,
    });
  }
  await expect(
    page.getByText("Rotate your device or use a larger screen to play", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Music", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await card(page, "Lanternkeeper", 2, true);
  await next(page);
  const cardCost = page
    .locator(".hand-card")
    .filter({ hasText: "Leaf Knight" })
    .locator(".card-cost");
  await expect(cardCost).toContainText("2");
  expect(
    await cardCost.evaluate((el) => {
      const cost = el.getBoundingClientRect(),
        card = el.closest("button")!.getBoundingClientRect();
      return (
        cost.left >= card.left &&
        cost.right <= card.right &&
        cost.top >= card.top &&
        cost.bottom <= card.bottom
      );
    }),
  ).toBe(true);
  await expect(page.getByTestId("own-energy")).toHaveAttribute(
    "data-tutorial-focus",
    "true",
  );
  await page.screenshot({
    path: `${evidence}/tutorial-energy.png`,
    fullPage: true,
  });
});

test("uncertain tutorial create retains identity and explains a different pending faction before explicit retry", async ({
  page,
}) => {
  const sent: unknown[] = [];
  let lost = true;
  await page.route("**/api/v1/matches", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    sent.push(route.request().postDataJSON());
    if (lost) {
      lost = false;
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      await route.abort("failed");
    } else await route.continue();
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Learn to play", exact: true })
    .click();
  await expect(
    page.getByText(/Tutorial creation is unconfirmed/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Learn Ashen Court", exact: true })
    .click();
  await expect(
    page.getByText(/An unconfirmed tutorial request for Dawnward is pending/),
  ).toBeVisible();
  expect(sent).toHaveLength(1);
  await page
    .getByRole("button", { name: "Retry tutorial", exact: true })
    .click();
  await page.waitForURL(/\/matches\//);
  await step(page, "G01");
  expect(sent).toHaveLength(2);
  expect(sent[1]).toEqual(sent[0]);
});
