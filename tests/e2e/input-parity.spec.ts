import { observeConsole, finishEvidence } from "./recovery-fixtures.js";
import { test, expect } from "@playwright/test";
test.beforeEach(({ page }) => observeConsole(page));
test.afterEach(async ({ page }, testInfo) => {
  await finishEvidence(page, testInfo.title);
});
import { blockFixture, cardFixture, snapshot } from "./recovery-fixtures.js";
test("keyboard block targeting and pointer KEEP are explicit; pause surrender confirmation", async ({
  page,
}) => {
  const { id } = await blockFixture(page);
  await page.goto(`/matches/${id}`);
  await expect(
    page.getByRole("button", { name: "Use now · 0", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Use now · 0", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-own-unit="true"]').first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Use now · 0", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Paused" })).toBeVisible();
  await expect(page.getByRole("dialog").locator("h2")).toBeFocused();
  for (const key of ["Tab", "Shift+Tab"])
    for (let tab = 0; tab < 8; tab++) {
      await page.keyboard.press(key);
      expect(
        await page.evaluate(() => !!document.activeElement?.closest("dialog")),
      ).toBe(true);
    }
  await page.getByRole("button", { name: "Surrender", exact: true }).click();
  await expect(
    page.getByText("Confirm surrender?", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Return to match", exact: true })
    .click();
  expect((await snapshot(page, id)).view.lifecycle).toBe("PAUSED");
  await page.getByRole("button", { name: "Continue", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Paused", exact: true }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Attack blocked" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Keep for later", exact: true })
    .click();
});
for (const input of ["pointer", "keyboard", "drag"] as const)
  test(`${input} plays the same exact public unit intent`, async ({ page }) => {
    const { id, instanceId } = await cardFixture(page);
    const actions: unknown[] = [];
    page.on("request", (request) => {
      if (request.url().endsWith("/commands"))
        actions.push(request.postDataJSON().action);
    });
    await page.goto(`/matches/${id}`);
    const source = page.locator(`[data-card-id="${instanceId}"]`);
    await expect(source).toHaveAttribute("data-playable-unit", "true");
    if (input === "keyboard") {
      await source.focus();
      await page.keyboard.press("Enter");
      const lane = page.getByRole("button", {
        name: "Choose lane 1, legal target",
        exact: true,
      });
      await lane.focus();
      await page.keyboard.press("ArrowRight");
      await expect(
        page.getByRole("button", {
          name: "Choose lane 2, legal target",
          exact: true,
        }),
      ).toBeFocused();
      await page.keyboard.press("Enter");
    } else if (input === "pointer") {
      await source.click();
      await page
        .getByRole("button", {
          name: "Choose lane 2, legal target",
          exact: true,
        })
        .click();
    } else {
      const box = await source.boundingBox();
      expect(box).not.toBeNull();
      await page.mouse.move(box!.x + 20, box!.y + 20);
      await page.mouse.down();
      await page.mouse.move(box!.x + 25, box!.y + 20);
      await page.mouse.up();
      expect(actions).toEqual([]);
      await page.keyboard.press("Escape");
      await page.mouse.move(box!.x + 20, box!.y + 20);
      await page.mouse.down();
      await page.mouse.move(box!.x + 40, box!.y - 20, { steps: 5 });
      const target = await page
        .getByRole("button", {
          name: "Choose lane 2, legal target",
          exact: true,
        })
        .boundingBox();
      await page.mouse.move(
        target!.x + target!.width / 2,
        target!.y + target!.height / 2,
        { steps: 10 },
      );
      await page.mouse.up();
    }
    await expect(page.locator('[data-own-unit="true"]')).toHaveCount(1);
    expect(actions).toEqual([
      { kind: "PLAY_UNIT", cardInstanceId: instanceId, laneId: 2 },
    ]);
    const current = await snapshot(page, id);
    expect(current.view.players.EVIL.energy.current).toBe(9);
    expect(current.view.board[1].evil?.definitionId).toBe("EC01");
  });
test("playable trick label and unit-to-hero focus forecast follow the resolved legal action", async ({
  page,
}) => {
  const { id, instanceId } = await cardFixture(page, true);
  await page.goto(`/matches/${id}`);
  const source = page.locator(`[data-card-id="${instanceId}"]`);
  await expect(source).toHaveAccessibleName("Playable. 2 energy Coalshot");
  await expect(source).toHaveAttribute("data-playable-unit", "false");
  await source.click();
  await page.locator('[data-own-unit="false"]').first().focus();
  const forecast = page.getByRole("region", { name: "Public forecast" });
  await expect(forecast).toContainText("Enemy hero damage: 0");
  await page.locator('[data-hero-side="GOOD"] button').focus();
  await expect(forecast).toContainText("Enemy hero damage: 3");
  await page.keyboard.press("Enter");
  await expect
    .poll(async () => (await snapshot(page, id)).view.players.GOOD.hp)
    .toBe(17);
});
