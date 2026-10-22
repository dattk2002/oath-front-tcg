import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { response } from "../../apps/web/tests/fixtures.js";
import type {
  PlayerView,
  PublicCatalog,
  UnitView,
  VisibleEvent,
} from "../../packages/contracts/src/index.js";
import type { BattleScene } from "../../apps/web/src/features/match/rendering/scene-state.js";
// Browser harness boundary: runtime functions are bundled below, while the
// NodeNext test project must not traverse the web project's bundler-only imports.
type PresentationController = {
  pause(): void;
  fastForward(view: PlayerView): void;
  dispose(): void;
};

type Harness = Window & {
  arenaModule: {
    createThreeBattleScene(
      canvas: HTMLCanvasElement,
      catalog: PublicCatalog,
      options: {
        quality: "low" | "high";
        reducedMotion: () => boolean;
        arenaKey: string;
      },
    ): BattleScene;
    createPresentationController(
      scene: BattleScene,
      options: {
        reducedMotion: () => boolean;
        getLatestView: () => PlayerView;
        onCursor: () => void;
      },
    ): PresentationController;
  };
  arenaRun: {
    scene: BattleScene;
    controller: PresentationController;
    latest: PlayerView;
  };
};
const unit = (id: string, laneId: UnitView["laneId"]): UnitView => ({
  instanceId: id,
  definitionId: "GC01",
  owner: "GOOD",
  laneId,
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
});
const cue = { progress: 0.5, alpha: 1, good: 0.7, evil: 0, reduced: false };
const signature = {
  sequence: 1,
  kind: "PowerUsed",
  payload: {
    side: "GOOD",
    definitionId: "S_G_BV",
    target: { kind: "HERO", side: "EVIL" },
  },
} as VisibleEvent;

test("paused fast-forward renders the settled current view and newly mounted targets without resuming motion", async ({
  page,
}) => {
  const bundle = await build({
    stdin: {
      contents:
        'export { createThreeBattleScene } from "./apps/web/src/features/match/rendering/three/scene.ts"; export { createPresentationController } from "./apps/web/src/features/match/motion/presentation-controller.ts";',
      resolveDir: process.cwd(),
      loader: "ts",
    },
    bundle: true,
    format: "iife",
    globalName: "arenaModule",
    platform: "browser",
    write: false,
  });
  await page.setContent(
    '<style>body{margin:0}[data-battle-root],.board{position:relative;width:1000px;height:600px}.battle-scene-layer{position:absolute;inset:0}[data-unit-id]{position:absolute;left:var(--project-x);top:var(--project-y);width:var(--project-width);height:var(--project-height)}</style><div data-battle-root><section class="board"><button data-unit-id="unit-a">6 HP</button></section><div class="battle-scene-layer"><canvas></canvas></div></div>',
  );
  await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
  const initial = response().view;
  initial.board[0]!.good = unit("unit-a", 1);
  await page.evaluate(async (view) => {
    const w = window as unknown as Harness;
    const scene = w.arenaModule.createThreeBattleScene(
      document.querySelector("canvas")!,
      { cards: [], tokens: [] } as unknown as PublicCatalog,
      {
        quality: "low",
        reducedMotion: () => false,
        arenaKey: "moonroot-conservatory",
      },
    );
    const run = (w.arenaRun = {
      scene,
      controller: null as unknown as PresentationController,
      latest: view,
    });
    run.controller = w.arenaModule.createPresentationController(scene, {
      reducedMotion: () => false,
      getLatestView: () => run.latest,
      onCursor: () => {},
    });
    scene.applyView(view);
    await scene.ready;
  }, initial);
  const snapshot = () =>
    page.evaluate(() => ({
      camera: document.querySelector("canvas")!.dataset.camera,
      targets: [
        ...document.querySelectorAll<HTMLElement>("[data-unit-id]"),
      ].map((el) => ({
        id: el.dataset.unitId,
        projected: el.dataset.projected,
        x: el.style.getPropertyValue("--project-x"),
        y: el.style.getPropertyValue("--project-y"),
        stats: el.textContent,
      })),
      presented: (window as unknown as Harness).arenaRun.scene
        .getView()
        ?.board.flatMap((l) => [l.good, l.evil])
        .filter(Boolean)
        .map((u) => ({
          id: u!.instanceId,
          lane: u!.laneId,
          hp: u!.current.hp,
        })),
    }));
  const base = await snapshot();
  await page.evaluate(
    ({ event, cue }) =>
      (window as unknown as Harness).arenaRun.scene.present(event, cue),
    { event: signature, cue },
  );
  expect((await snapshot()).camera).not.toBe(base.camera);
  const latest = structuredClone(initial);
  latest.board[0]!.good = null;
  latest.board[3]!.good = {
    ...unit("unit-a", 4),
    current: { attack: 4, hp: 3, maxHp: 6 },
  };
  latest.board[4]!.good = unit("unit-b", 5);
  await page.evaluate((view) => {
    const run = (window as unknown as Harness).arenaRun;
    run.controller.pause();
    run.latest = view;
    run.controller.fastForward(view);
    document.querySelector('[data-unit-id="unit-a"]')!.textContent = "3 HP";
    const node = document.createElement("button");
    node.dataset.unitId = "unit-b";
    node.textContent = "6 HP";
    document.querySelector(".board")!.append(node);
  }, latest);
  await expect.poll(async () => (await snapshot()).camera).toBe(base.camera);
  await expect(page.locator('[data-unit-id="unit-b"]')).toHaveAttribute(
    "data-projected",
    "true",
  );
  const settled = await snapshot();
  expect(settled.targets[0]!.x).not.toBe(base.targets[0]!.x);
  expect(settled.targets[0]!.stats).toBe("3 HP");
  expect(settled.presented).toEqual([
    { id: "unit-a", lane: 4, hp: 3 },
    { id: "unit-b", lane: 5, hp: 6 },
  ]);
  expect(parseFloat(settled.targets[1]!.x)).toBeGreaterThan(
    parseFloat(settled.targets[0]!.x),
  );
  await page.evaluate(
    ({ event, cue }) =>
      (window as unknown as Harness).arenaRun.scene.present(event, cue),
    { event: signature, cue },
  );
  await page.waitForTimeout(60);
  expect(await snapshot()).toEqual(settled);
  await page.evaluate(() =>
    (window as unknown as Harness).arenaRun.controller.dispose(),
  );
  await expect(page.locator("[data-battle-root]")).not.toHaveAttribute(
    "data-arena-3d",
    "ready",
  );
  await expect(page.locator('[data-unit-id="unit-b"]')).not.toHaveAttribute(
    "data-projected",
    "true",
  );
});
