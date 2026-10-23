import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { response } from "../../apps/web/tests/fixtures.js";
import { arenaForView } from "../../apps/web/src/features/match/rendering/arena.js";
import {
  validateWire,
  type CommandResponse,
  type UnitView,
} from "../../packages/contracts/src/index.js";
import { prepare, enter, collectBrowserErrors } from "./quality-fixtures.js";
import { testOrigin } from "./test-origin.js";
import { cardFixture, snapshot } from "./recovery-fixtures.js";
import { ownerPool } from "../../packages/db/tests/helpers.js";
import {
  decodeCheckpoint,
  encodeCheckpoint,
} from "../../apps/api/src/matches/checkpoint.js";
import { hashState } from "../../packages/game-engine/src/index.js";

const evidence = ".superpowers/sdd/2026-10-23-courtyard/integration";
const handIds = Array.from({ length: 10 }, (_, index) =>
  (index + 1).toString(16).padStart(32, "a"),
);
const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  await mkdir(evidence, { recursive: true });
  browserErrors.set(page, collectBrowserErrors(page));
});

test.afterEach(async ({ page }, info) => {
  const name = info.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  await writeFile(
    `${evidence}/${name}-result.json`,
    JSON.stringify(
      { status: info.status, browserErrors: browserErrors.get(page) ?? [] },
      null,
      2,
    ),
  );
  if (info.status !== info.expectedStatus && !page.isClosed())
    await page.screenshot({ path: `${evidence}/${name}-failure.png` });
});

async function prepareCourtyard(page: Page, dto: CommandResponse) {
  const errors = await prepare(page, dto);
  await page.route(
    `**/api/v1/matches/${dto.view.matchId}/realtime-ticket`,
    (route) =>
      route.fulfill({
        json: {
          url: `${testOrigin.replace("http", "ws")}/realtime/matches`,
          token: "courtyard-public-fixture",
          expiresAt: new Date(Date.now() + 60000).toISOString(),
        },
      }),
  );
  await page.routeWebSocket("**/realtime/matches", (socket) => {
    socket.onMessage(() =>
      socket.send(
        JSON.stringify({
          type: "ready",
          matchId: dto.view.matchId,
          revision: dto.revision,
        }),
      ),
    );
  });
  return errors;
}

