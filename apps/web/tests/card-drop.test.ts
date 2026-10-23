import type { ArenaHit } from "../src/features/match/rendering/arena-interaction";
import { describe, expect, it } from "vitest";
import type { PlayerAction, UnitView } from "@oathfront/contracts";
import { response } from "./fixtures";
import {
  allowedDropHits,
  resolveCardDrop,
  dragSnapshotValid,
} from "../src/features/match/card-drop";
import { dragGesture } from "../src/features/match/drag";

const unit = {
  instanceId: "unit0001",
  definitionId: "GC01",
  owner: "GOOD",
  laneId: 2,
} as UnitView;
function trick(
  target: Extract<PlayerAction, { kind: "PLAY_TRICK" }>["target"],
) {
  const view = response().view;
  view.self.hand[0]!.definitionId = "GC02";
  view.legalActions = [
    { kind: "PLAY_TRICK", cardInstanceId: "card0001", target },
  ];
  return view;
}
describe("authoritative direct drops", () => {
  it("resolves the exact legal unit action only for its empty friendly slot", () => {
    const view = response().view;
    const hit = { kind: "SLOT", side: "GOOD", laneId: 1 } as const;
    expect(allowedDropHits(view, "card0001")).toEqual([hit]);
    expect(resolveCardDrop(view, 1, "card0001", hit)).toEqual({
      kind: "SUBMIT",
      action: view.legalActions[0],
    });
    expect(
      resolveCardDrop(view, 1, "card0001", { ...hit, side: "EVIL" }),
    ).toBeNull();
    expect(
      resolveCardDrop(view, 1, "card0001", { ...hit, laneId: 2 }),
    ).toBeNull();
    view.board[0]!.good = unit;
    expect(resolveCardDrop(view, 1, "card0001", hit)).toBeNull();
  });
  it.each([
    [
      { kind: "UNIT", instanceId: "unit0001" },
      { kind: "UNIT", instanceId: "unit0001" },
    ],
    [
      { kind: "HERO", side: "EVIL" },
      { kind: "HERO", side: "EVIL" },
    ],
    [
      { kind: "LANE", laneId: 3 },
      { kind: "LANE", laneId: 3 },
    ],
    [{ kind: "NONE" }, { kind: "CAST" }],
  ] as const)(
    "submits a trick on its exact semantic destination %j",
    (target, hit) => {
      const view = trick(target);
      expect(resolveCardDrop(view, 1, "card0001", hit)).toEqual({
        kind: "SUBMIT",
        action: view.legalActions[0],
      });
      expect(
        resolveCardDrop(view, 1, "card0001", {
          kind: "SLOT",
          side: "EVIL",
          laneId: 5,
        }),
      ).toBeNull();
    },
  );
  it("does not submit combined movement until the selected unit reaches a permitted destination", () => {
    const view = trick({
      kind: "UNIT_AND_LANE",
      instanceId: "unit0001",
      laneId: 4,
    });
    view.board[1]!.good = unit;
    const first = resolveCardDrop(view, 7, "card0001", {
      kind: "UNIT",
      instanceId: "unit0001",
    });
    expect(first?.kind).toBe("MOVE");
    if (first?.kind !== "MOVE") throw new Error("Expected pending move");
    expect(first.pending.revision).toBe(7);
    expect(allowedDropHits(view, "card0001", first.pending)).toEqual([
      { kind: "SLOT", side: "GOOD", laneId: 4 },
    ]);
    expect(
      resolveCardDrop(
        view,
        7,
        "card0001",
        { kind: "SLOT", side: "GOOD", laneId: 4 },
        first.pending,
      ),
    ).toEqual({ kind: "SUBMIT", action: view.legalActions[0] });
    expect(
      resolveCardDrop(
        view,
        8,
        "card0001",
        { kind: "SLOT", side: "GOOD", laneId: 4 },
        first.pending,
      ),
    ).toBeNull();
  });
  it("invalidates revision, source removal, disabled state and changed legality", () => {
    const view = response().view;
    const stamp = {
      revision: 1,
      sourceCard: "card0001",
      actions: JSON.stringify(
        view.legalActions.filter((a) => "cardInstanceId" in a),
      ),
    };
    expect(dragSnapshotValid(view, 1, false, stamp)).toBe(true);
    expect(dragSnapshotValid(view, 2, false, stamp)).toBe(false);
    expect(dragSnapshotValid(view, 1, true, stamp)).toBe(false);
    view.legalActions = [];
    expect(dragSnapshotValid(view, 1, false, stamp)).toBe(false);
    view.self.hand = [];
    expect(resolveCardDrop(view, 1, "card0001", { kind: "CAST" })).toBeNull();
  });
});
describe("native hand gestures", () => {
  it("preserves horizontal touch scrolling and activates only a deliberate upward drag", () => {
    expect(dragGesture("touch", 0, 0, 30, -3)).toBe("SCROLL");
    expect(dragGesture("touch", 0, 0, 3, -15)).toBe("DRAG");
    expect(dragGesture("touch", 0, 0, 2, 18)).toBe("WAIT");
    expect(dragGesture("touch", 0, 0, 1, -4)).toBe("WAIT");
    expect(dragGesture("mouse", 0, 0, 6, 0)).toBe("DRAG");
  });
});

