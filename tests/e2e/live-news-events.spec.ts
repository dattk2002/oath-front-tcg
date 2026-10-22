import { test, expect, type Page } from "@playwright/test";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { testOrigin, testApiOrigin } from "./test-origin.js";
import { evidencePath } from "./evidence-path.js";
import type { SessionResponse } from "../../packages/contracts/src/index.js";
const evidence = evidencePath(
  "live-news-events",
  ".superpowers/sdd/2026-10-22-events-affinities/browser/live-news-events",
);
test.skip(
  process.env.OATHFRONT_E2E_LIVE_CONTENT !== "1",
  "Requires the isolated seeded live-content fixture.",
);
async function clock(page: Page, now = "2026-10-26T01:00:00Z") {
  expect(
    (
      await page.request.post(`${testApiOrigin}/__fixture/clock`, {
        data: { now },
      })
    ).ok(),
  ).toBe(true);
}
async function guest(page: Page): Promise<SessionResponse> {
  const r = await page.request.post("/api/v1/guest", {
    headers: { Origin: testOrigin },
    data: {
      commandId: randomUUID(),
      recoverySecret: randomBytes(32).toString("base64url"),
    },
  });
  expect(r.status()).toBe(201);
  return r.json();
}
async function account(page: Page) {
  const g = await guest(page);
  const identity = await (
    await page.request.post(`${testApiOrigin}/__fixture/identity`, {
      data: { subject: randomUUID() },
    })
  ).json();
  const r = await page.request.post("/api/v1/auth/claim-guest", {
    headers: { Origin: testOrigin, "X-CSRF-Token": g.csrfToken },
    data: {
      commandId: randomUUID(),
      identityToken: identity.token,
      keepMatchId: null,
    },
  });
  expect(r.status()).toBe(200);
  return r.json() as Promise<SessionResponse>;
}
test("published news and real weekly roadmap handle filters, refresh, future reveals and outages", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await clock(page);
  await guest(page);
  await page.goto("/news");
  await expect(page.locator(".live-news-card")).toHaveCount(7);
  await page.getByRole("link", { name: "Guides", exact: true }).click();
  await expect(page.locator(".live-news-card")).toHaveCount(2);
  await page.locator(".live-news-card").first().click();
  await expect(page.locator(".live-article > section")).not.toHaveCount(0);
  await expect(page.locator(".live-article")).not.toContainText("Mock");
  await page.reload();
  await expect(page.locator(".live-article > section")).not.toHaveCount(0);
  const missing = await page.goto("/news/does-not-exist");
  expect(missing?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Article not found" }),
  ).toBeVisible();
  await page.route("**/api/v1/news", (r) =>
    r.fulfill({ status: 503, json: { error: "unavailable" } }),
  );
  await page.goto("/news");
  await expect(page.locator("main [role=alert]")).toContainText(
    "News could not be loaded",
  );
  await page.unroute("**/api/v1/news");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator(".live-news-card")).toHaveCount(7);
  await page.goto("/events");
  await expect(page.locator(".weekly-card")).toHaveCount(12);
  await expect(
    page.locator('.weekly-card [class="unrevealed-card"]'),
  ).toHaveCount(11);
  await page.getByRole("link", { name: "Upcoming", exact: true }).click();
  await expect(page.locator(".weekly-card")).toHaveCount(11);
  await page.goto("/events/first-light-week-02");
  await expect(
    page.getByRole("heading", { name: "Unrevealed card" }),
  ).toBeVisible();
  await expect(page.locator(".weekly-detail")).not.toContainText(
    "Moonpetal Keeper",
  );
  await page.goto("/events/first-light-week-01");
  await expect(page.locator(".daily-rail li")).toHaveCount(7);
  await expect(
    page.getByRole("button", { name: "Play practice", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Sign in with Google for rewards" }),
  ).toBeVisible();
  await mkdir(evidence, { recursive: true });
  for (const width of [1440, 1024, 375]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `${evidence}/weekly-${width}.png`,
      fullPage: true,
    });
  }
  await clock(page, "2026-10-25T23:59:00Z");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Unrevealed card" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play practice", exact: true }),
  ).toHaveCount(0);
  await page.goto("/events/the-fivefold-sketchbook");
  await expect(
    page.getByRole("heading", { name: "This was an event concept." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("guest practice recovers the exact uncertain create, resumes and waits one hour after surrender", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await clock(page);
  const session = await guest(page);
  await page.goto("/events/first-light-week-01");
  let body: unknown,
    matchId = "";
  await page.route("**/api/v1/events/daily-matches", async (route) => {
    body = route.request().postDataJSON();
    const accepted = await route.fetch();
    expect(accepted.status()).toBe(201);
    matchId = (await accepted.json()).view.matchId;
    await route.abort();
  });
  await page
    .getByRole("button", { name: "Play practice", exact: true })
    .click();
  await expect(page.locator("main [role=alert]")).toContainText("unconfirmed");
  await page.unroute("**/api/v1/events/daily-matches");
  await page.reload();
  const retry = page.getByRole("button", {
    name: "Retry original challenge request",
  });
  await expect(retry).toBeVisible();
  const request = page.waitForRequest((r) =>
    r.url().endsWith("/events/daily-matches"),
  );
  await retry.click();
  expect((await request).postDataJSON()).toEqual(body);
  await expect(page).toHaveURL(`/matches/${matchId}`);
  await expect(page.locator(".board")).toBeVisible();
  await page.goto("/events/first-light-week-01");
  await page
    .getByRole("link", { name: "Resume challenge", exact: true })
    .click();
  await expect(page).toHaveURL(`/matches/${matchId}`);
  const state = await (
    await page.request.get(`/api/v1/matches/${matchId}`)
  ).json();
  const surrendered = await page.request.post(
    `/api/v1/matches/${matchId}/commands`,
    {
      headers: { Origin: testOrigin, "X-CSRF-Token": session.csrfToken },
      data: {
        commandId: randomUUID(),
        expectedRevision: state.revision,
        action: { kind: "SURRENDER" },
      },
    },
  );
  expect(surrendered.status()).toBe(200);
  await page.goto(`/matches/${matchId}`);
  await expect(
    page.getByRole("region", { name: "Event rewards" }),
  ).toContainText("no account rewards");
  await page
    .getByRole("link", { name: "Return to weekly event", exact: true })
    .click();
  await expect(page.getByText("Retry in 1h", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cooling down", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(page.getByText("Retry in 1h", { exact: true })).toBeVisible();
  await clock(page, "2026-10-26T02:00:00Z");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByRole("button", { name: "Play practice", exact: true }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
});

test("account challenge and practice progress stay separate and future collection cards stay sealed", async ({
  page,
}) => {
  await clock(page);
  await account(page);
  await page.goto("/events/first-light-week-01");
  await expect(
    page.getByText("Account rewards enabled", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play daily challenge", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("radio", { name: "Practice · no rewards", exact: true })
    .check();
  await expect(
    page.getByRole("button", { name: "Play practice", exact: true }),
  ).toBeEnabled();
  await page.goto("/decks/new?hero=H_G_BV");
  await page
    .getByRole("combobox", { name: "Rarity", exact: true })
    .selectOption("E");
  await expect(page.locator(".collection-card")).toHaveCount(1);
  await expect(page.locator(".collection-card")).toContainText(
    "Oathglass Sentinel",
  );
  await expect(page.locator(".collection-card")).toContainText("Owned 0/2");
  await expect(
    page
      .getByRole("region", { name: "Collection" })
      .getByRole("button", { name: "Add Oathglass Sentinel", exact: true }),
  ).toBeDisabled();
});

import { ownerPool } from "../../packages/db/tests/helpers.js";
import { chooseBotAction } from "../../packages/bot/src/index.js";
import type {
  CommandResponse,
  VisibleEvent,
  PlayerAction,
} from "../../packages/contracts/src/index.js";
import AxeBuilder from "@axe-core/playwright";
test("account wins a real prepared battle, earns its card once and retains it after interrupted reveal", async ({
  page,
  context,
}) => {
  await clock(page, "2026-10-30T01:00:00Z");
  const session = await account(page),
    owner = ownerPool();
  try {
    await owner.query(
      "INSERT INTO weekly_progress(account_id,event_id,tickets) VALUES($1,'season01-week01',1100)",
      [session.principal.id],
    );
    for (const [source, kind, tickets, day] of [
      ["daily:0", "DAILY", 100, 0],
      ["daily:1", "DAILY", 100, 1],
      ["daily:2", "DAILY", 100, 2],
      ["daily:3", "DAILY", 100, 3],
      ["milestone:3", "MILESTONE", 200, 2],
      ["pve:retained-0", "PVE", 200, 0],
      ["pve:retained-1", "PVE", 200, 1],
      ["pve:retained-2", "PVE", 100, 2],
    ] as const) {
      await owner.query(
        "INSERT INTO reward_ledger(id,account_id,event_id,source_key,kind,tickets,day_index,earned_at) VALUES($1,$2,'season01-week01',$3,$4,$5,$6,$7)",
        [
          randomUUID(),
          session.principal.id,
          source,
          kind,
          tickets,
          day,
          new Date(Date.parse("2026-10-26T01:00:00Z") + day * 86400000),
        ],
      );
    }
    await page.goto("/events/first-light-week-01");
    await expect(
      page.getByRole("region", { name: "Weekly ticket progress" }),
    ).toContainText("1,100");
    const second = await context.newPage();
    await second.goto("/events/first-light-week-01");
    await expect(
      second.getByRole("button", { name: "Play daily challenge", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Play daily challenge", exact: true })
      .click();
    await expect(page).toHaveURL(/\/matches\//);
    const matchId = page.url().split("/").at(-1)!;
    await page.goto("/events/first-light-week-01");
    const secondPlay = second.getByRole("button", {
      name: "Play daily challenge",
      exact: true,
    });
    const secondResume = second.getByRole("link", {
      name: "Resume active match",
      exact: true,
    });
    // A focus refresh may already have replaced the stale start control.
    if (await secondPlay.isVisible()) {
      try {
        await secondPlay.click({ timeout: 5000 });
      } catch (error) {
        if (!(await secondResume.isVisible())) throw error;
      }
    }
    await expect(secondResume).toBeVisible();
    await expect(secondResume).toHaveAttribute("href", `/matches/${matchId}`);
    await second.close();
    expect(
      (
        await owner.query(
          "SELECT count(*)::int n FROM daily_attempts WHERE principal_id=$1",
          [session.principal.id],
        )
      ).rows[0].n,
    ).toBe(1);
    let result: CommandResponse = await (
      await page.request.get(`/api/v1/matches/${matchId}`)
    ).json();
    let random: import("../../packages/game-engine/src/index.js").RandomState =
      [1, 2, 3, 4];
    const memory: VisibleEvent[] = [];
    for (
      let step = 0;
      result.view.lifecycle === "ACTIVE" && step < 450;
      step++
    ) {
      memory.push(...result.events);
      let action: PlayerAction = { kind: "ADVANCE" };
      if (!result.needsAdvance) {
        const decision = chooseBotAction(
          result.view,
          result.view.legalActions,
          {
            difficulty: "NORMAL",
            randomState: random,
            observationMemory: memory.slice(-80),
          },
        );
        action = decision.action;
        random = decision.nextBotRandomState;
      }
      const r = await page.request.post(`/api/v1/matches/${matchId}/commands`, {
        headers: { Origin: testOrigin, "X-CSRF-Token": session.csrfToken },
        data: {
          commandId: randomUUID(),
          expectedRevision: result.revision,
          action,
        },
      });
      expect(r.status()).toBe(200);
      result = await r.json();
    }
    expect(result.view.outcome?.result).toBe("WIN");
    await page.goto(`/matches/${matchId}`);
    const reward = page.getByRole("region", { name: "Event rewards" });
    await expect(reward).toContainText("Oathglass Sentinel · 1 copy earned");
    await page
      .getByRole("link", { name: "Return to weekly event", exact: true })
      .click();
    await expect(page.getByText("Owned 1/2", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("Owned 1/2", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Weekly ticket progress" }),
    ).toContainText("1,500");
    await expect(page.locator(".daily-rail li").nth(4)).toContainText(
      "Completed · reward earned",
    );
    await expect(
      page
        .locator(".daily-rail")
        .getByRole("button", { name: "Completed", exact: true }),
    ).toHaveCount(5);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".ticket-progress")).toHaveCSS(
      "transform",
      "none",
    );
    expect(
      (
        await new AxeBuilder({ page })
          .include(".weekly-detail")
          .withRules(["color-contrast", "button-name", "link-name"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: `${evidence}/earned-card.png`,
      fullPage: true,
    });
    await page.goto("/history");
    await expect(page.locator(".history-row").first()).toContainText(
      "Daily challenge",
    );
    await page.goto("/decks/new?hero=H_G_BV");
    await page
      .getByRole("combobox", { name: "Rarity", exact: true })
      .selectOption("E");
    await expect(page.locator(".collection-card")).toContainText("Owned 1/2");
    await page
      .getByRole("button", { name: "Add Oathglass Sentinel", exact: true })
      .click();
    await expect(
      page
        .getByRole("region", { name: "Collection" })
        .getByRole("button", { name: "Add Oathglass Sentinel", exact: true }),
    ).toBeDisabled();
    expect(
      (
        await owner.query(
          "SELECT count(*)::int n FROM reward_ledger WHERE account_id=$1 AND kind='CARD'",
          [session.principal.id],
        )
      ).rows[0].n,
    ).toBe(1);
  } finally {
    await owner.end();
  }
});
test("an expired account session offers recovery before creating a daily battle", async ({
  page,
}) => {
  await clock(page);
  await account(page);
  await page.goto("/events/first-light-week-01");
  await expect(
    page.getByRole("button", { name: "Play daily challenge", exact: true }),
  ).toBeEnabled();
  await clock(page, "2026-10-26T01:16:00Z");
  await page
    .getByRole("button", { name: "Play daily challenge", exact: true })
    .click();
  await expect(
    page
      .locator(".daily-section")
      .getByRole("button", { name: "Restore session", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".daily-section")).not.toContainText(
    "Challenge creation is unconfirmed",
  );
});

test("past uncompleted daily nodes say Closed instead of Not open yet", async ({
  page,
}) => {
  await clock(page, "2026-10-28T01:00:00Z");
  await account(page);
  await page.goto("/events/first-light-week-01");
  const first = page.locator(".daily-rail li").first();
  await expect(first).toContainText("Closed for rewards");
  await expect(
    first.getByRole("button", { name: "Closed", exact: true }),
  ).toBeDisabled();
  await expect(
    page
      .locator(".daily-rail li")
      .last()
      .getByRole("button", { name: "Not open yet", exact: true }),
  ).toBeDisabled();
});