function moonroot(handCount = 5): CommandResponse {
  const dto = response();
  dto.view.versions.content = "elements_v1";
  for (let suffix = 1; suffix < 100; suffix++) {
    dto.view.matchId = `10000000-0000-4000-8000-${suffix.toString(16).padStart(12, "0")}`;
    if (arenaForView(dto.view).key === "moonroot-conservatory") break;
  }
  expect(arenaForView(dto.view).key).toBe("moonroot-conservatory");
  const definitions = ["GC01", "V02", "B05", "V04", "GC02"] as const;
  dto.view.self.hand = handIds.slice(0, handCount).map((instanceId, index) => ({
    instanceId,
    definitionId: definitions[index % definitions.length]!,
  }));
  dto.view.players.GOOD.handCount = handCount;
  dto.view.players.GOOD.energy = { current: 5, max: 5 };
  dto.view.players.EVIL.energy = { current: 3, max: 5 };
  dto.view.legalActions = [{ kind: "PASS_PHASE" }];
  for (const lane of dto.view.board) {
    for (const side of ["GOOD", "EVIL"] as const) {
      if (lane.laneId === 2 || (lane.laneId === 4 && side === "EVIL")) continue;
      const unit: UnitView = {
        instanceId: (lane.laneId * 2 + (side === "GOOD" ? 0 : 1))
          .toString(16)
          .padStart(32, "0"),
        definitionId:
          side === "GOOD"
            ? definitions[lane.laneId - 1]!
            : (["EC01", "F01", "X02", "S04", "F05"] as const)[lane.laneId - 1]!,
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
  }
  expect(validateWire("CommandResponse", dto)).toBe(true);
  return dto;
}

async function center(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
}

async function mouseDrag(
  page: Page,
  source: Locator,
  destination: { x: number; y: number },
) {
  const origin = await center(source);
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await page.mouse.move(origin.x, origin.y - 20, { steps: 3 });
  await page.mouse.move(destination.x, destination.y, { steps: 12 });
  await page.mouse.up();
}

test("Moonroot populated courtyard keeps cards and controls reachable with 1, 5 and 10 cards", async ({
  page,
}) => {
  test.setTimeout(180000);
  await mkdir(evidence, { recursive: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const records: unknown[] = [];
  const errors = collectBrowserErrors(page);
  for (const count of [5, 1, 10]) {
    const dto = moonroot(count);
    await prepareCourtyard(page, dto);
    await page.setViewportSize({ width: 1440, height: 900 });
    await enter(page, dto.view.matchId);
    await expect(page.locator(".courtyard-match")).toBeVisible();
    await expect(
      page.locator(".board-unit[data-projected='true']"),
    ).toHaveCount(7);
    for (const [width, height] of [
      [1440, 900],
      [844, 390],
      [375, 812],
    ]) {
      const focusedBeforeResize = await page
        .locator(".hand")
        .evaluate((hand) => {
          const focused = document.activeElement;
          return focused instanceof HTMLElement && hand.contains(focused)
            ? (focused.dataset.cardId ?? null)
            : null;
        });
      await page.setViewportSize({ width: width!, height: height! });
      if (focusedBeforeResize) {
        await expect
          .poll(
            () =>
              page.locator(".hand").evaluate((hand, cardId) => {
                const focused = document.activeElement;
                if (
                  !(focused instanceof HTMLElement) ||
                  !hand.contains(focused) ||
                  focused.dataset.cardId !== cardId
                )
                  return false;
                const b = focused.getBoundingClientRect(),
                  h = hand.getBoundingClientRect();
                const style = getComputedStyle(focused);
                const allowance =
                  parseFloat(style.outlineWidth) +
                  Math.max(0, parseFloat(style.outlineOffset));
                return (
                  b.left - allowance >= h.left &&
                  b.right + allowance <= h.right &&
                  b.top - allowance >= h.top &&
                  b.bottom + allowance <= h.bottom &&
                  scrollX === 0 &&
                  scrollY === 0
                );
              }, focusedBeforeResize),
            {
              message:
                "Resize retains the same fully visible hand focus without scrolling the page",
            },
          )
          .toBe(true);
      } else await expect(page.locator(".hand-card:focus")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "End phase", exact: true }),
      ).toBeInViewport();
      await expect(page.locator(".hand-card")).toHaveCount(count);
      await expect(page.locator(".hand")).toBeInViewport({ ratio: 1 });
      await page.screenshot({
        path: `${evidence}/moonroot-${width}x${height}-hand${count}.png`,
      });
      const layout = await page
        .locator("[data-battle-root]")
        .evaluate((root) => {
          const rect = (selector: string) =>
            Array.from(root.querySelectorAll(selector)).map((node) => {
              const b = node.getBoundingClientRect();
              return {
                x: b.x,
                y: b.y,
                width: b.width,
                height: b.height,
                inside:
                  b.left >= 0 &&
                  b.right <= innerWidth &&
                  b.top >= 0 &&
                  b.bottom <= innerHeight,
              };
            });
          const blockers = Array.from(
            root.querySelectorAll(".hand-region, .hero-panel, .phase-controls"),
          );
          const occluded = Array.from(
            root.querySelectorAll(
              ".board-unit, .empty-slot, .board-unit .unit-stats",
            ),
          ).flatMap((node) => {
            const b = node.getBoundingClientRect();
            return blockers.flatMap((blocker) => {
              const h = blocker.getBoundingClientRect();
              const overlapWidth =
                Math.min(b.right, h.right) - Math.max(b.left, h.left);
              const overlapHeight =
                Math.min(b.bottom, h.bottom) - Math.max(b.top, h.top);
              return overlapWidth > 2 && overlapHeight > 2
                ? [
                    {
                      side: (node as HTMLElement).dataset.slotSide,
                      lane: (node as HTMLElement).dataset.slotLane,
                      blocker: blocker.className,
                      overlapWidth,
                      overlapHeight,
                    },
                  ]
                : [];
            });
          });
          const utilityOverlaps = Array.from(
            root.querySelectorAll(".hero-panel"),
          ).flatMap((hero) => {
            const b = hero.getBoundingClientRect();
            return Array.from(
              root.querySelectorAll(".reserve, .hand-list, .tablet-inspect"),
            ).flatMap((utility) => {
              const u = utility.getBoundingClientRect();
              return Math.min(b.right, u.right) - Math.max(b.left, u.left) >
                2 && Math.min(b.bottom, u.bottom) - Math.max(b.top, u.top) > 2
                ? [utility.className]
                : [];
            });
          });
          return {
            board: rect(".board"),
            units: rect(".board-unit"),
            slots: rect(".empty-slot"),
            hand: rect(".hand"),
            heroes: rect(".hero-panel"),
            phase: rect(".phase-controls"),
            handGeometry: Array.from(root.querySelectorAll(".hand-card")).map(
              (node) => {
                const button = node.getBoundingClientRect();
                const face = node
                  .querySelector(".card-face")!
                  .getBoundingClientRect();
                const cost = node
                  .querySelector(".card-face-cost")!
                  .getBoundingClientRect();
                const hand = node.closest(".hand")!.getBoundingClientRect();
                return {
                  buttonHeight: button.height,
                  faceHeight: face.height,
                  faceOffset: face.top - button.top,
                  faceInside:
                    face.top >= hand.top && face.bottom <= hand.bottom,
                  costInside:
                    cost.top >= hand.top && cost.bottom <= hand.bottom,
                };
              },
            ),
            occluded,
            utilityOverlaps,
            overflow: document.documentElement.scrollWidth - innerWidth,
          };
        });
      records.push({ count, width, height, layout });
      await writeFile(
        `${evidence}/layouts.json`,
        JSON.stringify({ records, errors }, null, 2),
      );
      expect(layout.overflow).toBeLessThanOrEqual(0);
      expect(
        layout.utilityOverlaps,
        "Hero resources remain clear of utility controls",
      ).toEqual([]);
      expect(
        layout.handGeometry.every(
          (card) =>
            Math.abs(card.buttonHeight - card.faceHeight) <= 1 &&
            Math.abs(card.faceOffset) <= 1 &&
            card.faceInside &&
            card.costInside,
        ),
      ).toBe(true);
      expect(
        layout.units.every(
          (unit) => unit.inside && unit.width >= 44 && unit.height >= 44,
        ),
      ).toBe(true);
      expect
        .soft(
          layout.occluded,
          `${width}x${height}, hand ${count}: board cards/slots must not overlap blocking HUD or hand`,
        )
        .toEqual([]);
      for (let index = 0; index < count; index++) {
        const card = page.locator(".hand-card").nth(index);
        await card.focus();
        await page.keyboard.press(index === count - 1 ? "End" : "ArrowRight");
        await expect(page.locator(".hand-card:focus")).toBeInViewport();
      }
    }
  }
  expect(errors).toEqual([]);
});

test("all four current arenas keep shared HUD and unit drops usable at desktop and portrait", async ({
  page,
}) => {
  test.setTimeout(240000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const records: unknown[] = [];
  for (const [key, location] of [
    ["moonroot-conservatory", "ancient_forest"],
    ["cinder-foundry", "volcano"],
    ["glasswater-sanctum", "frozen_lake"],
    ["astral-causeway", "storm_peak"],
  ] as const) {
    const dto = moonroot(1);
    dto.view.board[0]!.location = {
      state: "REVEALED",
      definitionId: location,
      revealTurn: 1,
    };
    expect(arenaForView(dto.view).key).toBe(key);
    const action = {
      kind: "PLAY_UNIT" as const,
      cardInstanceId: handIds[0]!,
      laneId: 2 as const,
    };
    dto.view.legalActions = [action, { kind: "PASS_PHASE" }];
    const errors = await prepareCourtyard(page, dto);
    const sent: unknown[] = [];
    await page.route(
      `**/api/v1/matches/${dto.view.matchId}/commands`,
      async (route) => {
        sent.push(route.request().postDataJSON().action);
        const next = structuredClone(dto);
        next.revision++;
        next.view.self.hand = [];
        next.view.players.GOOD.handCount = 0;
        next.view.legalActions = [{ kind: "PASS_PHASE" }];
        await route.fulfill({ json: next });
      },
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await enter(page, dto.view.matchId);
    await expect(page.locator("canvas.battle-canvas")).toHaveAttribute(
      "data-arena",
      key,
    );
    for (const [width, height] of [
      [1440, 900],
      [375, 812],
    ]) {
      await page.setViewportSize({ width: width!, height: height! });
      await expect(page.locator("[data-arena-3d='ready']")).toBeVisible();
      await expect(page.locator(".board .lane")).toHaveCount(5);
      await expect(
        page.getByRole("button", { name: "End phase", exact: true }),
      ).toBeInViewport({ ratio: 1 });
      const geometry = await page
        .locator("[data-battle-root]")
        .evaluate((root) => {
          const blockers = Array.from(
            root.querySelectorAll(".hand-region, .hero-panel, .phase-controls"),
          ).map((node) => node.getBoundingClientRect());
          const targets = Array.from(
            root.querySelectorAll(".board-unit, .empty-slot"),
          ).map((node) => node.getBoundingClientRect());
          return {
            count: targets.length,
            readable: targets.every(
              (b) =>
                b.width >= 44 &&
                b.height >= 44 &&
                b.left >= 0 &&
                b.right <= innerWidth &&
                b.top >= 0 &&
                b.bottom <= innerHeight,
            ),
            clear: targets.every((b) =>
              blockers.every(
                (h) =>
                  Math.min(b.right, h.right) - Math.max(b.left, h.left) <= 2 ||
                  Math.min(b.bottom, h.bottom) - Math.max(b.top, h.top) <= 2,
              ),
            ),
            overflow: document.documentElement.scrollWidth - innerWidth,
          };
        });
      expect(geometry).toEqual({
        count: 10,
        readable: true,
        clear: true,
        overflow: 0,
      });
      await page.screenshot({
        path: `${evidence}/current-${key}-${width}x${height}.png`,
      });
      records.push({ key, width, height, geometry });
    }
    await mouseDrag(
      page,
      page.locator(".hand-card"),
      await center(
        page.locator('.empty-slot[data-slot-side="GOOD"][data-slot-lane="2"]'),
      ),
    );
    await expect.poll(() => sent).toEqual([action]);
    await expect(page.locator(".hand-card")).toHaveCount(0);
    expect(errors).toEqual([]);
    await writeFile(
      `${evidence}/four-arena-smoke.json`,
      JSON.stringify(
        { records, errors: browserErrors.get(page) ?? [] },
        null,
        2,
      ),
    );
  }
});

for (const kind of ["UNIT", "NONE", "UNIT_AND_LANE"] as const) {
  test(`trick ${kind} uses direct rendered targets and the exact wire action`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const dto = moonroot(1);
    const selectedUnit =
      kind === "UNIT_AND_LANE"
        ? dto.view.board[0]!.evil!
        : dto.view.board[0]!.good!;
    dto.view.self.hand[0]!.definitionId =
      kind === "UNIT" ? "B06" : kind === "NONE" ? "V07" : "S07";
    const target =
      kind === "NONE"
        ? { kind }
        : kind === "UNIT"
          ? { kind, instanceId: selectedUnit.instanceId }
          : { kind, instanceId: selectedUnit.instanceId, laneId: 2 as const };
    const action = {
      kind: "PLAY_TRICK" as const,
      cardInstanceId: handIds[0]!,
      target,
    };
    dto.view.legalActions = [action, { kind: "PASS_PHASE" }];
    const errors = await prepareCourtyard(page, dto);
    const sent: unknown[] = [];
    await page.route(
      `**/api/v1/matches/${dto.view.matchId}/commands`,
      async (route) => {
        sent.push(route.request().postDataJSON().action);
        const next = structuredClone(dto);
        next.revision++;
        next.view.self.hand = [];
        next.view.players.GOOD.handCount = 0;
        next.view.legalActions = [{ kind: "PASS_PHASE" }];
        await route.fulfill({ json: next });
      },
    );
    await enter(page, dto.view.matchId);
    const source = page.locator(".hand-card");
    if (kind === "NONE") {
      const cast = await page.locator(".board").evaluate((node) => {
        const board = node.getBoundingClientRect();
        return {
          x:
            board.x +
            parseFloat(
              (node as HTMLElement).style.getPropertyValue("--cast-x"),
            ),
          y:
            board.y +
            parseFloat(
              (node as HTMLElement).style.getPropertyValue("--cast-y"),
            ),
        };
      });
      expect(Number.isFinite(cast.x) && Number.isFinite(cast.y)).toBe(true);
      await mouseDrag(page, source, cast);
    } else {
      const unit = page.locator(`[data-unit-id="${selectedUnit.instanceId}"]`);
      await mouseDrag(page, source, await center(unit));
      if (kind === "UNIT_AND_LANE") {
        expect(sent).toEqual([]);
        await expect(unit).toHaveAttribute("data-move-source", "true");
        await expect(page.locator(".inspect .card-face")).toHaveCount(0);
        await page.screenshot({
          path: `${evidence}/combined-enemy-move-pending.png`,
        });
        await mouseDrag(
          page,
          unit,
          await center(
            page.locator(
              '.empty-slot[data-slot-side="EVIL"][data-slot-lane="2"]',
            ),
          ),
        );
      }
    }
    await expect.poll(() => sent).toEqual([action]);
    await expect(page.locator(".hand-card")).toHaveCount(0);
    await expect(page.locator(".inspect .card-face")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test.describe("native touch", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Native touch acceptance uses Chromium's CDP input pipeline",
  );
  test.use({ hasTouch: true, viewport: { width: 375, height: 812 } });

  test("upward touch drop plays once without selecting the card", async ({
    page,
    context,
  }) => {
    const dto = moonroot(1);
    const action = {
      kind: "PLAY_UNIT" as const,
      cardInstanceId: handIds[0]!,
      laneId: 2 as const,
    };
    dto.view.legalActions = [action, { kind: "PASS_PHASE" }];
    const errors = await prepareCourtyard(page, dto);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const sent: unknown[] = [];
    await page.route(
      `**/api/v1/matches/${dto.view.matchId}/commands`,
      async (route) => {
        sent.push(route.request().postDataJSON().action);
        const next = structuredClone(dto);
        next.revision++;
        next.view.self.hand = [];
        next.view.players.GOOD.handCount = 0;
        next.view.legalActions = [{ kind: "PASS_PHASE" }];
        await route.fulfill({ json: next });
      },
    );
    await enter(page, dto.view.matchId);
    const origin = await center(page.locator(".hand-card"));
    const destination = await center(
      page.locator('.empty-slot[data-slot-side="GOOD"][data-slot-lane="2"]'),
    );
    const native = await context.newCDPSession(page);
    try {
      await native.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [origin],
      });
      await native.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: origin.x, y: origin.y - 24 }],
      });
      await expect(page.locator(".courtyard-drag-preview")).toBeVisible();
      for (let step = 1; step <= 12; step++)
        await native.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            {
              x: origin.x + ((destination.x - origin.x) * step) / 12,
              y: origin.y - 24 + ((destination.y - origin.y + 24) * step) / 12,
            },
          ],
        });
      await page.screenshot({
        path: `${evidence}/portrait-touch-drop-hover.png`,
      });
      await writeFile(
        `${evidence}/portrait-touch-drop-hover.json`,
        JSON.stringify(
          await page.evaluate(
            (point) => ({
              destination: point,
              topElement: document.elementFromPoint(point.x, point.y)
                ?.outerHTML,
              valid: document.querySelector<HTMLElement>(
                ".courtyard-drag-preview",
              )?.dataset.valid,
            }),
            destination,
          ),
          null,
          2,
        ),
      );
      await native.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    } finally {
      await native.detach();
    }
    await expect.poll(() => sent).toEqual([action]);
    await expect(page.locator(".hand-card")).toHaveCount(0);
    await expect(page.locator(".inspect .card-face")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("horizontal touch scrolling reaches all ten cards without selecting or playing", async ({
    page,
    context,
  }) => {
    const dto = moonroot(10);
    dto.view.legalActions = handIds.map((cardInstanceId) => ({
      kind: "PLAY_UNIT",
      cardInstanceId,
      laneId: 2,
    }));
    const errors = await prepareCourtyard(page, dto);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const sent: unknown[] = [];
    await page.route(
      `**/api/v1/matches/${dto.view.matchId}/commands`,
      async (route) => {
        sent.push(route.request().postDataJSON().action);
        await route.fulfill({ json: dto });
      },
    );
    await enter(page, dto.view.matchId);
    const hand = page.locator(".hand");
    const bounds = await hand.boundingBox();
    const start = {
      x: bounds!.x + bounds!.width * 0.8,
      y: bounds!.y + bounds!.height * 0.55,
    };
    const initial = await hand.evaluate((node) => node.scrollLeft);
    const native = await context.newCDPSession(page);
    const reached = new Set<string>();
    try {
      for (let swipe = 0; swipe < 5; swipe++) {
        for (const id of await page.locator(".hand-card").evaluateAll((nodes) =>
          nodes
            .filter((node) => {
              const b = node.getBoundingClientRect();
              const h = node.closest(".hand")!.getBoundingClientRect();
              return b.left >= h.left && b.right <= h.right;
            })
            .map((node) => (node as HTMLElement).dataset.cardId!),
        ))
          reached.add(id);
        await native.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [start],
        });
        for (let step = 1; step <= 12; step++)
          await native.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [
              { x: start.x - (bounds!.width * 0.6 * step) / 12, y: start.y },
            ],
          });
        await native.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
      }
    } finally {
      await native.detach();
    }
    for (const id of await page.locator(".hand-card").evaluateAll((nodes) =>
      nodes
        .filter((node) => {
          const b = node.getBoundingClientRect();
          const h = node.closest(".hand")!.getBoundingClientRect();
          return b.left >= h.left && b.right <= h.right;
        })
        .map((node) => (node as HTMLElement).dataset.cardId!),
    ))
      reached.add(id);
    expect(await hand.evaluate((node) => node.scrollLeft)).toBeGreaterThan(
      initial + 40,
    );
    expect([...reached].sort()).toEqual([...handIds].sort());
    await expect(page.locator('.hand-card[aria-pressed="true"]')).toHaveCount(
      0,
    );
    await expect(page.locator(".inspect .card-face")).toHaveCount(0);
    expect(sent).toEqual([]);
    expect(errors).toEqual([]);
  });
});

