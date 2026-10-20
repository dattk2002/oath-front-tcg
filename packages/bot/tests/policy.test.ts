import { it, expect } from "vitest";
import { projectPlayerView } from "@oathfront/game-engine";
import { ready, card, unit } from "../../game-engine/tests/helpers.js";
import { chooseBotAction } from "../src/policy.js";
import { evaluateAction } from "../src/evaluate.js";
import type { BotContext } from "../src/model.js";
const context: BotContext = {
  difficulty: "NORMAL",
  randomState: [1, 2, 3, 4],
  observationMemory: [],
};
function view() {
  const state = ready();
  state.phase = "GOOD_PLAY";
  state.activeSide = "GOOD";
  state.players.GOOD.hand = [];
  return state;
}
it("plays a profitable legal unit, breaks equal ties by lane, and never considers surrender or lifecycle controls", () => {
  const state = view();
  const id = card(state, "GC01", "GOOD");
  const v = projectPlayerView(state, "GOOD");
  const decision = chooseBotAction(v, [...v.legalActions].reverse(), context);
  expect(decision.action).toEqual({
    kind: "PLAY_UNIT",
    cardInstanceId: id,
    laneId: 1,
  });
  expect(v.legalActions).toContainEqual(decision.action);
  expect(decision.nextBotRandomState).toEqual(context.randomState);
  expect(chooseBotAction(v, v.legalActions, context)).toEqual(decision);
});
it("uses the exact DECKS score and keeps PASS as fallback instead of comparing its combat forecast", () => {
  const state = view();
  const id = card(state, "GC01", "GOOD");
  const v = projectPlayerView(state, "GOOD");
  // GC01 is 1 ATK/2 HP, costs1, and spends one card:3.6 -1.2 -0.35=2.05.
  expect(
    evaluateAction(v, { kind: "PLAY_UNIT", cardInstanceId: id, laneId: 1 })
      .score,
  ).toBeCloseTo(2.05);
  state.phase = "EVIL_TRICKS";
  state.activeSide = "EVIL";
  state.players.EVIL.hand = [];
  unit(state, "EC01", "EVIL", 1);
  const ev = projectPlayerView(state, "EVIL");
  expect(chooseBotAction(ev, ev.legalActions, context).action).toEqual({
    kind: "PASS_PHASE",
  });
});
it("does not spend energy for an unprofitable heal and falls back to pass", () => {
  const state = view();
  card(state, "V07", "GOOD");
  const v = projectPlayerView(state, "GOOD");
  expect(chooseBotAction(v, v.legalActions, context).action).toEqual({
    kind: "PASS_PHASE",
  });
});
it("mulligans for one cost1 and one cost2 unit plus one cheap removal, consistently at both difficulties", () => {
  const state = view();
  state.phase = "MULLIGAN";
  state.turn = 0;
  state.players.GOOD.mulliganCommitted = false;
  state.players.EVIL.mulliganCommitted = false;
  const ids = [
    card(state, "GC01", "GOOD"),
    card(state, "GC02", "GOOD"),
    card(state, "GC05", "GOOD"),
    card(state, "B07", "GOOD"),
  ];
  const v = projectPlayerView(state, "GOOD");
  const normal = chooseBotAction(v, v.legalActions, context);
  expect(normal.action).toEqual({
    kind: "MULLIGAN",
    cardInstanceIds: [ids[3]],
  });
  expect(
    chooseBotAction(v, v.legalActions, { ...context, difficulty: "EASY" })
      .action,
  ).toEqual(normal.action);
});
it("blocking gets the exclusive +1.5 lane heuristic", () => {
  const state = view();
  const id = card(state, "GC01", "GOOD");
  unit(state, "EC01", "EVIL", 2);
  const v = projectPlayerView(state, "GOOD");
  expect(
    evaluateAction(v, { kind: "PLAY_UNIT", cardInstanceId: id, laneId: 2 })
      .heuristic,
  ).toBe(1.5);
  expect(
    evaluateAction(v, { kind: "PLAY_UNIT", cardInstanceId: id, laneId: 1 })
      .heuristic,
  ).toBe(0);
});
it("uses viewer-relative lethal and effective healing coefficients without treating a strong PASS forecast as a rival play", () => {
  const s = ready();
  s.phase = "EVIL_TRICKS";
  s.activeSide = "EVIL";
  s.players.EVIL.hand = [];
  const id = card(s, "F06", "EVIL");
  s.players.GOOD.hp = 3;
  unit(s, "EC01", "EVIL", 1);
  const v = projectPlayerView(s, "EVIL"),
    action = {
      kind: "PLAY_TRICK" as const,
      cardInstanceId: id,
      target: { kind: "HERO" as const, side: "GOOD" as const },
    };
  expect(evaluateAction(v, action).score).toBeCloseTo(10007.1);
  expect(chooseBotAction(v, v.legalActions, context).action).toEqual(action);
  const heal = view();
  heal.players.GOOD.hp = 17;
  const h = card(heal, "V07", "GOOD"),
    hv = projectPlayerView(heal, "GOOD");
  expect(
    evaluateAction(hv, {
      kind: "PLAY_TRICK",
      cardInstanceId: h,
      target: { kind: "NONE" },
    }).score,
  ).toBeCloseTo(4.1);
});
it("keeps expensive/removal-only openings out of mulligan and resolves equal unit scores by instance ID before lane", () => {
  const s = view();
  const first = card(s, "GC01", "GOOD"),
    second = card(s, "GC01", "GOOD");
  s.players.GOOD.hand.reverse();
  const v = projectPlayerView(s, "GOOD");
  expect(chooseBotAction(v, v.legalActions, context).action).toEqual({
    kind: "PLAY_UNIT",
    cardInstanceId: first,
    laneId: 1,
  });
  expect(second).not.toBe(first);
  s.players.GOOD.hand = [];
  s.phase = "MULLIGAN";
  s.players.GOOD.mulliganCommitted = false;
  s.players.EVIL.mulliganCommitted = false;
  const ids = [card(s, "GC05", "GOOD"), card(s, "B07", "GOOD")];
  const mv = projectPlayerView(s, "GOOD");
  expect(chooseBotAction(mv, mv.legalActions, context).action).toEqual({
    kind: "MULLIGAN",
    cardInstanceIds: ids,
  });
});
it("evaluates favorable trades with shared armor/shield rules and does not add a lane bonus for a stunned attack", () => {
  const s = view();
  const id = card(s, "GC02", "GOOD");
  const enemy = unit(s, "EC01", "EVIL", 2);
  enemy.statuses.stunned = true;
  enemy.current.hp = 1;
  const v = projectPlayerView(s, "GOOD");
  expect(
    evaluateAction(v, { kind: "PLAY_UNIT", cardInstanceId: id, laneId: 2 })
      .heuristic,
  ).toBe(1);
  enemy.statuses.shield = true;
  const shield = projectPlayerView(s, "GOOD");
  expect(
    evaluateAction(shield, { kind: "PLAY_UNIT", cardInstanceId: id, laneId: 2 })
      .heuristic,
  ).toBe(0);
});
it("mulligan recognizes flexible enemy-character damage as cheap unit removal", () => {
  const s = ready();
  s.phase = "MULLIGAN";
  s.players.EVIL.hand = [];
  s.players.EVIL.mulliganCommitted = false;
  s.players.GOOD.mulliganCommitted = false;
  card(s, "EC01", "EVIL");
  card(s, "EC02", "EVIL");
  card(s, "F06", "EVIL");
  const expensive = card(s, "F08", "EVIL");
  const v = projectPlayerView(s, "EVIL");
  expect(chooseBotAction(v, v.legalActions, context).action).toEqual({
    kind: "MULLIGAN",
    cardInstanceIds: [expensive],
  });
});
it("uses the same blocking heuristic for a played lane-target summon", () => {
  const s = view(),
    id = card(s, "V08", "GOOD");
  unit(s, "EC01", "EVIL", 2);
  const v = projectPlayerView(s, "GOOD");
  expect(
    evaluateAction(v, {
      kind: "PLAY_TRICK",
      cardInstanceId: id,
      target: { kind: "LANE", laneId: 2 },
    }).heuristic,
  ).toBe(1.5);
});
it("target ties use the public target lane before target instance ID", () => {
  const s = ready();
  s.phase = "EVIL_TRICKS";
  s.activeSide = "EVIL";
  s.players.EVIL.hand = [];
  card(s, "F06", "EVIL");
  unit(s, "GC01", "GOOD", 2);
  const laneOne = unit(s, "GC01", "GOOD", 1);
  const v = projectPlayerView(s, "EVIL");
  const legal = v.legalActions.filter(
    (a) => a.kind === "PLAY_TRICK" && a.target.kind === "UNIT",
  );
  expect(chooseBotAction(v, legal, context).action).toMatchObject({
    kind: "PLAY_TRICK",
    target: { kind: "UNIT", instanceId: laneOne.instanceId },
  });
});