import { createIntentController } from "../src/features/match/intent-controller";
import { createMatchViewStore } from "../src/features/match/view-store";
import { submitCardDrop } from "../src/features/match/card-drop";
import { vi } from "vitest";

it("prepares a drag without opening inspection and submits one exact command only", async () => {
  const dto = response();
  dto.latestSeq = 4;
  const store = createMatchViewStore(dto);
  const send = vi.fn<(envelope: unknown) => Promise<ReturnType<typeof response>>>(
    () => new Promise(() => {}),
  );
  const fastForward = vi.fn();
  const controller = createIntentController(store, {
    send,
    fastForward,
    makeId: () => "drag-command",
  });
  expect(controller.prepareDrag()).toBe(true);
  expect(fastForward).toHaveBeenCalledOnce();
  expect(store.getSnapshot().selection).toBeNull();
  expect(store.getSnapshot().presentationCursor).toBe(4);
  const stamp = {
    sourceCard: "card0001",
    revision: 1,
    actions: JSON.stringify(
      dto.view.legalActions.filter((action) => "cardInstanceId" in action),
    ),
  };
  const result = resolveCardDrop(dto.view, 1, "card0001", {
    kind: "SLOT",
    side: "GOOD",
    laneId: 1,
  });
  expect(submitCardDrop(controller, stamp, result, false)).toBe(true);
  expect(submitCardDrop(controller, stamp, result, false)).toBe(false);
  expect(send).toHaveBeenCalledOnce();
  expect(send.mock.calls[0]?.[0]).toEqual({
    commandId: "drag-command",
    expectedRevision: 1,
    action: dto.view.legalActions[0],
  });
  expect(
    store.getSnapshot().authoritativeView.players.GOOD.energy.current,
  ).toBe(1);
});
it("sends no command for invalid, disabled, incomplete or stale drops", () => {
  const dto = response();
  const store = createMatchViewStore(dto);
  const send = vi.fn(async () => response(2));
  const controller = createIntentController(store, {
    send,
    makeId: () => "drag-command",
  });
  const stamp = {
    sourceCard: "card0001",
    revision: 1,
    actions: JSON.stringify(
      dto.view.legalActions.filter((action) => "cardInstanceId" in action),
    ),
  };
  const result = resolveCardDrop(dto.view, 1, "card0001", {
    kind: "SLOT",
    side: "GOOD",
    laneId: 1,
  });
  expect(submitCardDrop(controller, stamp, null, false)).toBe(false);
  expect(submitCardDrop(controller, stamp, result, true)).toBe(false);
  expect(
    submitCardDrop(
      controller,
      stamp,
      {
        kind: "MOVE",
        pending: {
          sourceCard: dto.view.self.hand[0]!,
          selectedUnit: "unit0001",
          revision: 1,
          allowedDestinations: [2],
        },
      },
      false,
    ),
  ).toBe(false);
  store.acceptResponse(response(2));
  expect(submitCardDrop(controller, stamp, result, false)).toBe(false);
  expect(send).not.toHaveBeenCalled();
});

import { afterEach } from "vitest";
import { pickCardDrop } from "../src/features/match/drag";
afterEach(() => vi.unstubAllGlobals());
it("does not raycast through an open inspector and prioritizes a DOM hero", () => {
  const pick = vi.fn((): ArenaHit[] => [
    { kind: "SLOT", side: "GOOD", laneId: 1 },
  ]);
  const root = { contains: () => true } as unknown as HTMLElement;
  const surface = {
    pick,
    setDragPreview() {},
    holdCamera() {},
    clearInteraction() {},
  };
  const view = response().view;
  const args = {
    x: 100,
    y: 100,
    root,
    surface,
    allowedHits: [{ kind: "SLOT", side: "GOOD", laneId: 1 }] as const,
    view,
    source: "card0001",
    pending: null,
  };
  vi.stubGlobal("document", {
    querySelector: () => null,
    elementFromPoint: () => ({
      closest: (selector: string) =>
        selector.includes(".inspect") ? {} : null,
    }),
  });
  expect(pickCardDrop(args)).toBeNull();
  expect(pick).not.toHaveBeenCalled();
  vi.stubGlobal("document", {
    querySelector: () => null,
    elementFromPoint: () => ({
      closest: (selector: string) =>
        selector === "[data-target]"
          ? {
              dataset: {
                target: JSON.stringify({ kind: "HERO", side: "EVIL" }),
              },
            }
          : null,
    }),
  });
  expect(pickCardDrop(args)).toEqual({ kind: "HERO", side: "EVIL" });
  expect(pick).not.toHaveBeenCalled();
});
it("queries only allowed ray hits when no screen-space control blocks the table", () => {
  const pick = vi.fn((): ArenaHit[] => [{ kind: "CAST" }]);
  vi.stubGlobal("document", {
    querySelector: () => null,
    elementFromPoint: () => ({ closest: () => null }),
  });
  const hits = [{ kind: "CAST" }] as const;
  expect(
    pickCardDrop({
      x: 123,
      y: 234,
      root: { contains: () => true } as unknown as HTMLElement,
      surface: {
        pick,
        setDragPreview() {},
        holdCamera() {},
        clearInteraction() {},
      },
      allowedHits: hits,
      view: response().view,
      source: "card0001",
      pending: null,
    }),
  ).toEqual({ kind: "CAST" });
  expect(pick).toHaveBeenCalledWith(123, 234, hits);
});

