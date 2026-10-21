import { afterEach, expect, it, vi } from "vitest";
import { createPresentationController } from "../src/features/match/motion/presentation-controller.js";
import {
  applyVisibleEvent,
  type BattleScene,
} from "../src/features/match/rendering/scene.js";
import type { PlayerView, VisibleEvent } from "@oathfront/contracts";
import { response } from "./fixtures.js";
import { gsap } from "gsap";
import { eventDuration } from "../src/features/match/motion/event-timeline.js";
import { createMatchViewStore } from "../src/features/match/view-store.js";
import { createIntentController } from "../src/features/match/intent-controller.js";

const batch: VisibleEvent = {
  eventId: "ev_damage",
  rootId: "rt_combat",
  sequence: 12,
  visibility: "PUBLIC",
  ownerSide: null,
  kind: "DamageBatchResolved",
  payload: {
    batchId: "pair-1",
    packets: [
      {
        source: { kind: "HERO", side: "EVIL" },
        target: { kind: "HERO", side: "GOOD" },
        damageType: "COMBAT",
        rawDamage: 3,
        mitigatedDamage: 0,
        finalDamage: 3,
        blocked: false,
        shieldConsumed: false,
        displayOrder: 1,
      },
      {
        source: { kind: "HERO", side: "GOOD" },
        target: { kind: "HERO", side: "EVIL" },
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
      { target: { kind: "HERO", side: "GOOD" }, before: 20, after: 17 },
      { target: { kind: "HERO", side: "EVIL" }, before: 20, after: 18 },
    ],
  },
};
const attack: VisibleEvent = {
  eventId: "ev_attack",
  rootId: "rt_combat",
  sequence: 11,
  kind: "AttackDeclared",
  visibility: "PUBLIC",
  ownerSide: null,
  payload: {
    batchId: "pair-1",
    attacks: [
      {
        sourceUnitId: "evil0001",
        side: "EVIL",
        laneId: 1,
        attack: 3,
        targets: [{ kind: "HERO", side: "GOOD" }],
        displayOrder: 1,
      },
      {
        sourceUnitId: "good0001",
        side: "GOOD",
        laneId: 1,
        attack: 2,
        targets: [{ kind: "HERO", side: "EVIL" }],
        displayOrder: 2,
      },
    ],
  },
};
function sceneDouble() {
  let view = response().view;
  const commits: number[] = [],
    hp: number[][] = [],
    batches: string[] = [],
    cues: { sequence: number; evil: number; good: number }[] = [];
  let resources = 0,
    disposed = 0;
  const scene: BattleScene = {
    ready: Promise.resolve(),
    getView: () => view,
    subscribe: () => () => {},
    applyView(next) {
      view = structuredClone(next);
    },
    commit(event) {
      view = applyVisibleEvent(view, event);
      commits.push(event.sequence);
      if (event.kind === "DamageBatchResolved") {
        batches.push(event.payload.batchId);
        hp.push([view.players.GOOD.hp, view.players.EVIL.hp]);
      }
    },
    present(event, cue) {
      cues.push({ sequence: event.sequence, evil: cue.evil, good: cue.good });
    },
    clearEffects() {},
    setPaused() {},
    dispose() {
      disposed = resources;
    },
  };
  resources += 3; // Renderer, generated texture pool and resize listener owned by this scene double.
  return {
    scene,
    commits,
    hp,
    batches,
    cues,
    counts: () => ({ created: resources, disposed }),
  };
}
const controllers: ReturnType<typeof createPresentationController>[] = [];
afterEach(() => {
  controllers.splice(0).forEach((c) => c.dispose());
  gsap.globalTimeline.clear();
});
function setup(reduced = false) {
  const fixture = sceneDouble();
  let checkpoint = applyVisibleEvent(response().view, batch);
  const cursors: number[] = [];
  const controller = createPresentationController(fixture.scene, {
    reducedMotion: () => reduced,
    getLatestView: () => checkpoint,
    onCursor: (s) => cursors.push(s),
    maxBacklogSeconds: Infinity,
  });
  controllers.push(controller);
  return {
    ...fixture,
    controller,
    cursors,
    setCheckpoint: (v: PlayerView) => {
      checkpoint = v;
    },
  };
}
async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 700));
}
it("commits both server HP values once on the shared beat, ordered after EVIL then GOOD windups", async () => {
  const f = setup();
  f.controller.enqueue([batch, attack, batch]);
  expect(f.hp).toEqual([]);
  await settle();
  expect(f.commits).toEqual([11, 12]);
  expect(f.batches).toEqual(["pair-1"]);
  expect(f.hp).toEqual([[17, 18]]);
  expect(
    f.cues.some((c) => c.sequence === 11 && c.evil > 0 && c.good === 0),
  ).toBe(true);
  expect(f.cursors).toEqual([11, 12]);
});
it("normal and reduced motion commit identical public event order and end view without gameplay callbacks", async () => {
  const normal = setup(),
    reduced = setup(true);
  normal.controller.enqueue([attack, batch]);
  reduced.controller.enqueue([attack, batch]);
  await settle();
  expect(normal.commits).toEqual(reduced.commits);
  expect(normal.scene.getView()).toEqual(reduced.scene.getView());
  expect(normal.scene.getView()?.players.GOOD.hp).toBe(17);
});
it("pause freezes commits; fast-forward kills callbacks and uses the latest public checkpoint", async () => {
  const f = setup();
  f.controller.enqueue([attack, batch]);
  f.controller.pause();
  await settle();
  expect(f.commits).toEqual([]);
  const latest = response(9).view;
  latest.players.GOOD.hp = 7;
  f.setCheckpoint(latest);
  f.controller.fastForward(latest);
  f.controller.resume();
  await settle();
  expect(f.scene.getView()?.players.GOOD.hp).toBe(7);
  expect(f.commits).toEqual([]);
  expect(f.cursors.at(-1)).toBe(12);
});
it("dispose mid-signature stops later commits and releases all owned scene resources once", async () => {
  const f = setup();
  const power: VisibleEvent = {
    eventId: "ev_power",
    rootId: "rt_power",
    sequence: 1,
    kind: "PowerUsed",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: {
      side: "GOOD",
      powerInstanceId: "power001",
      definitionId: "S_G_BV",
      target: { kind: "HERO", side: "EVIL" },
      energySpent: 1,
    },
  };
  f.controller.enqueue([power]);
  f.controller.dispose();
  f.controller.dispose();
  await settle();
  expect(f.commits).toEqual([]);
  expect(f.counts().disposed).toBe(f.counts().created);
});
it("backlog over two seconds skips cosmetics and reconciles current view without dropping the caller log", () => {
  const f = sceneDouble(),
    latest = response().view;
  latest.players.EVIL.hp = 5;
  const c = createPresentationController(f.scene, {
    reducedMotion: () => false,
    getLatestView: () => latest,
    onCursor: () => {},
  });
  controllers.push(c);
  const events: VisibleEvent[] = [1, 2, 3, 4].map((sequence) => ({
    ...batch,
    sequence,
    eventId: `ev_${sequence}`,
    kind: "LocationRevealed",
    payload: { laneId: 1, definitionId: "ancient_forest" },
  }));
  c.enqueue(events);
  expect(f.scene.getView()?.players.EVIL.hp).toBe(5);
  expect(f.commits).toEqual([]);
  expect(events).toHaveLength(4);
});

