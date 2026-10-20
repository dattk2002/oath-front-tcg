import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { response } from "../../apps/web/tests/fixtures.js";
import {
  validateWire,
  type CommandResponse,
  type VisibleEvent,
  type UnitView,
} from "../../packages/contracts/src/index.js";
const evidence =
  ".superpowers/sdd/2026-10-20-oathfront-implementation/task-10-evidence";
// Validated public DTOs isolate choreography from random decks and bot decisions.
function checkpoint(revision = 1) {
  const result = response(revision);
  result.view.self.hand[0]!.instanceId = "a".repeat(32);
  result.view.legalActions = [{ kind: "PASS_PHASE" }];
  result.latestSeq = 1;
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
async function prepare(page: Page, initial: CommandResponse) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
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
  await mkdir(evidence, { recursive: true });
  return errors;
}
async function enter(page: Page, id: string) {
  await page.goto(`/matches/${id}`);
  await expect(page.getByRole("region", { name: "Bàn năm lộ" })).toBeVisible();
  await expect(page.locator('[data-scene-status="ready"]')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator("canvas.battle-canvas")).toHaveCount(1);
  const renderer = await page.locator("canvas").evaluate((canvas) => {
    const gl = (canvas as HTMLCanvasElement).getContext("webgl2");
    return gl?.getParameter(gl.VERSION) as string | null;
  });
  expect(renderer).toContain("WebGL 2.0");
  return renderer;
}
const pass = (page: Page) =>
  page.getByRole("button", { name: "Kết thúc hành động", exact: true });
