import { evidencePath } from "./evidence-path.js";
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
  process.env.OATHFRONT_MOTION_EVIDENCE_DIR ??
  evidencePath(
    "task10",
    ".superpowers/sdd/2026-10-20-oathfront-implementation/task-10-evidence/final",
  );
// Validated public DTOs isolate choreography from random decks and bot decisions.
function checkpoint(revision = 1) {
  const result = response(revision);
  result.view.self.hand[0]!.instanceId = "a".repeat(32);
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
async function enter(page: Page, id: string) {
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
const pass = (page: Page) =>
  page.getByRole("button", { name: "End phase", exact: true });
async function requestPass(page: Page) {
  const received = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.endsWith("/commands") &&
      response.request().method() === "POST",
  );
  await pass(page).click();
  await received;
}
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
      next.eventsThroughSeq = sequence;
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
  const handCard = page.locator(".hand-card").first();
  await handCard.focus();
  await expect
    .poll(() =>
      handCard.evaluate(
        (el) => new DOMMatrix(getComputedStyle(el).transform).m42,
      ),
    )
    .toBeLessThan(-5);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(() =>
      handCard.evaluate(
        (el) => new DOMMatrix(getComputedStyle(el).transform).m42,
      ),
    )
    .toBe(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page
    .getByRole("heading", { name: "OathFront match" })
    .evaluate((el) => (el as HTMLElement).focus());
  await handCard.dispatchEvent("focusin");
  await expect
    .poll(() =>
      handCard.evaluate(
        (el) => new DOMMatrix(getComputedStyle(el).transform).m42,
      ),
    )
    .toBeLessThan(-5);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      handCard.evaluate(
        (el) => new DOMMatrix(getComputedStyle(el).transform).m42,
      ),
    )
    .toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const before = await page
    .locator("canvas")
    .screenshot({ path: `${evidence}/canvas-before.png` });
  // Freeze a real intermediate frame through the existing visibility pause path.
  await page.evaluate(() => {
    const layer = document.querySelector("[data-presentation]")!;
    const observer = new MutationObserver(() => {
      if (layer.getAttribute("data-presentation") !== "playing") return;
      observer.disconnect();
      let frames = 0;
      function hold() {
        if (++frames < 6) {
          requestAnimationFrame(hold);
          return;
        }
        Object.defineProperty(document, "hidden", {
          configurable: true,
          value: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      }
      requestAnimationFrame(hold);
    });
    observer.observe(layer, {
      attributes: true,
      attributeFilter: ["data-presentation"],
    });
  });
  await requestPass(page);
  await expect.poll(() => page.evaluate(() => document.hidden)).toBe(true);
  await expect(page.locator('[data-presentation="playing"]')).toBeVisible();
  const during = await page
    .locator("canvas")
    .screenshot({ path: `${evidence}/canvas-signature.png` });
  expect(during.equals(before)).toBe(false);
  await page.screenshot({ path: `${evidence}/signature.png`, fullPage: true });
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.getByRole("link", { name: /OathFront/i }).click();
  await enter(page, initial.view.matchId);
  await requestPass(page);
  await expect(page.locator('[data-presentation="playing"]')).toBeVisible();
  await page.locator(".hand-card").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-presentation="idle"]')).toBeVisible();
  await expect(
    page.getByRole("region", { name: /Opponent hero/ }),
  ).toContainText("11");
  expect(commands).toBe(2);
  await page.keyboard.press("Escape");
  await requestPass(page);
  await expect(page.locator('[data-presentation="playing"]')).toBeVisible();
  await page.context().setOffline(true);
  await page.waitForTimeout(100);
  await page.context().setOffline(false);
  await expect(page.locator('[data-presentation="idle"]')).toBeVisible();
  expect(commands).toBe(3);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.keyboard.press("Escape");
  await requestPass(page);
  await expect(page.locator('[data-presentation="idle"]')).toBeVisible();
  expect(commands).toBe(4);
  // Explicit reduction can only add to the OS preference.
  await page.getByRole("checkbox", { name: "Reduce motion / VFX" }).check();
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
        pixelsDiffer: !during.equals(before),
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
    await page.setViewportSize({ width: 1280, height: 720 });
    expect(
      await page.locator(".unit-stats").evaluateAll((elements) =>
        elements.every((el) => {
          const r = el.getBoundingClientRect(),
            parent = el.closest("button")!.getBoundingClientRect();
          return r.left >= parent.left && r.right <= parent.right;
        }),
      ),
    ).toBe(true);
    await page.setViewportSize({ width: 1440, height: 900 });
    const durations: number[] = [];
    // Read the real semantic text each animation frame, so a one-sided HP commit is observable.
    await page.evaluate((holdImpact) => {
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
        if (
          holdImpact &&
          samples.at(-1)?.some((value) => value.includes("4 HP"))
        ) {
          holdImpact = false;
          Object.defineProperty(document, "hidden", {
            configurable: true,
            value: true,
          });
          document.dispatchEvent(new Event("visibilitychange"));
        }
        if (running) requestAnimationFrame(sample);
      }
      sample();
    }, !reduced);
    for (let lane = 1; lane <= 5; lane++) {
      const start = Date.now();
      await requestPass(page);
      await expect(
        page.locator(`.lane:nth-child(${lane}) .unit-stats`).first(),
      ).toContainText("4 HP");
      await expect(
        page.locator(`.lane:nth-child(${lane}) .unit-stats`).last(),
      ).toContainText("4 HP");
      if (lane === 1 && !reduced) {
        await expect
          .poll(() => page.evaluate(() => document.hidden))
          .toBe(true);
        await page.screenshot({
          path: `${evidence}/combat-impact-intermediate.png`,
          fullPage: true,
        });
        await page.evaluate(() => {
          Object.defineProperty(document, "hidden", {
            configurable: true,
            value: false,
          });
          document.dispatchEvent(new Event("visibilitychange"));
        });
      }
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

test("failed renderer keeps the latest semantic board and retries with one canvas", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    let fail = true;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value: function (
        this: HTMLCanvasElement,
        contextId: string,
        options?: object,
      ) {
        if (
          fail &&
          this.classList.contains("battle-canvas") &&
          contextId.includes("webgl")
        ) {
          fail = false;
          throw Error("Expected transient WebGL initialization failure");
        }
        return Reflect.apply(original, this, [contextId, options]);
      },
    });
  });
  const initial = checkpoint(),
    errors = await prepare(page, initial);
  await page.route(
    `**/api/v1/matches/${initial.view.matchId}/commands`,
    (route) => {
      const next = checkpoint(2);
      next.view.players.EVIL.hp = 9;
      return route.fulfill({ json: next });
    },
  );
  await page.goto(`/matches/${initial.view.matchId}`);
  await expect(
    page.getByText("Using the text board.", { exact: false }),
  ).toBeVisible({ timeout: 15000 });
  await requestPass(page);
  await expect(
    page.getByRole("region", { name: /Opponent hero/ }),
  ).toContainText("9");
  await page
    .getByRole("button", { name: "Retry artwork", exact: true })
    .click();
  await expect(page.locator('[data-scene-status="ready"]')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(
    page.getByRole("region", { name: /Opponent hero/ }),
  ).toContainText("9");
  expect(errors).toEqual([]);
});

