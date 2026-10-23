import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { create, command } from "./recovery-fixtures.js";

const evidence = ".superpowers/sdd/2026-10-23-realtime-recovery/integration";

test("real WebSocket updates an idle match without polling and recovers after offline changes", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { id, csrf } = await create(page, "GOOD", "elements_v1");
  const messages: { type: string; revision: number }[] = [];
  const errors: string[] = [];
  let snapshots = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (
      request.method() === "GET" &&
      new URL(request.url()).pathname === `/api/v1/matches/${id}`
    )
      snapshots++;
  });
  page.on("websocket", (socket) => {
    if (!socket.url().endsWith("/realtime/matches")) return;
    socket.on("framereceived", (frame) => {
      const message = JSON.parse(String(frame.payload));
      expect(Object.keys(message).sort()).toEqual([
        "matchId",
        "revision",
        "type",
      ]);
      expect(message.matchId).toBe(id);
      messages.push({ type: message.type, revision: message.revision });
    });
  });
  await page.goto(`/matches/${id}`);
  await expect
    .poll(() => messages.filter((message) => message.type === "ready").length)
    .toBe(1);
  await page.getByRole("button", { name: "Confirm mulligan" }).click();
  await expect(
    page.getByRole("button", { name: "End phase", exact: true }),
  ).toBeEnabled({ timeout: 20000 });
  await expect(page.locator(".battle-scene-layer")).toHaveAttribute(
    "data-scene-status",
    "ready",
  );
  // More than two former polling intervals, while the player is choosing a card.
  const idleStart = snapshots;
  await page.waitForTimeout(11000);
    const idleSnapshotRequests = snapshots - idleStart;
    expect(idleSnapshotRequests).toBe(0);
  const changedStart = messages.length;
  const paused = await command(page, id, csrf, { kind: "PAUSE" });
  await expect(
    page.getByRole("heading", { name: "Paused", exact: true }),
  ).toBeVisible();
  expect(messages.slice(changedStart)).toContainEqual({
    type: "changed",
    revision: paused.revision,
  });
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Paused", exact: true }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "End phase", exact: true }),
  ).toBeEnabled();

  const readyBeforeOffline = messages.filter(
    (message) => message.type === "ready",
  ).length;
  await context.setOffline(true);
  await command(page, id, csrf, { kind: "PAUSE" });
  await context.setOffline(false);
  await expect
    .poll(() => messages.filter((message) => message.type === "ready").length)
    .toBeGreaterThan(readyBeforeOffline);
  await expect(
    page.getByRole("heading", { name: "Paused", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Paused", exact: true }),
  ).not.toBeVisible();
  expect(errors).toEqual([]);
  await mkdir(evidence, { recursive: true });
  await page.screenshot({ path: `${evidence}/realtime-ready.png` });
  await writeFile(
    `${evidence}/realtime.json`,
    JSON.stringify(
      {
          idleSnapshotRequests,
        idleWindowMs: 11000,
        messages,
        errors,
      },
      null,
      2,
    ),
  );
});

test("full match displays graphics recovery clearly at phone tablet and desktop sizes", async ({
  page,
}) => {
  const { id } = await create(page, "GOOD", "elements_v1");
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      contextId,
      ...args
    ) {
      if (String(contextId).startsWith("webgl")) return null;
      return Reflect.apply(original, this, [contextId, ...args]);
    } as typeof original;
  });
  await page.goto(`/matches/${id}`);
  await page.getByRole("button", { name: "Confirm mulligan" }).click();
  await expect(
      page.getByRole("heading", { name: "3D graphics are unavailable" }),
  ).toBeVisible();
  await expect(page.locator(".lanes")).not.toBeVisible();
  await mkdir(evidence, { recursive: true });
  for (const [width, height] of [
    [375, 812],
    [768, 1024],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    const retry = page.getByRole("button", { name: "Retry 3D", exact: true });
    const useText = page.getByRole("button", {
      name: "Use text board",
      exact: true,
    });
    await expect(retry).toBeVisible();
    await expect(useText).toBeVisible();
    for (const control of [retry, useText]) {
      const box = await control.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width!);
      await control.click({ trial: true });
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `${evidence}/full-match-error-${width}.png`,
    });
  }
  await page
    .getByRole("button", { name: "Use text board", exact: true })
    .click();
  await expect(page.locator(".lanes")).toBeVisible();
});
