import { evidencePath } from "./evidence-path.js";
import { expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { randomUUID, randomBytes } from "node:crypto";
import { testOrigin } from "./test-origin.js";
import { response } from "../../apps/web/tests/fixtures.js";
import {
  validateWire,
  type CommandResponse,
  type UnitView,
} from "../../packages/contracts/src/index.js";
const evidence = evidencePath(
  "task16-dev",
  ".superpowers/sdd/2026-10-20-oathfront-implementation/task-16-evidence/dev",
);
// Validated public DTOs isolate choreography from random decks and bot decisions.
export function checkpoint(revision = 1) {
  const result = response(revision);
  result.view.self.hand = Array.from({ length: 10 }, (_, i) => ({
    instanceId: i.toString(16).padStart(32, "a"),
    definitionId: "GC01",
  }));
  result.view.players.GOOD.handCount = 10;
  result.view.legalActions = [{ kind: "PASS_PHASE" }];
  result.latestSeq = 1;
  result.eventsThroughSeq = 1;
  for (const lane of result.view.board)
    for (const side of ["GOOD", "EVIL"] as const) {
      const unit: UnitView = {
        instanceId: (lane.laneId * 2 + (side === "GOOD" ? 0 : 1))
          .toString(16)
          .padStart(32, "0"),
        definitionId: side === "GOOD" ? "GC01" : "EC01",
        owner: side,
        laneId: lane.laneId,
        isToken: false,
        printed: { attack: 2, hp: 6, maxHp: 6 },
        current: { attack: 2, hp: 6, maxHp: 6 },
        statuses: {
          shield: false,
          armor: 0,
          poisoned: false,
          stunned: false,
          exhausted: false,
          pierce: false,
        },
        modifiers: [],
        lastRegularAttackTurn: null,
      };
      lane[side === "GOOD" ? "good" : "evil"] = unit;
    }
  expect(validateWire("CommandResponse", result)).toBe(true);
  return result;
}
export async function createQualityGuest(page: Page) {
  const response = await page.request.post("/api/v1/guest", {
    headers: { Origin: testOrigin },
    data: {
      commandId: randomUUID(),
      recoverySecret: randomBytes(32).toString("base64url"),
    },
  });
  expect(response.status()).toBe(201);
}
export function collectBrowserErrors(
  page: Page,
  expectedFailedResource?: RegExp,
) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const injectedFailure =
      expectedFailedResource?.test(m.location().url) &&
      m.text() === "Failed to load resource: net::ERR_FAILED";
    if (!injectedFailure) errors.push(m.text());
  });
  return errors;
}
export async function prepare(
  page: Page,
  initial: CommandResponse,
  expectedFailedResource?: RegExp,
) {
  expect(validateWire("CommandResponse", initial)).toBe(true);
  const errors = collectBrowserErrors(page, expectedFailedResource);
  if (process.env.OATHFRONT_E2E_PRODUCTION === "1")
    await page.route("**/*", async (route) => {
      if (route.request().resourceType() !== "document") {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      await route.fulfill({
        response,
        headers: {
          ...response.headers(),
          "content-security-policy":
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'",
        },
      });
    });
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      json: {
        principal: {
          kind: "GUEST",
          id: "20000000-0000-4000-8000-000000000001",
          displayName: "Khách",
          expiresAt: null,
          tutorialCompletedAt: null,
          evilTutorialCompletedAt: null,
        },
        csrfToken: "a".repeat(43),
        sessionExpiresAt: "2026-12-20T00:00:00.000Z",
        activeMatchId: initial.view.matchId,
      },
    }),
  );
  await page.route(`**/api/v1/matches/${initial.view.matchId}`, (route) =>
    route.fulfill({ json: initial }),
  );
  // Synthetic presentation cases supply canonical recovery DTOs as well. Real historical
  // log and retained-summary behavior is exercised against PostgreSQL in Task11 suites.
  await page.route(
    `**/api/v1/matches/${initial.view.matchId}/events?**`,
    async (route) => {
      const through = Number(
        new URL(route.request().url()).searchParams.get("throughSeq"),
      );
      const page = {
        events: [],
        nextCursor: through,
        scannedThroughSeq: through,
        hasMore: false,
      };
      expect(validateWire("EventPage", page)).toBe(true);
      await route.fulfill({ json: page });
    },
  );
  await page.route(
    `**/api/v1/matches/${initial.view.matchId}/summary`,
    async (route) => {
      const summary = {
        matchId: initial.view.matchId,
        mode: initial.view.mode,
        lifecycle: "COMPLETED",
        humanHeroId: initial.view.players.GOOD.heroId,
        opponentHeroId: initial.view.players.EVIL.heroId,
        difficulty: "EASY",
        outcome: { result: "WIN", winner: "GOOD", reason: "HERO_DEFEATED" },
        turns: initial.view.turn,
        activeDurationMs: 1000,
        damageDealt: 20,
        blocksUsed: 0,
        createdAt: "2026-10-20T00:00:00.000Z",
        endedAt: "2026-10-20T00:01:00.000Z",
        resumable: false,
        rematch: null,
      };
      expect(validateWire("MatchSummary", summary)).toBe(true);
      await route.fulfill({ json: summary });
    },
  );
  await mkdir(evidence, { recursive: true });
  return errors;
}
export async function enter(page: Page, id: string) {
  const started = Date.now();
  await page.goto(`/matches/${id}`);
  await expect(
    page.getByRole("region", { name: "Five-lane board" }),
  ).toBeVisible();
  await expect(page.locator('[data-scene-status="ready"]')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator("canvas.battle-canvas")).toHaveCount(1);
  const renderer = await page.locator("canvas").evaluate((canvas) => {
    const gl = (canvas as HTMLCanvasElement).getContext("webgl2");
    return gl?.getParameter(gl.VERSION) as string | null;
  });
  expect(renderer).toContain("WebGL 2.0");
  const lazyResources = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter(
        (entry) => entry.name.includes("/_next/") && entry.name.includes(".js"),
      )
      .map((entry) => ({
        path: new URL(entry.name).pathname,
        durationMs: Math.round(entry.duration),
      })),
  );
  return {
    version: renderer,
    readinessMs: Date.now() - started,
    lazyResources,
  };
}
