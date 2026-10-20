import { test, expect } from "@playwright/test";
test("new player can open tutorial and independent sound settings", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Học cách chơi", exact: true }),
  ).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Nhạc" })).toBeVisible();
  await expect(
    page.getByRole("slider", { name: "Hiệu ứng âm thanh" }),
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
async function next(page: Page, label = "Tiếp tục") {
  const button = page
    .getByRole("complementary", { name: "Hướng dẫn chơi" })
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
      .getByRole("button", { name: "Học cách chơi", exact: true })
      .click();
    await page.waitForURL(/\/matches\//);
    await step(page, "G01");
    await expect(page.locator(".hand-card").first()).toBeVisible();
    await expect(page.locator('[data-scene-status="ready"]')).toBeVisible();
    await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
    await expect(
      page.getByRole("slider", { name: "Nhạc", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Đóng cài đặt" }).click();
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
    await card(page, "Người Gác Đèn", 2, keyboard);
    await next(page);
    await step(page, "G02");
    await page.locator(".hand-card").filter({ hasText: "Kỵ Sĩ Lá" }).click();
    await expect(
      page.getByText("Cần 2 năng lượng, hiện có 0.", { exact: false }),
    ).toBeVisible();
    await next(page, "Đã hiểu");
    await step(page, "G03");
    await page
      .getByRole("button", { name: "Kết thúc hành động", exact: true })
      .click();
    await next(page, "Bài tiếp theo");
    await step(page, "G04");
    await page.locator(".hand-card").filter({ hasText: "Tia Đèn" }).click();
    await page
      .getByRole("button", { name: /Lộ 4, Lính Tro.*mục tiêu hợp lệ/ })
      .click();
    await next(page);
    await step(page, "G05");
    await page
      .getByRole("button", { name: "Kết thúc hành động", exact: true })
      .click();
    await next(page, "Bài tiếp theo");
    await step(page, "G06");
    await card(page, "Mầm Khiên", 3, keyboard);
    await next(page, "Bài tiếp theo");
    await step(page, "G07");
    await expect(
      page.getByRole("heading", { name: "Đã chặn đòn" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Đã chặn đòn" }),
    ).toBeVisible();
    if (branch === "USED") {
      await page.screenshot({
        path: `${evidence}/tutorial-block.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Dùng ngay · 0" }).click();
      const target = page.getByRole("button", {
        name: /Lộ 4, Kỵ Sĩ Lá.*mục tiêu hợp lệ/,
      });
      await target.focus();
      await page.keyboard.press("Enter");
    } else
      await page.getByRole("button", { name: "Để dành", exact: true }).click();
    await next(page);
    await step(page, "G08");
    await expect.poll(async () => (await snapshot(page)).view.turn).toBe(5);
    const s = await snapshot(page);
    expect(s.view.players.GOOD.hp).toBe(branch === "USED" ? 12 : 10);
    expect(s.view.players.EVIL.hp).toBe(18);
    await next(page, "Hoàn thành");
    await expect(
      page.getByRole("heading", { name: "Đã hoàn thành hướng dẫn" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Học phe Ác", exact: true }).click();
    await step(page, "E01");
    await card(page, "Lính Tro", 2, keyboard);
    await page
      .getByRole("button", { name: "Kết thúc triển khai", exact: true })
      .click();
    await next(page);
    await step(page, "E02");
    await expect
      .poll(async () => (await snapshot(page)).view.phase)
      .toBe("EVIL_TRICKS");
    await page.locator(".hand-card").filter({ hasText: "Mũi Than" }).click();
    await page
      .getByRole("button", { name: /Lộ 5, Người Gác Đèn.*mục tiêu hợp lệ/ })
      .click();
    await page
      .getByRole("button", { name: "Kết thúc trick", exact: true })
      .click();
    await expect(
      page.getByText("Kỵ Sĩ Lá còn 1 HP", { exact: false }),
    ).toBeVisible();
    await next(page, "Hoàn thành");
    await expect(
      page.getByRole("heading", { name: "Đã hoàn thành hướng dẫn" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Học lại", exact: true }).click();
    await step(page, "G01");
    await next(page, "Học lại tình huống");
    await next(page, "Xác nhận");
    await step(page, "G01");
    await next(page, "Bỏ qua hướng dẫn");
    await next(page, "Xác nhận");
    await expect(
      page.getByRole("heading", { name: "Đã bỏ qua hướng dẫn" }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

import { mkdir, writeFile } from "node:fs/promises";
const evidence =
  process.env.OATHFRONT_EVIDENCE_DIR ??
  ".superpowers/sdd/2026-10-20-oathfront-implementation/task-14-evidence";
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
    page.getByRole("button", { name: "Học cách chơi", exact: true }),
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
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await expect.poll(async () => (await audio()).states[0]).toBe("running");
  await expect.poll(async () => (await audio()).starts).toBeGreaterThan(0);
  const music = page.getByRole("slider", { name: "Nhạc", exact: true });
  await music.focus();
  await page.keyboard.press("Home");
  await expect(music).toHaveValue("0");
  await expect(
    page.getByRole("slider", { name: "Hiệu ứng âm thanh" }),
  ).toHaveValue("0.6");
  await page.getByRole("checkbox", { name: "Tắt toàn bộ âm thanh" }).check();
  expect((await audio()).gains.slice(0, 2)).toEqual([0, 0]);
  await page.getByRole("checkbox", { name: "Giảm chuyển động" }).check();
  await mkdir(evidence, { recursive: true });
  for (const [label, width, height] of [
    ["desktop", 1440, 900],
    ["tablet", 1024, 768],
    ["mobile", 375, 812],
  ] as const) {
    await page.setViewportSize({ width, height });
    await expect(
      page.getByRole("button", { name: "Đóng cài đặt" }),
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
  }
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Cài đặt", exact: true }),
  ).toBeFocused();
  await page.reload();
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await expect(music).toHaveValue("0");
  await expect(
    page.getByRole("slider", { name: "Hiệu ứng âm thanh" }),
  ).toHaveValue("0.6");
  await expect(
    page.getByRole("checkbox", { name: "Tắt toàn bộ âm thanh" }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Giảm chuyển động" }),
  ).toBeChecked();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("checkbox", { name: "Tắt toàn bộ âm thanh" }).uncheck();
  await page.getByRole("button", { name: "Đóng cài đặt" }).click();
  await page
    .getByRole("button", { name: "Học cách chơi", exact: true })
    .click();
  await page.waitForURL(/\/matches\//);
  await step(page, "G01");
  await expect(page.locator('[data-scene-status="ready"]')).toBeVisible();
  const beforePlay = (await audio()).starts;
  await card(page, "Người Gác Đèn", 2, false);
  await expect
    .poll(async () => (await audio()).starts)
    .toBeGreaterThan(beforePlay);
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  await expect
    .poll(async () => (await audio()).states.at(-1))
    .toBe("suspended");
  await page
    .getByRole("dialog", { name: "Tạm dừng" })
    .getByRole("button", { name: "Cài đặt", exact: true })
    .click();
  await expect(
    page.getByRole("slider", { name: "Nhạc", exact: true }),
  ).toHaveValue("0");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Cài đặt", exact: true }),
  ).toBeHidden();
  await expect(
    page.getByRole("dialog", { name: "Tạm dừng", exact: true }),
  ).toBeVisible();
  expect((await snapshot(page)).view.lifecycle).toBe("PAUSED");
  expect((await audio()).states.at(-1)).toBe("suspended");
  const pausedSettings = page
    .getByRole("dialog", { name: "Tạm dừng", exact: true })
    .getByRole("button", { name: "Cài đặt", exact: true });
  await expect(pausedSettings).toBeFocused();
  await pausedSettings.click();
  await page.getByRole("button", { name: "Đóng cài đặt" }).click();
  await expect(pausedSettings).toBeFocused();
  expect((await snapshot(page)).view.lifecycle).toBe("PAUSED");
  await page
    .getByRole("dialog", { name: "Tạm dừng" })
    .getByRole("button", { name: "Tiếp tục", exact: true })
    .click();
  await expect.poll(async () => (await audio()).states.at(-1)).toBe("running");
  await expect(
    page.getByRole("button", { name: "Tạm dừng", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
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
    .getByRole("button", { name: "Học cách chơi", exact: true })
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
    page.getByText("Xoay ngang hoặc dùng màn hình lớn để vào trận", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Nhạc", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đóng cài đặt" }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await card(page, "Người Gác Đèn", 2, true);
  await next(page);
  const cardCost = page
    .locator(".hand-card")
    .filter({ hasText: "Kỵ Sĩ Lá" })
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
    .getByRole("button", { name: "Học cách chơi", exact: true })
    .click();
  await expect(
    page.getByText(/Chưa xác định kết quả tạo hướng dẫn/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page.getByRole("button", { name: "Học phe Ác", exact: true }).click();
  await expect(
    page.getByText(/Có yêu cầu hướng dẫn phe Thiện chưa được xác nhận/),
  ).toBeVisible();
  expect(sent).toHaveLength(1);
  await page
    .getByRole("button", { name: "Thử lại mở hướng dẫn", exact: true })
    .click();
  await page.waitForURL(/\/matches\//);
  await step(page, "G01");
  expect(sent).toHaveLength(2);
  expect(sent[1]).toEqual(sent[0]);
});
