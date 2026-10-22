import { test, expect } from "@playwright/test";
import { checkpoint, prepare, enter } from "./quality-fixtures.js";

test.skip(
  ({ browserName }) => browserName !== "chromium",
  "Native CDP touch gesture requires Chromium",
);
test.use({ hasTouch: true, viewport: { width: 1024, height: 768 } });

test("a native touch swipe scrolls the full hand without selecting or playing a card", async ({
  page,
  context,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const dto = checkpoint();
  const errors = await prepare(page, dto);
  let commands = 0;
  await page.route(
    `**/api/v1/matches/${dto.view.matchId}/commands`,
    async (route) => {
      commands++;
      await route.fulfill({ json: dto });
    },
  );
  await enter(page, dto.view.matchId);
  const hand = page.locator(".hand");
  const cards = hand.locator(".hand-card");
  await expect(cards).toHaveCount(10);
  await expect(hand).toBeInViewport({ ratio: 1 });
  const initial = await hand.evaluate((node) => ({
    left: node.scrollLeft,
    width: node.clientWidth,
    contentWidth: node.scrollWidth,
  }));
  expect(initial.contentWidth).toBeGreaterThan(initial.width);
  expect(commands).toBe(0);
  const bounds = await hand.boundingBox();
  expect(bounds).not.toBeNull();
  const native = await context.newCDPSession(page);
  try {
    // This reaches Chromium's native touch input pipeline, including touch-action
    // and pointer cancellation, rather than setting scrollLeft or dispatching JS events.
    const x = bounds!.x + bounds!.width * 0.8;
    const y = bounds!.y + bounds!.height / 2;
    const distance = Math.min(420, bounds!.width * 0.6);
    await native.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let step = 1; step <= 12; step++) {
      await native.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x - (distance * step) / 12, y }],
      });
    }
    await native.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await native.detach();
  }
  await expect
    .poll(() => hand.evaluate((node) => node.scrollLeft))
    .toBeGreaterThan(initial.left + 40);
  await expect(page.locator('.hand-card[aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator(".inspect .card-visual")).toHaveCount(0);
  expect(commands).toBe(0);

  const visibleIndex = await cards.evaluateAll((nodes) => {
    const clip = nodes[0]!.closest(".hand")!.getBoundingClientRect();
    return nodes.findIndex((node) => {
      const rect = node.getBoundingClientRect();
      return rect.left >= clip.left && rect.right <= clip.right;
    });
  });
  expect(visibleIndex).toBeGreaterThanOrEqual(0);
  const card = cards.nth(visibleIndex);
  const name = (await card.locator(".card-face-title").innerText()).trim();
  await card.tap();
  await expect(card).toHaveAttribute("aria-pressed", "true");
  const inspect = page.getByRole("complementary", {
    name: "Selection details",
  });
  await expect(
    inspect.getByRole("heading", { name, exact: true }),
  ).toBeVisible();
  await expect(inspect.locator(".card-face-rules")).not.toBeEmpty();
  expect(commands).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
