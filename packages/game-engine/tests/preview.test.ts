import { it, expect } from "vitest";
import { previewPublicAction } from "../src/preview.js";
import { projectPlayerView } from "../src/projection.js";
import { advanceAutomatic } from "../src/automatic.js";
import { applyAction } from "../src/actions.js";
import { ready, card, unit } from "./helpers.js";
it("known damage, heal, draw and card/energy metrics match the engine without guessing drawn identities", () => {
  const s = ready();
  s.phase = "GOOD_PLAY";
  s.activeSide = "GOOD";
  s.players.GOOD.hp = 10;
  const id = card(s, "GC06", "GOOD");
  const a = {
    kind: "PLAY_TRICK" as const,
    cardInstanceId: id,
    target: { kind: "NONE" as const },
  };
  const v = projectPlayerView(s, "GOOD");
  const preview = previewPublicAction(v, a);
  expect(preview.legal).toBe(true);
  expect(preview.effectiveOwnHeroHeal).toBe(0);
  expect(preview.energySpent).toBe(3);
  expect(preview.netCardsGained).toBe(1);
  expect(preview.unknowns).toContain("DRAW");
  expect(preview.unknownDraws.GOOD).toBe(2);
  expect(JSON.stringify(preview)).not.toContain(
    s.players.GOOD.deck[0]!.instanceId,
  );
  const r = applyAction(s, { actor: "GOOD", action: a });
  expect(r.kind).toBe("transition");
  if (r.kind === "transition")
    expect(preview.players.GOOD.hp).toBe(r.nextState.players.GOOD.hp);
});
it("unit entry, on-play, movement and board scoring use visible state only", () => {
  const s = ready();
  const id = card(s, "EC01", "EVIL");
  s.board[0]!.location = {
    state: "ACTIVE",
    definitionId: "ancient_forest",
    revealTurn: 1,
  };
  const a = { kind: "PLAY_UNIT" as const, cardInstanceId: id, laneId: 1 };
  const p = previewPublicAction(projectPlayerView(s, "EVIL"), a);
  const r = applyAction(s, { actor: "EVIL", action: a });
  expect(p.legal).toBe(true);
  if (r.kind === "transition")
    expect(p.board[0]!.evil?.current).toEqual(
      r.nextState.board[0]!.evil?.current,
    );
  expect(p.deltaBoardValue).toBeGreaterThan(0);
});
it("identical public views produce identical previews and illegal actions cannot mutate views", () => {
  const s = ready();
  unit(s, "GC01", "GOOD", 1);
  const v = projectPlayerView(s, "GOOD"),
    before = structuredClone(v);
  const p = previewPublicAction(v, {
    kind: "PLAY_UNIT",
    cardInstanceId: "f".repeat(32),
    laneId: 1,
  });
  expect(p.legal).toBe(false);
  expect(v).toEqual(before);
  expect(p).toEqual(
    previewPublicAction(structuredClone(v), {
      kind: "PLAY_UNIT",
      cardInstanceId: "f".repeat(32),
      laneId: 1,
    }),
  );
});
it("combat snapshots both attackers before either dies and runs corpse cascades", () => {
  const s = ready();
  s.phase = "EVIL_TRICKS";
  const e = unit(s, "EC04", "EVIL", 2),
    g = unit(s, "GC04", "GOOD", 2);
  e.current.attack = 3;
  e.current.hp = 1;
  g.current.attack = 3;
  g.current.hp = 1;
  s.players.GOOD.hp = 10;
  const p = previewPublicAction(projectPlayerView(s, "EVIL"), {
    kind: "PASS_PHASE",
  });
  expect(p.board[1]!.evil).toBeNull();
  expect(p.board[1]!.good).toBeNull();
  expect(p.players.GOOD.hp).toBe(11);
});
it("limited historical triggers are uncertain and independent of private counters", () => {
  const s = ready();
  s.phase = "GOOD_PLAY";
  s.activeSide = "GOOD";
  const x = unit(s, "X03", "EVIL", 2);
  x.current.hp = 10;
  x.current.maxHp = 10;
  const id = card(s, "GC05", "GOOD");
  const a = {
    kind: "PLAY_TRICK" as const,
    cardInstanceId: id,
    target: { kind: "UNIT" as const, instanceId: x.instanceId },
  };
  const b = structuredClone(s);
  b.turnCounters[x.instanceId + ":X03:ON_DAMAGED"] = 1;
  const p = previewPublicAction(projectPlayerView(s, "GOOD"), a);
  expect(p).toEqual(previewPublicAction(projectPlayerView(b, "GOOD"), a));
  expect(p.unknowns).toContain("TRIGGER_HISTORY");
  expect(p.immediateWin).toBe(false);
  expect(p.immediateLoss).toBe(false);
});
it("effective hero healing is capped and reports known-only metrics", () => {
  const s = ready();
  s.phase = "GOOD_PLAY";
  s.players.GOOD.hp = 19;
  const id = card(s, "V07", "GOOD");
  const p = previewPublicAction(projectPlayerView(s, "GOOD"), {
    kind: "PLAY_TRICK",
    cardInstanceId: id,
    target: { kind: "NONE" },
  });
  expect(p.effectiveOwnHeroHeal).toBe(1);
  expect(p.players.GOOD.hp).toBe(20);
});
it("resuming AFTER_LANE forecasts Volcano without replaying the resolved pair", () => {
  const s = ready();
  s.phase = "COMBAT";
  s.activeSide = null;
  s.continuation = { laneId: 1, stage: "AFTER_LANE", pendingResponders: [] };
  s.board[0]!.location = {
    state: "ACTIVE",
    definitionId: "volcano",
    revealTurn: 1,
  };
  const g = unit(s, "GC01", "GOOD", 1);
  g.lastRegularAttackTurn = null;
  const p = previewPublicAction(projectPlayerView(s, "GOOD"), {
    kind: "ADVANCE",
  });
  expect(p.enemyHeroDamage).toBe(0);
  expect(p.board[0]!.good!.current.hp).toBe(g.current.hp - 1);
});
it("new block power remains an explicit unknown count and private power RNG cannot change its preview", () => {
  const s = ready();
  s.phase = "EVIL_TRICKS";
  s.activeSide = "EVIL";
  unit(s, "EC01", "EVIL", 1);
  s.players.GOOD.block.charge = 6;
  const b = structuredClone(s);
  b.random.states["power:good"] = [1, 2, 3, 4];
  const a = { kind: "PASS_PHASE" as const };
  const p = previewPublicAction(projectPlayerView(s, "EVIL"), a);
  expect(p).toEqual(previewPublicAction(projectPlayerView(b, "EVIL"), a));
  expect(p.unknowns).toContain("POWER_GRANT");
  expect(p.uncertainty).toBe(true);
  expect(p.players.GOOD.reserveCount).toBe(s.players.GOOD.reserve.length + 1);
  expect(p.immediateWin).toBe(false);
  expect(Object.hasOwn(p, "reserve")).toBe(false);
});
it("separates legality from forecast capability for lifecycle, setup and noncombat automatic actions", () => {
  const s = ready();
  s.phase = "TURN_END";
  s.activeSide = null;
  const v = projectPlayerView(s, s.humanSide);
  for (const action of [
    { kind: "ADVANCE" },
    { kind: "PAUSE" },
    { kind: "SURRENDER" },
  ] as const) {
    const p = previewPublicAction(v, action);
    expect(p.legal).toBe(true);
    expect(p.forecast).toBe("NONE");
    expect(p.board).toEqual(v.board);
  }
  const e = ready();
  const id = card(e, "EC01", "EVIL");
  expect(
    previewPublicAction(projectPlayerView(e, "EVIL"), {
      kind: "PLAY_UNIT",
      cardInstanceId: id,
      laneId: 1,
    }).forecast,
  ).toBe("ACTION");
  e.phase = "EVIL_TRICKS";
  expect(
    previewPublicAction(projectPlayerView(e, "EVIL"), { kind: "PASS_PHASE" })
      .forecast,
  ).toBe("CURRENT_COMBAT");
});

