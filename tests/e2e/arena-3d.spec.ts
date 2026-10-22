import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { response } from "../../apps/web/tests/fixtures.js";
import {
  arenaForView,
  arenas,
} from "../../apps/web/src/features/match/rendering/arena.js";
import {
  validateWire,
  type CommandResponse,
  type UnitView,
} from "../../packages/contracts/src/index.js";
import { cardFixture, snapshot } from "./recovery-fixtures.js";

const evidence =
  process.env.OATHFRONT_ARENA_EVIDENCE_DIR ??
  ".superpowers/sdd/2026-10-22-arena-3d/browser-evidence";

function arenaCheckpoint(index: number): CommandResponse {
  const dto = response();
  dto.view.versions.content = "elements_v1";
  for (let suffix = 1; suffix < 100; suffix++) {
    dto.view.matchId = `10000000-0000-4000-8000-${suffix.toString(16).padStart(12, "0")}`;
    if (arenaForView(dto.view).key === arenas[index]!.key) break;
  }
  dto.view.self.hand = [
    { instanceId: "a".repeat(32), definitionId: "GC01" },
    { instanceId: "b".repeat(32), definitionId: "B06" },
    { instanceId: "c".repeat(32), definitionId: "V06" },
    { instanceId: "d".repeat(32), definitionId: "B05" },
  ];
  dto.view.players.GOOD.handCount = 4;
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
            ? (["GC01", "V02", "B05", "V04", "GC02"] as const)[lane.laneId - 1]!
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

async function publicFixture(page: Page, dto: CommandResponse) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      json: {
        principal: {
          kind: "GUEST",
          id: "20000000-0000-4000-8000-000000000001",
          displayName: "Arena review",
          expiresAt: null,
          tutorialCompletedAt: null,
          evilTutorialCompletedAt: null,
        },
        csrfToken: "a".repeat(43),
        sessionExpiresAt: "2026-12-20T00:00:00.000Z",
        activeMatchId: dto.view.matchId,
      },
    }),
  );
  await page.route(`**/api/v1/matches/${dto.view.matchId}`, (route) =>
    route.fulfill({ json: dto }),
  );
  await page.route(`**/api/v1/matches/${dto.view.matchId}/events?**`, (route) =>
    route.fulfill({
      json: {
        events: [],
        nextCursor: dto.latestSeq,
        scannedThroughSeq: dto.latestSeq,
        hasMore: false,
      },
    }),
  );
}