it.each([false, true])(
  "block-response moves ignore resolved lanes and retain a future-lane %s trade/block bonus",
  (stunned) => {
    const s = ready();
    s.humanSide = "EVIL";
    s.phase = "COMBAT";
    s.activeSide = null;
    s.continuation = {
      laneId: 3,
      stage: "BLOCK_RESPONSES",
      pendingResponders: [],
    };
    const mover = unit(s, "GC01", "GOOD", 5);
    unit(s, "EC01", "EVIL", 2);
    unit(s, "EC01", "EVIL", 3);
    const futureEnemy = unit(s, "EC01", "EVIL", 4);
    futureEnemy.statuses.stunned = stunned;
    futureEnemy.current.hp = 1;
    const powerInstanceId = "f".repeat(32);
    s.players.GOOD.reserve.push({
      definitionId: "P_P1",
      instanceId: powerInstanceId,
      normalCost: 1,
    });
    s.blockResponse = { side: "GOOD", laneId: 3, powerInstanceId };
    const v = projectPlayerView(s, "GOOD");
    const move = (laneId: number) => ({
      kind: "USE_BLOCK_POWER" as const,
      powerInstanceId,
      target: {
        kind: "UNIT_AND_LANE" as const,
        instanceId: mover.instanceId,
        laneId,
      },
    });
    for (const lane of [2, 3]) {
      expect(v.legalActions).toContainEqual(move(lane));
      expect(evaluateAction(v, move(lane)).heuristic).toBe(0);
      expect(evaluateAction(v, move(lane)).score).toBeCloseTo(1.6);
    }
    expect(evaluateAction(v, move(4)).heuristic).toBe(stunned ? 1 : 1.5);
    expect(chooseBotAction(v, v.legalActions, context).action).toEqual(move(4));
  },
);