test("used effect families render through the strict-CSP WebGL path", async ({
  page,
}) => {
  const initial = checkpoint();
  initial.view.board[0].good = null;
  initial.view.board[1].good = null;
  initial.view.players.GOOD.hp = 10;
  initial.view.board[0].location = { state: "HIDDEN", revealTurn: 1 };
  const errors = await prepare(page, initial),
    unit = checkpoint().view.board[0].good!;
  let current = structuredClone(initial),
    seq = 1,
    index = 0;
  const envelope = { visibility: "PUBLIC" as const, ownerSide: null };
  const events: VisibleEvent[] = [
    {
      ...envelope,
      eventId: "",
      rootId: "",
      sequence: 0,
      kind: "UnitCreated",
      payload: { unit, cause: "PLAY" },
    },
    {
      ...envelope,
      eventId: "",
      rootId: "",
      sequence: 0,
      kind: "UnitMoved",
      payload: {
        instanceId: unit.instanceId,
        side: "GOOD",
        fromLane: 1,
        toLane: 2,
      },
    },
    {
      ...envelope,
      eventId: "",
      rootId: "",
      sequence: 0,
      kind: "StatsChanged",
      payload: {
        instanceId: unit.instanceId,
        before: unit.current,
        after: { attack: 3, hp: 6, maxHp: 6 },
        modifiers: [],
      },
    },
    {
      ...envelope,
      eventId: "",
      rootId: "",
      sequence: 0,
      kind: "StatusChanged",
      payload: {
        instanceId: unit.instanceId,
        before: unit.statuses,
        after: { ...unit.statuses, shield: true },
      },
    },
    {
      ...envelope,
      eventId: "",
      rootId: "",
      sequence: 0,
      kind: "LocationRevealed",
      payload: { laneId: 1, definitionId: "ancient_forest" },
    },
    {
      ...envelope,
      eventId: "",
      rootId: "",
      sequence: 0,
      kind: "CardPlayed",
      payload: {
        side: "GOOD",
        cardInstanceId: "a".repeat(32),
        definitionId: "GC06",
        target: { kind: "LANE", laneId: 3 },
        energySpent: 1,
      },
    },
    {
      ...envelope,
      eventId: "",
      rootId: "",
      sequence: 0,
      kind: "BlockOccurred",
      payload: { side: "GOOD", preventedDamage: 2, blocksUsed: 1 },
    },
    {
      ...envelope,
      eventId: "",
      rootId: "",
      sequence: 0,
      kind: "HeroHealed",
      payload: { side: "GOOD", amount: 2, before: 10, after: 12 },
    },
    {
      ...envelope,
      eventId: "",
      rootId: "",
      sequence: 0,
      kind: "HandCountChanged",
      payload: { side: "EVIL", handCount: 2, deckCount: 25 },
    },
    {
      eventId: "",
      rootId: "",
      sequence: 0,
      kind: "CardDrawn",
      visibility: "OWNER",
      ownerSide: "GOOD",
      payload: {
        side: "GOOD",
        card: { instanceId: "d".repeat(32), definitionId: "GC02" },
        handCount: 2,
        deckCount: 25,
      },
    },
    {
      ...envelope,
      eventId: "",
      rootId: "",
      sequence: 0,
      kind: "UnitDestroyed",
      payload: {
        instanceId: unit.instanceId,
        definitionId: unit.definitionId,
        owner: "GOOD",
        laneId: 2,
        isToken: false,
      },
    },
    {
      ...envelope,
      eventId: "",
      rootId: "",
      sequence: 0,
      kind: "MatchEnded",
      payload: {
        outcome: { result: "WIN", winner: "GOOD", reason: "SURRENDER" },
        turn: 1,
      },
    },
  ];
  await page.route(
    `**/api/v1/matches/${initial.view.matchId}/commands`,
    async (route) => {
      const event = structuredClone(events[index++]!);
      event.sequence = ++seq;
      event.eventId = `${initial.view.matchId}:${seq}`;
      event.rootId = `${initial.view.matchId}:1`;
      // Public fixture checkpoints intentionally contain explicit after values; no engine state is imported.
      if (event.kind === "UnitCreated")
        current.view.board[0].good = structuredClone(unit);
      if (event.kind === "UnitMoved") {
        current.view.board[0].good = null;
        current.view.board[1].good = { ...structuredClone(unit), laneId: 2 };
      }
      if (event.kind === "StatsChanged")
        current.view.board[1].good!.current = event.payload.after;
      if (event.kind === "StatusChanged")
        current.view.board[1].good!.statuses = event.payload.after;
      if (event.kind === "LocationRevealed")
        current.view.board[0].location = {
          state: "REVEALED",
          definitionId: "ancient_forest",
          revealTurn: 1,
        };
      if (event.kind === "HeroHealed") current.view.players.GOOD.hp = 12;
      if (event.kind === "CardDrawn")
        current.view.self.hand.push(event.payload.card);
      if (event.kind === "UnitDestroyed") current.view.board[1].good = null;
      if (event.kind === "MatchEnded") {
        current.view.lifecycle = "COMPLETED";
        current.view.outcome = event.payload.outcome;
        current.view.legalActions = [];
      }
      current = {
        ...current,
        revision: current.revision + 1,
        latestSeq: seq,
        eventsThroughSeq: seq,
        events: [event],
      };
      expect(validateWire("CommandResponse", current)).toBe(true);
      await route.fulfill({ json: current });
    },
  );
  await enter(page, initial.view.matchId);
  for (let i = 0; i < events.length; i++) {
    await requestPass(page);
    await expect(page.locator(".battle-log li")).toHaveCount(i + 1);
    await expect(page.locator('[data-presentation="idle"]')).toBeVisible();
  }
  expect(errors).toEqual([]);
  await page.screenshot({ path: `${evidence}/result-dim.png`, fullPage: true });
  await writeFile(
    `${evidence}/effect-families.json`,
    JSON.stringify(
      {
        families: events.map((event) => event.kind),
        errors,
        fixture: "validated public presentation DTO",
      },
      null,
      2,
    ),
  );
});