test("mouse unit drop submits once and an invalid drop sends no command", async ({
  page,
}) => {
  // Four native 12-step drags take roughly 45 s on software WebGL, in addition
  // to loading the authored arena. Keep the same complete interaction coverage.
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const dto = moonroot(1);
  dto.view.legalActions.unshift({
    kind: "PLAY_UNIT",
    cardInstanceId: handIds[0]!,
    laneId: 2,
  });
  const errors = await prepareCourtyard(page, dto);
  const sent: unknown[] = [];
  await page.route(
    `**/api/v1/matches/${dto.view.matchId}/commands`,
    async (route) => {
      sent.push(route.request().postDataJSON().action);
      const next = structuredClone(dto);
      next.revision++;
      next.view.self.hand = [];
      next.view.players.GOOD.handCount = 0;
      next.view.legalActions = [{ kind: "PASS_PHASE" }];
      await route.fulfill({ json: next });
    },
  );
  await enter(page, dto.view.matchId);
  const card = page.locator(".hand-card");
  for (const invalid of [
    { x: 5, y: 5 },
    await center(
      page.locator('.empty-slot[data-slot-side="EVIL"][data-slot-lane="2"]'),
    ),
    await center(
      page.locator('.board-unit[data-slot-side="GOOD"][data-slot-lane="1"]'),
    ),
  ]) {
    await mouseDrag(page, card, invalid);
    await expect(page.locator(".courtyard-drag-preview")).toHaveCount(0);
    expect(sent).toEqual([]);
    await expect(card).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".inspect .card-face")).toHaveCount(0);
  }
  await mouseDrag(
    page,
    card,
    await center(
      page.locator('.empty-slot[data-slot-side="GOOD"][data-slot-lane="2"]'),
    ),
  );
  await expect
    .poll(() => sent)
    .toEqual([{ kind: "PLAY_UNIT", cardInstanceId: handIds[0], laneId: 2 }]);
  await expect(page.locator(".hand-card")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /confirm|play selected/i }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("real API accepts the exact Moonroot mouse drop once and removes the hand card", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = collectBrowserErrors(page);
  const fixture = await cardFixture(page);
  const owner = ownerPool();
  try {
    const row = (
      await owner.query(
        "SELECT state,state_hash FROM match_checkpoints WHERE match_id=$1",
        [fixture.id],
      )
    ).rows[0];
    const state = decodeCheckpoint(row.state, row.state_hash);
    // Only this isolated fixture changes: a public revealed Moonroot location
    // pins presentation without changing the tested empty deployment slot.
    state.board[4]!.location = {
      state: "ACTIVE",
      definitionId: "ancient_forest",
      revealTurn: 1,
    };
    await owner.query(
      "UPDATE match_checkpoints SET state=$2,state_hash=$3 WHERE match_id=$1",
      [fixture.id, encodeCheckpoint(state), hashState(state)],
    );
  } finally {
    await owner.end();
  }
  const before = await snapshot(page, fixture.id);
  expect(arenaForView(before.view).key).toBe("moonroot-conservatory");
  const sent: unknown[] = [];
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname ===
        `/api/v1/matches/${fixture.id}/commands` &&
      request.method() === "POST"
    )
      sent.push(request.postDataJSON().action);
  });
  await enter(page, fixture.id);
  await mouseDrag(
    page,
    page.locator(`.hand-card[data-card-id="${fixture.instanceId}"]`),
    await center(
      page.locator('.empty-slot[data-slot-side="EVIL"][data-slot-lane="2"]'),
    ),
  );
  await expect
    .poll(
      async () =>
        (await snapshot(page, fixture.id)).view.board[1]!.evil?.instanceId,
    )
    .toBe(fixture.instanceId);
  await expect(
    page.locator(`.hand-card[data-card-id="${fixture.instanceId}"]`),
  ).toHaveCount(0, { timeout: 15000 });
  expect(sent).toEqual([
    { kind: "PLAY_UNIT", cardInstanceId: fixture.instanceId, laneId: 2 },
  ]);
  const after = await snapshot(page, fixture.id);
  expect(after.revision).toBe(before.revision + 1);
  expect(after.view.players.EVIL.energy.current).toBe(
    before.view.players.EVIL.energy.current - 1,
  );
  expect(errors).toEqual([]);
});