test("four dimensional arenas keep real card targets, inspector and controls usable across orientations", async ({
  page,
}) => {
  test.setTimeout(180000);
  await mkdir(evidence, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  const records: unknown[] = [];
  for (let index = 0; index < arenas.length; index++) {
    const dto = arenaCheckpoint(index);
    await publicFixture(page, dto);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/matches/${dto.view.matchId}`);
    await expect(
      page.locator('[data-battle-root][data-arena-3d="ready"]'),
    ).toBeVisible({ timeout: 30000 });
    const canvas = page.locator("canvas.battle-canvas");
    await expect(canvas).toHaveCount(1);
    await expect(canvas).toHaveAttribute("data-material", "ready");
    expect(
      await canvas.evaluate((node) =>
        (node as HTMLCanvasElement).getContext("webgl2")?.getParameter(7938),
      ),
    ).toContain("WebGL 2.0");
    const board = page.getByRole("region", { name: "Five-lane board" });
    await expect(
      board.locator(".board-unit[data-projected='true']"),
    ).toHaveCount(7);
    for (const [width, height] of index === 0
      ? [
          [1440, 900],
          [1280, 720],
          [844, 390],
          [375, 812],
        ]
      : [[1440, 900]]) {
      await page.setViewportSize({ width: width!, height: height! });
      await expect(
        page.getByRole("button", { name: "End phase", exact: true }),
      ).toBeInViewport();
      const handArt = page.locator(".hand .card-face-art").first();
      await expect(handArt).toBeVisible();
      expect((await handArt.boundingBox())!.height).toBeGreaterThan(24);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const positions = await board
        .locator(".board-unit")
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const b = node.getBoundingClientRect();
            return {
              id: (node as HTMLElement).dataset.unitId,
              x: b.x,
              y: b.y,
              width: b.width,
              height: b.height,
              visible:
                b.right > 0 &&
                b.left < innerWidth &&
                b.bottom > 0 &&
                b.top < innerHeight,
            };
          }),
        );
      expect(
        positions.every((p) => p.visible && p.width > 25 && p.height > 30),
      ).toBe(true);
      const target = board.locator(".board-unit").first();
      const before = await board.boundingBox();
      await target.click();
      await expect(
        page.getByRole("complementary", { name: "Selection details" }),
      ).toBeVisible();
      await expect(page.locator(".inspect .card-face")).toBeVisible();
      const after = await board.boundingBox();
      expect(after).toEqual(before);
      await page.keyboard.press("Escape");
      await page.screenshot({
        path: `${evidence}/${arenas[index]!.key}-${width}x${height}.png`,
      });
      records.push({
        arena: arenas[index]!.key,
        width,
        height,
        positions,
        canvas: await canvas.evaluate((node) => ({
          ...(node as HTMLElement).dataset,
        })),
      });
    }
  }
  await writeFile(
    `${evidence}/arena-layouts.json`,
    JSON.stringify({ records, errors }, null, 2),
  );
  expect(errors).toEqual([]);
});

for (const [width, height] of [
  [844, 390],
  [375, 812],
]) {
  test(`phone ${width}x${height} plays the exact existing unit command`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: width!, height: height! });
    const fixture = await cardFixture(page);
    await page.goto(`/matches/${fixture.id}`);
    await expect(page.locator('[data-arena-3d="ready"]')).toBeVisible({
      timeout: 30000,
    });
    const sent: unknown[] = [];
    const listener = (request: import("@playwright/test").Request) => {
      if (
        new URL(request.url()).pathname ===
          `/api/v1/matches/${fixture.id}/commands` &&
        request.method() === "POST"
      )
        sent.push(request.postDataJSON().action);
    };
    page.on("request", listener);
    await page
      .locator(`.hand-card[data-card-id="${fixture.instanceId}"]`)
      .click();
    await page
      .getByRole("button", { name: "Choose lane 1, legal target", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await snapshot(page, fixture.id)).view.board[0]!.evil?.definitionId,
      )
      .toBe("EC01");
    expect(
      sent.filter(
        (action: unknown) => (action as { kind: string }).kind === "PLAY_UNIT",
      ),
    ).toEqual([
      { kind: "PLAY_UNIT", cardInstanceId: fixture.instanceId, laneId: 1 },
    ]);
    page.off("request", listener);
  });
}

test("portrait WebGL failure preserves playable controls and retries with one renderer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
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
  const dto = arenaCheckpoint(0);
  await publicFixture(page, dto);
  let commands = 0;
  await page.route(
    `**/api/v1/matches/${dto.view.matchId}/commands`,
    async (route) => {
      commands++;
      expect(route.request().postDataJSON().action).toEqual({
        kind: "PASS_PHASE",
      });
      await route.fulfill({ json: { ...dto, revision: dto.revision + 1 } });
    },
  );
  await page.goto(`/matches/${dto.view.matchId}`);
  await expect(
    page.getByText("Using the text board.", { exact: false }),
  ).toBeVisible();
  const board = page.getByRole("region", { name: "Five-lane board" });
  await board.locator(".board-unit").first().click();
  await expect(
    page.getByRole("complementary", { name: "Selection details" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "End phase", exact: true }).click();
  await expect.poll(() => commands).toBe(1);
  await page.screenshot({ path: `${evidence}/portrait-fallback.png` });
  await page
    .getByRole("button", { name: "Retry artwork", exact: true })
    .click();
  await expect(page.locator('[data-arena-3d="ready"]')).toBeVisible();
  await expect(page.locator("canvas.battle-canvas")).toHaveCount(1);
  expect(commands).toBe(1);
});
