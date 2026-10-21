import { testOrigin } from "./test-origin.js";
import {
  observeConsole,
  finishEvidence,
  expectNetworkFailure,
} from "./recovery-fixtures.js";
import { test, expect } from "@playwright/test";
test.beforeEach(({ page }) => observeConsole(page));
test.afterEach(async ({ page }, testInfo) => {
  await finishEvidence(page, testInfo.title);
});
import {
  blockFixture,
  snapshot,
  command,
  captureEvidence,
  denseLogFixture,
} from "./recovery-fixtures.js";
import { ownerPool } from "../../packages/db/tests/helpers.js";
for (const choice of ["KEEP", "USE"] as const)
  test(`block reload and reconnect preserves one grant and lane; ${choice} before Volcano`, async ({
    page,
    context,
  }) => {
    const { id } = await blockFixture(page);
    const original = await snapshot(page, id);
    await page.goto(`/matches/${id}`);
    await expect(
      page.getByRole("heading", { name: "Attack blocked" }),
    ).toBeVisible();
    await expect(
      page.getByText("Free right now", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Keep for later", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Use now · 0", exact: true })
      .click();
    await page.keyboard.press("Escape");
    expect((await snapshot(page, id)).revision).toBe(original.revision);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Attack blocked" }),
    ).toBeVisible();
    const stopOffline = expectNetworkFailure(page, {
      url: new RegExp(`^${testOrigin}/`),
      errorText: "net::ERR_INTERNET_DISCONNECTED",
    });
    await context.setOffline(true);
    await expect(page.getByTestId("command-status")).toContainText(
      "Connection lost",
    );
    await context.setOffline(false);
    await expect(
      page.getByRole("button", { name: "Keep for later", exact: true }),
    ).toBeEnabled();
    const afterReconnect = await snapshot(page, id);
    stopOffline();
    expect(afterReconnect.view.combat?.laneId).toBe(1);
    const owner = ownerPool();
    try {
      const count = await owner.query(
        "SELECT count(*) FROM match_events WHERE match_id=$1 AND kind='PowerGranted'",
        [id],
      );
      expect(Number(count.rows[0].count)).toBe(1);
    } finally {
      await owner.end();
    }
    if (choice === "USE") {
      for (const [name, width, height] of [
        ["desktop", 1440, 900],
        ["tablet", 1024, 768],
        ["mobile", 375, 812],
      ] as const) {
        await page.setViewportSize({ width, height });
        if (name === "mobile")
          await expect(
            page.getByRole("heading", {
              name: "Rotate your device or use a larger screen to play",
            }),
          ).toBeVisible();
        else {
          await expect(
            page.getByRole("region", { name: "Five-lane board" }),
          ).toBeVisible();
          await expect(
            page.getByRole("heading", { name: "Attack blocked" }),
          ).toBeVisible();
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        await captureEvidence(page, `block-${name}`);
      }
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    if (choice === "KEEP")
      await page
        .getByRole("button", { name: "Keep for later", exact: true })
        .click();
    else {
      await page
        .getByRole("button", { name: "Use now · 0", exact: true })
        .click();
      await page.locator('[data-own-unit="true"]').first().click();
    }
    await expect
      .poll(async () => {
        const s = await snapshot(page, id);
        return s.view.phase !== "COMBAT";
      })
      .toBe(true);
    const done = await snapshot(page, id);
    if (choice === "KEEP") expect(done.view.board[0].good).toBeNull();
    else expect(done.view.board[0].good?.current.hp).toBeGreaterThan(0);
  });
test("lost block receipt survives reload and retries the identical command without regrant", async ({
  page,
}) => {
  const { id } = await blockFixture(page);
  const sent: unknown[] = [];
  let lose = true;
  await page.route(`**/api/v1/matches/${id}/commands`, async (route) => {
    const body = route.request().postDataJSON();
    if (body.action.kind !== "KEEP_BLOCK_POWER") {
      await route.continue();
      return;
    }
    sent.push(body);
    if (lose) {
      lose = false;
      const committed = await route.fetch();
      expect(committed.status()).toBe(200);
      expectNetworkFailure(page, {
        url: route.request().url(),
        once: true,
        errorText: "net::ERR_FAILED",
      });
      await route.abort("failed");
    } else await route.continue();
  });
  await page.goto(`/matches/${id}`);
  await page
    .getByRole("button", { name: "Keep for later", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry request", exact: true }),
  ).toBeVisible();
  const accepted = await snapshot(page, id);
  expect(accepted.view.blockResponse).toBeNull();
  expect(accepted.view.combat?.laneId).toBe(1);
  await page.reload();
  await page
    .getByRole("button", { name: "Retry request", exact: true })
    .click();
  await expect(page.getByTestId("command-status")).not.toContainText(
    "unconfirmed",
  );
  expect(sent).toHaveLength(2);
  expect(sent[1]).toEqual(sent[0]);
  const owner = ownerPool();
  try {
    const count = await owner.query(
      "SELECT count(*) FROM match_events WHERE match_id=$1 AND kind='PowerGranted'",
      [id],
    );
    expect(Number(count.rows[0].count)).toBe(1);
  } finally {
    await owner.end();
  }
});
test("a visible five-second refresh never times out an unchanged response or target selection", async ({
  page,
}) => {
  const { id } = await blockFixture(page);
  await page.goto(`/matches/${id}`);
  await page.getByRole("button", { name: "Use now · 0", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Choose a target", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-own-unit="true"]').first()).toBeFocused();
  const requests = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      new URL(response.url()).pathname === `/api/v1/matches/${id}`,
  );
  await requests;
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await expect(
    page.getByRole("heading", { name: "Choose a target", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-own-unit="true"]').first()).toBeFocused();
  expect((await snapshot(page, id)).view.blockResponse?.visibility).toBe("OWN");
});
test("no legal target keeps an explicit enabled KEEP and Escape never sends it", async ({
  page,
}) => {
  const { id } = await blockFixture(page, true);
  await page.goto(`/matches/${id}`);
  await expect(page.getByText("No legal targets right now")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Use now · 0", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Keep for later", exact: true }),
  ).toBeEnabled();
  const old = await snapshot(page, id);
  expect(
    old.view.self.reserve.some(
      (power) =>
        power.instanceId !==
        (old.view.blockResponse?.visibility === "OWN"
          ? old.view.blockResponse.powerInstanceId
          : null),
    ),
  ).toBe(true);
  await page.getByText("Powers · 2", { exact: true }).click();
  await expect(page.locator(".reserve details").first()).toBeVisible();
  await page.locator(".reserve details summary").first().click();
  await expect(page.locator(".reserve details[open]")).toContainText(
    "Inspect only while awaiting a response",
  );
  await page.keyboard.press("Escape");
  expect((await snapshot(page, id)).revision).toBe(0);
  await captureEvidence(page, "block-no-target");
  await page
    .getByRole("button", { name: "Keep for later", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Attack blocked" }),
  ).not.toBeVisible();
});
test("two visible tabs recover a paused checkpoint without duplicating the response", async ({
  page,
  context,
}) => {
  const { id, csrf } = await blockFixture(page);
  const other = await context.newPage();
  await page.goto(`/matches/${id}`);
  await other.goto(`/matches/${id}`);
  await expect(
    page.getByRole("button", { name: "Keep for later", exact: true }),
  ).toBeEnabled();
  await expect(
    other.getByRole("button", { name: "Keep for later", exact: true }),
  ).toBeEnabled();
  await command(page, id, csrf, { kind: "PAUSE" });
  await expect(
    page.getByRole("dialog", { name: "Paused", exact: true }),
  ).toBeVisible({ timeout: 8000 });
  await expect(
    other.getByRole("dialog", { name: "Paused", exact: true }),
  ).toBeVisible({ timeout: 8000 });
  expect((await snapshot(page, id)).view.blockResponse?.visibility).toBe("OWN");
  await other.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Paused", exact: true }),
  ).not.toBeVisible({ timeout: 8000 });
  await page
    .getByRole("button", { name: "Keep for later", exact: true })
    .click();
  await expect(
    other.getByRole("heading", { name: "Attack blocked" }),
  ).not.toBeVisible({ timeout: 8000 });
  const owner = ownerPool();
  try {
    const count = await owner.query(
      "SELECT count(*) FROM match_action_journal WHERE match_id=$1 AND action->'action'->>'kind'='KEEP_BLOCK_POWER'",
      [id],
    );
    expect(Number(count.rows[0].count)).toBe(1);
  } finally {
    await owner.end();
  }
  await other.close();
});
test("offline during a heal tween fetches the changed server checkpoint on reconnect", async ({
  page,
  context,
}) => {
  const { id, csrf } = await blockFixture(page);
  await page.goto(`/matches/${id}`);
  await expect(page.locator('[data-scene-status="ready"]')).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole("button", { name: "Use now · 0", exact: true }).click();
  await page.locator('[data-own-unit="true"]').first().click();
  await expect(page.locator('[data-presentation="playing"]')).toBeVisible();
  const stopOffline = expectNetworkFailure(page, {
    url: new RegExp(`^${testOrigin}/`),
    errorText: "net::ERR_INTERNET_DISCONNECTED",
  });
  await context.setOffline(true);
  await command(page, id, csrf, { kind: "PAUSE" });
  const remote = await snapshot(page, id);
  expect(remote.view.lifecycle).toBe("PAUSED");
  await context.setOffline(false);
  await expect(
    page.getByRole("dialog", { name: "Paused", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-presentation="idle"]')).toBeAttached();
  stopOffline();
  await captureEvidence(page, "recovered-paused");
});
test("snapshot history recovers 205 scanned rows across an empty private page without cosmetic replay", async ({
  page,
}) => {
  const { id } = await denseLogFixture(page);
  const scans: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.endsWith("/events"))
      scans.push(url.searchParams.get("afterSeq")!);
  });
  await page.goto(`/matches/${id}`);
  await expect(page.locator(".battle-log [data-event-id]")).toHaveCount(105);
  await expect(page.locator('[data-scene-status="ready"]')).toBeVisible({
    timeout: 15000,
  });
  expect(scans).toEqual(expect.arrayContaining(["0", "100", "200"]));
  expect(
    await page
      .locator(".battle-log [data-event-id]")
      .evaluateAll(
        (elements) =>
          new Set(
            elements.map((element) => element.getAttribute("data-event-id")),
          ).size,
      ),
  ).toBe(105);
  await expect(page.locator('[data-presentation="idle"]')).toBeAttached();
  await expect(page.locator("body")).not.toContainText("MUST_NEVER_RENDER");
  await captureEvidence(page, "complete-log");
  await page.reload();
  await expect(page.locator(".battle-log [data-event-id]")).toHaveCount(105);
  expectNetworkFailure(page, {
    url: new RegExp(`^${testOrigin}/api/v1/matches/${id}/events[?]`),
    status: 410,
  });
  const owner = ownerPool();
  try {
    await owner.query("DELETE FROM match_events WHERE match_id=$1 AND seq=1", [
      id,
    ]);
  } finally {
    await owner.end();
  }
  await page.reload();
  await page.getByText("Log and controls", { exact: true }).click();
  await expect(
    page
      .locator("details[open]")
      .getByText("Part of the log has expired.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Five-lane board" }),
  ).toBeVisible();
  await expect(page.locator(".battle-log [data-event-id]")).toHaveCount(104);
  await captureEvidence(page, "expired-log");
});
test("hidden lifecycle stops snapshot polling and foreground resumes server recovery", async ({
  page,
}) => {
  const { id } = await blockFixture(page);
  await page.goto(`/matches/${id}`);
  await expect(
    page.getByRole("button", { name: "Keep for later", exact: true }),
  ).toBeEnabled();
  let snapshots = 0;
  page.on("request", (request) => {
    if (
      request.method() === "GET" &&
      new URL(request.url()).pathname === `/api/v1/matches/${id}`
    )
      snapshots++;
  });
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  // A negative observation must span the actual five-second polling interval.
  await page.waitForTimeout(5500);
  expect(snapshots).toBe(0);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    Reflect.deleteProperty(document, "visibilityState");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => snapshots).toBeGreaterThan(0);
  await expect(
    page.getByRole("button", { name: "Keep for later", exact: true }),
  ).toBeEnabled();
});
test("lost RESUME before commit retries the identical envelope inside the pause modal by keyboard and pointer", async ({
  page,
}) => {
  const { id } = await blockFixture(page);
  await page.goto(`/matches/${id}`);
  await expect(
    page.getByRole("button", { name: "Keep for later", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Paused", exact: true });
  await expect(
    modal.getByRole("button", { name: "Continue", exact: true }),
  ).toBeEnabled();
  const paused = await snapshot(page, id);
  const sent: unknown[] = [];
  await page.route(`**/api/v1/matches/${id}/commands`, async (route) => {
    const body = route.request().postDataJSON();
    if (body.action.kind !== "RESUME") return route.continue();
    sent.push(body);
    // Fail before forwarding: the server must remain PAUSED, with no receipt.
    if (sent.length <= 2) {
      expectNetworkFailure(page, {
        url: route.request().url(),
        once: true,
        errorText: "net::ERR_FAILED",
      });
      await route.abort("failed");
    } else await route.continue();
  });
  await modal.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByTestId("command-status")).toContainText("unconfirmed");
  const unchanged = await snapshot(page, id);
  expect(unchanged.revision).toBe(paused.revision);
  expect(unchanged.view.lifecycle).toBe("PAUSED");
  expect(sent[0]).toMatchObject({ action: { kind: "RESUME" } });
  const retry = modal.getByRole("button", {
    name: "Retry request",
    exact: true,
  });
  await expect(retry).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(modal).toBeVisible();
  expect(sent).toHaveLength(1);
  await modal.locator("h2").focus();
  for (let tab = 0; tab < 5; tab++) {
    await page.keyboard.press("Tab");
    if (await retry.evaluate((element) => element === document.activeElement))
      break;
  }
  await expect(retry).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(modal.getByTestId("command-status")).toContainText(
    "unconfirmed",
  );
  expect(sent).toEqual([sent[0], sent[0]]);
  await page.reload();
  await expect(retry).toBeEnabled();
  await expect(
    modal.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  await captureEvidence(page, "pause-uncertain-retry");
  for (const [name, width, height] of [
    ["tablet", 1024, 768],
    ["mobile", 375, 812],
  ] as const) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(retry).toBeEnabled();
    await captureEvidence(page, `pause-uncertain-${name}`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await retry.click();
  await expect(modal).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Keep for later", exact: true }),
  ).toBeEnabled();
  expect((await snapshot(page, id)).view.lifecycle).toBe("ACTIVE");
  expect(sent).toEqual([sent[0], sent[0], sent[0]]);
});
for (const paused of [false, true])
  test(`${paused ? "paused " : ""}failed snapshot recovery disables actions until explicit retry and clears the failure after success`, async ({
    page,
  }) => {
    const { id } = await blockFixture(page);
    await page.goto(`/matches/${id}`);
    await expect(
      page.getByRole("button", { name: "Keep for later", exact: true }),
    ).toBeEnabled();
    if (paused) {
      await page.getByRole("button", { name: "Pause", exact: true }).click();
      await expect(
        page
          .getByRole("dialog")
          .getByRole("button", { name: "Continue", exact: true }),
      ).toBeEnabled();
    }
    const surface = paused
      ? page.getByRole("dialog", { name: "Paused", exact: true })
      : page.locator(".match-screen");
    const action = surface.getByRole("button", {
      name: paused ? "Continue" : "Keep for later",
      exact: true,
    });
    let fail = true;
    await page.route(`**/api/v1/matches/${id}`, async (route) => {
      if (fail) {
        fail = false;
        expectNetworkFailure(page, {
          url: route.request().url(),
          status: 503,
          once: true,
        });
        await route.fulfill({
          status: 503,
          json: {
            error: {
              code: "TEMPORARILY_UNAVAILABLE",
              messageKey: "unavailable",
              requestId: "10000000-0000-4000-8000-000000000001",
              retryable: true,
              details: {},
            },
          },
        });
      } else await route.continue();
    });
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(surface.getByTestId("command-status")).toContainText(
      "Latest board unavailable",
    );
    await expect(action).toBeDisabled();
    if (paused) {
      await page.keyboard.press("Escape");
      expect((await snapshot(page, id)).view.lifecycle).toBe("PAUSED");
      await captureEvidence(page, "pause-snapshot-recovery");
    }
    await surface
      .getByRole("button", { name: "Reconnect", exact: true })
      .click();
    await expect(action).toBeEnabled();
    await expect(surface.getByTestId("command-status")).not.toContainText(
      "Latest board unavailable",
    );
    if (paused) {
      await action.click();
      await expect(surface).not.toBeVisible();
      await expect(
        page.getByRole("button", { name: "Pause", exact: true }),
      ).toBeFocused();
    }
  });