test("Moonroot normal-motion fan keeps its authored composition across orientations", async ({
  page,
}) => {
  const dto = moonroot(5);
  const errors = await prepareCourtyard(page, dto);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await enter(page, dto.view.matchId);
  for (const [width, height] of [
    [1440, 900],
    [844, 390],
    [375, 812],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    await expect(page.locator(".hand-card")).toHaveCount(5);
    await page.screenshot({
      path: `${evidence}/moonroot-${width}x${height}-normal-motion.png`,
    });
  }
  expect(errors).toEqual([]);
});

test("keyboard source and target activation retains immediate unit and untargeted-trick play", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const kind of ["PLAY_UNIT", "PLAY_TRICK"] as const) {
    const dto = moonroot(1);
    if (kind === "PLAY_TRICK") dto.view.self.hand[0]!.definitionId = "V07";
    const action =
      kind === "PLAY_UNIT"
        ? { kind, cardInstanceId: handIds[0]!, laneId: 2 as const }
        : {
            kind,
            cardInstanceId: handIds[0]!,
            target: { kind: "NONE" as const },
          };
    dto.view.legalActions = [action, { kind: "PASS_PHASE" }];
    const errors = await prepareCourtyard(page, dto);
    const sent: unknown[] = [];
    await page.route(
      `**/api/v1/matches/${dto.view.matchId}/commands`,
      async (route) => {
        sent.push(route.request().postDataJSON().action);
        const next = structuredClone(dto);
        next.revision++;
        next.view.self.hand = [];
        next.view.players.GOOD.handCount = 0;
        next.view.legalActions = [{ kind: "PASS_PHASE" }];
        await route.fulfill({ json: next });
      },
    );
    await enter(page, dto.view.matchId);
    await page.locator(".hand-card").focus();
    await page.keyboard.press("Enter");
    expect(sent).toEqual([]);
    const target =
      kind === "PLAY_UNIT"
        ? page.getByRole("button", {
            name: "Choose lane 2, legal target",
            exact: true,
          })
        : page.getByRole("button", { name: "Cast selected card", exact: true });
    await target.focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => sent).toEqual([action]);
    await expect(page.locator(".hand-card")).toHaveCount(0);
    expect(errors).toEqual([]);
  }
});