// WebGL and observers are external resources; exercise the actual scene owner's release paths.
const resources = vi.hoisted(() => ({
  created: new Set<object>(),
  disposed: new Set<object>(),
  gate: null as Promise<void> | null,
  failTexture: false,
  dims: [] as number[],
}));
vi.mock("pixi.js/unsafe-eval", () => ({}));
vi.mock("pixi.js", () => {
  const tracked = () => {
    const id = {};
    resources.created.add(id);
    return () => resources.disposed.add(id);
  };
  class Graphics {
    destroy = tracked();
    screenDim = false;
    circle() {
      return this;
    }
    fill(value?: unknown) {
      if (
        this.screenDim &&
        typeof value === "object" &&
        value !== null &&
        "alpha" in value &&
        typeof value.alpha === "number"
      )
        resources.dims.push(value.alpha);
      return this;
    }
    poly() {
      return this;
    }
    roundRect() {
      return this;
    }
    stroke() {
      return this;
    }
    clear() {
      this.screenDim = false;
      return this;
    }
    rect() {
      this.screenDim = true;
      return this;
    }
    moveTo() {
      return this;
    }
    lineTo() {
      return this;
    }
  }
  class Application {
    release = tracked();
    screen = { width: 800, height: 600 };
    stage = {
      eventMode: "none",
      children: [] as Graphics[],
      addChild: (...items: Graphics[]) => this.stage.children.push(...items),
      addChildAt: (item: Graphics) => this.stage.children.push(item),
    };
    renderer = {
      generateTexture: () => {
        if (resources.failTexture && resources.created.size > 4)
          throw new Error("texture allocation failed");
        return { destroy: tracked() };
      },
      resize: (width: number, height: number) => {
        this.screen = { width, height };
      },
    };
    async init() {
      if (resources.gate) await resources.gate;
    }
    render() {}
    stop() {}
    destroy() {
      this.stage.children.forEach((g) => g.destroy());
      this.release();
    }
  }
  class Text {
    destroy = tracked();
    anchor = { set() {} };
    position = { set() {} };
  }
  return { Application, Graphics, Text, Rectangle: class {} };
});
function resourceEnvironment(withHeroes = false) {
  resources.created.clear();
  resources.disposed.clear();
  resources.gate = null;
  resources.failTexture = false;
  resources.dims = [];
  class Observer {
    release = (() => {
      const id = {};
      resources.created.add(id);
      return () => resources.disposed.add(id);
    })();
    observe() {}
    disconnect() {
      this.release();
    }
  }
  vi.stubGlobal("ResizeObserver", Observer);
  vi.stubGlobal("MutationObserver", Observer);
  vi.stubGlobal("window", { devicePixelRatio: 1 });
  const root = {
    querySelector: () =>
      withHeroes
        ? {
            getBoundingClientRect: () => ({
              x: 40,
              y: 40,
              width: 80,
              height: 80,
            }),
          }
        : null,
    getBoundingClientRect: () => ({ width: 800, height: 600 }),
  };
  return {
    parentElement: root,
    closest: () => root,
  } as unknown as HTMLCanvasElement;
}
it("actual scene disposal releases generated textures, renderer and observers, including early disposal during init", async () => {
  const canvas = resourceEnvironment();
  const { createBattleScene } =
    await import("../src/features/match/rendering/scene.js");
  const scene = createBattleScene(canvas, { kind: "PLACEHOLDER" });
  scene.applyView(response().view);
  await scene.ready;
  expect(resources.created.size).toBeGreaterThan(20);
  scene.dispose();
  scene.dispose();
  expect(resources.disposed.size).toBe(resources.created.size);
  const earlyCanvas = resourceEnvironment();
  let finish!: () => void;
  resources.gate = new Promise((resolve) => {
    finish = resolve;
  });
  const early = createBattleScene(earlyCanvas, { kind: "PLACEHOLDER" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  early.dispose();
  finish();
  await early.ready;
  expect(resources.disposed.size).toBe(resources.created.size);
  vi.unstubAllGlobals();
});
it("HP projection uses explicit server after values; death removes a unit only on the later death event", () => {
  const view = response().view;
  const unit = {
    instanceId: "good0001",
    definitionId: "GC01" as const,
    owner: "GOOD" as const,
    laneId: 1,
    isToken: false,
    printed: { attack: 2, hp: 3, maxHp: 3 },
    current: { attack: 2, hp: 3, maxHp: 3 },
    statuses: {
      armor: 0,
      shield: false,
      poisoned: false,
      stunned: false,
      exhausted: false,
      pierce: false,
    },
    modifiers: [],
    lastRegularAttackTurn: null,
  };
  view.board[0].good = unit;
  const hit: VisibleEvent = {
    ...batch,
    payload: {
      ...batch.payload,
      hpChanges: [
        {
          target: { kind: "UNIT", instanceId: "good0001" },
          before: 3,
          after: 0,
        },
      ],
    },
  };
  const hitView = applyVisibleEvent(view, hit);
  expect(hitView.board[0].good?.current.hp).toBe(0);
  expect(view.board[0].good.current.hp).toBe(3);
  const death: VisibleEvent = {
    eventId: "ev_death",
    rootId: "rt_combat",
    sequence: 13,
    kind: "UnitDestroyed",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: {
      instanceId: "good0001",
      definitionId: "GC01",
      owner: "GOOD",
      laneId: 1,
      isToken: false,
    },
  };
  expect(applyVisibleEvent(hitView, death).board[0].good).toBeNull();
});

it("play/draw context avoids duplicate UNIT/count animations and gives lane TRICKs an effect beat", () => {
  const play: VisibleEvent = {
    eventId: "play",
    rootId: "root",
    sequence: 1,
    kind: "CardPlayed",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: {
      side: "GOOD",
      cardInstanceId: "card0001",
      definitionId: "GC01",
      target: { kind: "LANE", laneId: 1 },
      energySpent: 1,
    },
  };
  const context = { ownSide: "GOOD" as const, unitCardIds: new Set(["GC01"]) };
  expect(eventDuration(play, false, context)).toBe(0);
  expect(
    eventDuration(
      { ...play, payload: { ...play.payload, definitionId: "GC06" } },
      false,
      context,
    ),
  ).toBe(0.1);
  const count: VisibleEvent = {
    eventId: "count",
    rootId: "root",
    sequence: 2,
    kind: "HandCountChanged",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: { side: "GOOD", handCount: 2, deckCount: 25 },
  };
  expect(eventDuration(count, false, context)).toBe(0);
  expect(
    eventDuration(
      { ...count, payload: { ...count.payload, side: "EVIL" } },
      false,
      context,
    ),
  ).toBe(0.22);
});
it("presentation completion can update the cursor without submitting any gameplay commands", async () => {
  const initial = response(),
    store = createMatchViewStore(initial),
    gameplayCommandsFromTimeline: unknown[] = [];
  createIntentController(store, {
    makeId: () => "command",
    send: async (command) => {
      gameplayCommandsFromTimeline.push(command);
      return response(2);
    },
  });
  const f = sceneDouble(),
    controller = createPresentationController(f.scene, {
      getLatestView: () => store.getSnapshot().authoritativeView,
      reducedMotion: () => true,
      onCursor: (seq) => store.setPresentationCursor(seq),
    });
  controllers.push(controller);
  initial.events = [attack, batch];
  initial.latestSeq = 12;
  store.acceptResponse(initial);
  controller.enqueue(store.getSnapshot().events);
  await settle();
  expect(store.getSnapshot().presentationCursor).toBe(12);
  expect(gameplayCommandsFromTimeline).toHaveLength(0);
});

it("failed initialization releases already-created placeholder textures and graphics", async () => {
  const canvas = resourceEnvironment();
  resources.failTexture = true;
  const { createBattleScene } =
    await import("../src/features/match/rendering/scene.js");
  const scene = createBattleScene(canvas, { kind: "PLACEHOLDER" });
  await expect(scene.ready).rejects.toThrow("texture allocation failed");
  scene.dispose();
  expect(resources.disposed.size).toBe(resources.created.size);
  vi.unstubAllGlobals();
});

it.each(["COMPLETED", "ABANDONED"] as const)(
  "terminal %s view retains the board dim after cosmetic cleanup",
  async (lifecycle) => {
    const canvas = resourceEnvironment();
    const { createBattleScene } =
      await import("../src/features/match/rendering/scene.js");
    const scene = createBattleScene(canvas, { kind: "PLACEHOLDER" });
    await scene.ready;
    const view = response().view;
    view.lifecycle = lifecycle;
    view.outcome = { result: "WIN", winner: "GOOD", reason: "SURRENDER" };
    scene.applyView(view);
    scene.clearEffects();
    scene.dispose();
    vi.unstubAllGlobals();
    expect(resources.dims.at(-1)).toBe(0.22);
  },
);

it("damage labels are bounded per packet and released on fast-forward cleanup and disposal", async () => {
  const canvas = resourceEnvironment(true);
  const { createBattleScene } =
    await import("../src/features/match/rendering/scene.js");
  const scene = createBattleScene(canvas, { kind: "PLACEHOLDER" });
  scene.applyView(response().view);
  await scene.ready;
  const before = resources.created.size;
  scene.present(batch, {
    progress: 0.5,
    alpha: 1,
    evil: 0,
    good: 0,
    reduced: false,
  });
  scene.present(batch, {
    progress: 0.6,
    alpha: 1,
    evil: 0,
    good: 0,
    reduced: false,
  });
  expect(resources.created.size - before).toBe(2);
  const disposed = resources.disposed.size;
  scene.clearEffects();
  expect(resources.disposed.size - disposed).toBe(2);
  scene.dispose();
  expect(resources.disposed.size).toBe(resources.created.size);
  vi.unstubAllGlobals();
});