it.each(["GOOD", "EVIL"] as const)(
  "moves an enemy unit on its owner's row when self is %s",
  (self) => {
    const view = trick({
      kind: "UNIT_AND_LANE",
      instanceId: "enemy-unit",
      laneId: 4,
    });
    view.self.side = self;
    view.self.hand[0]!.definitionId = "S07";
    const owner = self === "GOOD" ? "EVIL" : "GOOD";
    view.board[1]![owner === "GOOD" ? "good" : "evil"] = {
      ...unit,
      instanceId: "enemy-unit",
      owner,
      laneId: 2,
    };
    view.board[3]![self === "GOOD" ? "good" : "evil"] = {
      ...unit,
      instanceId: "friendly-occupant",
      owner: self,
      laneId: 4,
    };
    const first = resolveCardDrop(view, 3, "card0001", {
      kind: "UNIT",
      instanceId: "enemy-unit",
    });
    expect(first?.kind).toBe("MOVE");
    if (first?.kind !== "MOVE") throw new Error("Expected pending enemy move");
    expect(allowedDropHits(view, "card0001", first.pending)).toEqual([
      { kind: "SLOT", side: owner, laneId: 4 },
    ]);
    vi.stubGlobal("document", {
      querySelector: () => null,
      elementFromPoint: () => ({
        closest: (selector: string) =>
          selector === "[data-target]"
            ? {
                dataset: {
                  target: JSON.stringify({ kind: "LANE", laneId: 4 }),
                },
              }
            : null,
      }),
    });
    expect(
      pickCardDrop({
        x: 10,
        y: 20,
        root: { contains: () => true } as unknown as HTMLElement,
        surface: null,
        allowedHits: [],
        view,
        source: "card0001",
        pending: first.pending,
      }),
    ).toEqual({ kind: "SLOT", side: owner, laneId: 4 });
    expect(
      resolveCardDrop(
        view,
        3,
        "card0001",
        { kind: "SLOT", side: owner, laneId: 4 },
        first.pending,
      ),
    ).toEqual({ kind: "SUBMIT", action: view.legalActions[0] });
    expect(
      resolveCardDrop(
        view,
        3,
        "card0001",
        { kind: "SLOT", side: self, laneId: 4 },
        first.pending,
      ),
    ).toBeNull();
  },
);

import { createDragClickGuard } from "../src/features/match/drag";
it("never swallows keyboard activation after a cancelled or completed drag", () => {
  const guard = createDragClickGuard();
  guard.suppress();
  guard.reset();
  expect(guard.consume(0)).toBe(false);
  guard.suppress();
  expect(guard.consume(0)).toBe(false);
  expect(guard.consume(1)).toBe(false);
  guard.suppress();
  expect(guard.consume(1)).toBe(true);
  expect(guard.consume(1)).toBe(false);
});

it.each(["GOOD", "EVIL"] as const)(
  "retains allied movement on the selected owner's row for self %s",
  (self) => {
    const view = trick({
      kind: "UNIT_AND_LANE",
      instanceId: "allied-unit",
      laneId: 4,
    });
    view.self.side = self;
    view.board[1]![self === "GOOD" ? "good" : "evil"] = {
      ...unit,
      instanceId: "allied-unit",
      owner: self,
      laneId: 2,
    };
    const first = resolveCardDrop(view, 3, "card0001", {
      kind: "UNIT",
      instanceId: "allied-unit",
    });
    if (first?.kind !== "MOVE") throw new Error("Expected pending allied move");
    expect(allowedDropHits(view, "card0001", first.pending)).toEqual([
      { kind: "SLOT", side: self, laneId: 4 },
    ]);
    expect(
      resolveCardDrop(
        view,
        3,
        "card0001",
        { kind: "SLOT", side: self, laneId: 4 },
        first.pending,
      ),
    ).toEqual({ kind: "SUBMIT", action: view.legalActions[0] });
    expect(
      resolveCardDrop(
        view,
        3,
        "card0001",
        { kind: "SLOT", side: self === "GOOD" ? "EVIL" : "GOOD", laneId: 4 },
        first.pending,
      ),
    ).toBeNull();
  },
);