test("actual WebGL signature can be interrupted and remounted, then fast-forwarded before keyboard selection", async ({
  page,
}) => {
  const initial = checkpoint(),
    errors = await prepare(page, initial);
  let sequence = 1,
    commands = 0;
  await page.route(
    `**/api/v1/matches/${initial.view.matchId}/commands`,
    async (route) => {
      commands++;
      const next = checkpoint(++sequence);
      next.latestSeq = sequence;
      const power: VisibleEvent = {
        eventId: `${initial.view.matchId}:${sequence}`,
        rootId: `${initial.view.matchId}:1`,
        sequence,
        kind: "PowerUsed",
        visibility: "PUBLIC",
        ownerSide: null,
        payload: {
          side: "GOOD",
          powerInstanceId: "b".repeat(32),
          definitionId: "S_G_BV",
          target: { kind: "HERO", side: "EVIL" },
          energySpent: 1,
        },
      };
      next.events = [power];
      next.view.players.EVIL.hp = 11;
      expect(validateWire("CommandResponse", next)).toBe(true);
      await route.fulfill({ json: next });
    },
  );
  const renderer = await enter(page, initial.view.matchId);
  const before = await page.locator("canvas").screenshot();
  await pass(page).click();
  await expect(page.locator('[data-presentation="playing"]')).toBeVisible();
  const during = await page.locator("canvas").screenshot();
  expect(during.equals(before)).toBe(false);
  await page.screenshot({ path: `${evidence}/signature.png`, fullPage: true });
  await page.getByRole("link", { name: /OathFront/ }).click();
  await enter(page, initial.view.matchId);
  await pass(page).click();
  await expect(page.locator('[data-presentation="playing"]')).toBeVisible();
  await page.locator(".hand-card").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-presentation="idle"]')).toBeVisible();
  await expect(
    page.getByRole("region", { name: /Hero đối thủ/ }),
  ).toContainText("11");
  expect(commands).toBe(2);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.keyboard.press("Escape");
  await pass(page).click();
  await expect(page.locator('[data-presentation="idle"]')).toBeVisible();
  expect(commands).toBe(3);
  // Explicit reduction can only add to the OS preference.
  await page.getByRole("checkbox", { name: "Giảm chuyển động / VFX" }).check();
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["tablet", 1024, 768],
    ["mobile", 375, 812],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
  await writeFile(
    `${evidence}/lifecycle.json`,
    JSON.stringify(
      {
        renderer,
        pixi: "8.22.0",
        commands,
        errors,
        fixture:
          "validated public presentation DTO; real API flows verified separately",
      },
      null,
      2,
    ),
  );
});
for (const reduced of [false, true])
  test(`five lane combat shares HP beats and preserves event log (${reduced ? "reduced" : "normal"})`, async ({
    page,
  }) => {
    await page.emulateMedia({
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    const initial = checkpoint(),
      errors = await prepare(page, initial);
    let current = structuredClone(initial),
      laneIndex = 0,
      sequence = 1,
      commands = 0;
    await page.route(
      `**/api/v1/matches/${initial.view.matchId}/commands`,
      async (route) => {
        commands++;
        const lane = current.view.board[laneIndex++]!,
          evil = lane.evil!,
          good = lane.good!;
        const attack: VisibleEvent = {
          eventId: `${initial.view.matchId}:${++sequence}`,
          rootId: `${initial.view.matchId}:1`,
          sequence,
          kind: "AttackDeclared",
          visibility: "PUBLIC",
          ownerSide: null,
          payload: {
            batchId: `lane-${lane.laneId}`,
            attacks: [
              {
                sourceUnitId: evil.instanceId,
                side: "EVIL",
                laneId: lane.laneId,
                attack: 2,
                targets: [{ kind: "UNIT", instanceId: good.instanceId }],
                displayOrder: 1,
              },
              {
                sourceUnitId: good.instanceId,
                side: "GOOD",
                laneId: lane.laneId,
                attack: 2,
                targets: [{ kind: "UNIT", instanceId: evil.instanceId }],
                displayOrder: 2,
              },
            ],
          },
        };
        const damage: VisibleEvent = {
          eventId: `${initial.view.matchId}:${++sequence}`,
          rootId: `${initial.view.matchId}:1`,
          sequence,
          kind: "DamageBatchResolved",
          visibility: "PUBLIC",
          ownerSide: null,
          payload: {
            batchId: `lane-${lane.laneId}`,
            packets: [
              {
                source: { kind: "UNIT", instanceId: evil.instanceId },
                target: { kind: "UNIT", instanceId: good.instanceId },
                damageType: "COMBAT",
                rawDamage: 2,
                mitigatedDamage: 0,
                finalDamage: 2,
                blocked: false,
                shieldConsumed: false,
                displayOrder: 1,
              },
              {
                source: { kind: "UNIT", instanceId: good.instanceId },
                target: { kind: "UNIT", instanceId: evil.instanceId },
                damageType: "COMBAT",
                rawDamage: 2,
                mitigatedDamage: 0,
                finalDamage: 2,
                blocked: false,
                shieldConsumed: false,
                displayOrder: 2,
              },
            ],
            hpChanges: [
              {
                target: { kind: "UNIT", instanceId: good.instanceId },
                before: 6,
                after: 4,
              },
              {
                target: { kind: "UNIT", instanceId: evil.instanceId },
                before: 6,
                after: 4,
              },
            ],
          },
        };
        good.current.hp = 4;
        evil.current.hp = 4;
        current = {
          ...current,
          revision: current.revision + 1,
          latestSeq: sequence,
          eventsThroughSeq: sequence,
          events: [attack, damage],
        };
        expect(validateWire("CommandResponse", current)).toBe(true);
        await route.fulfill({ json: current });
      },
    );
    const renderer = await enter(page, initial.view.matchId);
    const durations: number[] = [];
    // Read the real semantic text each animation frame, so a one-sided HP commit is observable.
    await page.evaluate(() => {
      const samples: string[][] = [];
      const win = window as Window & {
        motionSamples?: string[][];
        stopSamples?: () => void;
      };
      win.motionSamples = samples;
      let running = true;
      win.stopSamples = () => {
        running = false;
      };
      function sample() {
        samples.push(
          Array.from(document.querySelectorAll(".unit-stats")).map(
            (el) => el.textContent ?? "",
          ),
        );
        if (running) requestAnimationFrame(sample);
      }
      sample();
    });
    for (let lane = 1; lane <= 5; lane++) {
      const start = Date.now();
      await pass(page).click();
      await expect(
        page.locator(`.lane:nth-child(${lane}) .unit-stats`).first(),
      ).toContainText("4 HP");
      await expect(
        page.locator(`.lane:nth-child(${lane}) .unit-stats`).last(),
      ).toContainText("4 HP");
      await expect(page.locator('[data-presentation="idle"]')).toBeVisible();
      durations.push(Date.now() - start);
    }
    const samples = await page.evaluate(() => {
      const win = window as Window & {
        motionSamples?: string[][];
        stopSamples?: () => void;
      };
      win.stopSamples?.();
      return win.motionSamples!;
    });
    for (const frame of samples)
      for (let lane = 0; lane < 5; lane++)
        expect(frame[lane * 2]).toBe(frame[lane * 2 + 1]);
    await expect(page.locator(".battle-log li")).toHaveCount(10);
    expect(commands).toBe(5);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `${evidence}/combat5-${reduced ? "reduced" : "normal"}.png`,
      fullPage: true,
    });
    await writeFile(
      `${evidence}/combat5-${reduced ? "reduced" : "normal"}.json`,
      JSON.stringify(
        {
          renderer,
          durationsMsIncludingTransportAndAssertions: durations,
          sampledFrames: samples.length,
          commands,
          errors,
        },
        null,
        2,
      ),
    );
  });