it("B04 healing history stays private and suppresses a certain win when the unknown heal could save its hero", () => {
  const unused = ready();
  unused.phase = "EVIL_TRICKS";
  unused.activeSide = "EVIL";
  unused.players.GOOD.hp = 1;
  const defender = unit(unused, "B04", "GOOD", 1);
  unit(unused, "EC01", "EVIL", 1).current.attack = 1;
  unit(unused, "EC01", "EVIL", 2).current.attack = 1;
  const used = structuredClone(unused);
  used.turnCounters[defender.instanceId + ":B04:ON_DAMAGED"] = 1;
  const action = { kind: "PASS_PHASE" as const };
  const unusedView = projectPlayerView(unused, "EVIL");
  const usedView = projectPlayerView(used, "EVIL");
  expect(unusedView).toEqual(usedView);
  const preview = previewPublicAction(unusedView, action);
  expect(preview).toEqual(previewPublicAction(usedView, action));
  expect(preview.legal).toBe(true);
  expect(preview.unknowns).toContain("TRIGGER_HISTORY");
  expect(preview.uncertainty).toBe(true);
  // The known-only branch is lethal, but B04's unobserved heal can avert that result.
  expect(preview.players.GOOD.hp).toBe(0);
  expect(preview.immediateWin).toBe(false);
  expect(preview.immediateLoss).toBe(false);
  const afterCombat = (state: typeof unused) => {
    const passed = applyAction(state, { actor: "EVIL", action });
    if (passed.kind !== "transition") throw new Error(passed.code);
    return advanceAutomatic(passed.nextState, { maxRoots: 8 }).nextState;
  };
  expect(afterCombat(unused).players.GOOD.hp).toBe(1);
  expect(afterCombat(used).players.GOOD.hp).toBe(0);
});
