import { describe, it, expect } from "vitest";
import { advanceAutomatic } from "../src/automatic.js";
import { applyAction, getLegalActions } from "../src/actions.js";
import { ready, unit, next } from "./helpers.js";

function endState() {
  const s = ready();
  s.phase = "TURN_END";
  s.activeSide = null;
  return s;
}
function finish(s: ReturnType<typeof ready>) {
  for (
    let i = 0;
    i < 30 &&
    s.lifecycle === "ACTIVE" &&
    ["TURN_END", "TURN_START"].includes(s.phase);
    i++
  )
    s = advanceAutomatic(s, { maxRoots: 1 }).nextState;
  return s;
}
describe("R06/R13 complete turn boundaries", () => {
  it("Poison removes a unit before Spring and before its end-turn heal", () => {
    const s = endState();
    s.board[0]!.location = {
      state: "ACTIVE",
      definitionId: "healing_spring",
      revealTurn: 1,
    };
    const u = unit(s, "V02", "GOOD", 1);
    u.current.hp = 1;
    u.statuses.poisoned = true;
    const after = finish(s);
    expect(after.board[0]!.good).toBeNull();
    expect(after.turn).toBe(6);
    expect(after.phase).toBe("EVIL_DEPLOY");
  });
  it("expires Stun and Exhaust, resets counters and refills both without carrying energy", () => {
    const s = endState();
    const u = unit(s, "GC01", "GOOD", 2);
    u.statuses.stunned = true;
    u.statuses.exhausted = true;
    s.turnCounters = { old: 1 };
    const a = finish(s);
    expect(a.board[1]!.good!.statuses).toMatchObject({
      stunned: false,
      exhausted: false,
    });
    expect(a.turnCounters).toEqual({});
    expect(a.players.GOOD.energy).toEqual({ current: 6, max: 6 });
  });
  it("batches both mandatory fatigue damages atomically for a draw", () => {
    const s = endState();
    for (const side of ["GOOD", "EVIL"] as const) {
      s.players[side].deck = [];
      s.players[side].hp = 1;
    }
    const a = finish(s);
    expect(a.outcome).toEqual({
      result: "DRAW",
      winner: null,
      reason: "SIMULTANEOUS_LETHAL",
    });
    expect(a.players.GOOD.fatigueCounter).toBe(1);
    expect(a.players.EVIL.fatigueCounter).toBe(1);
  });
  it("turn20 resolves Poison/death effects before declaring the turn limit", () => {
    const s = endState();
    s.turn = 20;
    const a = finish(s);
    expect(a.turn).toBe(20);
    expect(a.outcome?.reason).toBe("TURN_LIMIT");
  });
  it("scheduled roots persist progress across JSON reload and maxRoots1", () => {
    const s = endState();
    unit(s, "V02", "GOOD", 2);
    const first = advanceAutomatic(s, { maxRoots: 1 });
    expect(first.nextState.rootSeq).toBe(s.rootSeq + 1);
    const reload = JSON.parse(JSON.stringify(first.nextState));
    expect(finish(reload)).toEqual(finish(first.nextState));
  });
});
describe("R18 lifecycle controls", () => {
  it("human pauses and resumes while preserving exact block cursor, phase and RNG", () => {
    const s = ready();
    s.phase = "COMBAT";
    s.activeSide = "GOOD";
    s.continuation = {
      laneId: 3,
      stage: "BLOCK_RESPONSES",
      pendingResponders: [],
    };
    s.blockResponse = {
      side: "GOOD",
      laneId: 3,
      powerInstanceId: "a".repeat(32),
    };
    const p = next(
      applyAction(s, { actor: s.humanSide, action: { kind: "PAUSE" } }),
    );
    expect(p.lifecycle).toBe("PAUSED");
    expect(p.continuation).toEqual(s.continuation);
    expect(p.random).toEqual(s.random);
    expect(getLegalActions(p, s.humanSide)).toEqual([
      { kind: "RESUME" },
      { kind: "SURRENDER" },
    ]);
    const r = next(
      applyAction(p, { actor: s.humanSide, action: { kind: "RESUME" } }),
    );
    expect(r.lifecycle).toBe("ACTIVE");
    expect(r.blockResponse).toEqual(s.blockResponse);
  });
  it("human surrender works while paused and is a loss; bot controls reject without mutation", () => {
    const s = ready();
    s.lifecycle = "PAUSED";
    const before = structuredClone(s);
    expect(
      applyAction(s, {
        actor: s.humanSide === "GOOD" ? "EVIL" : "GOOD",
        action: { kind: "RESUME" },
      }).kind,
    ).toBe("error");
    expect(s).toEqual(before);
    const a = next(
      applyAction(s, { actor: s.humanSide, action: { kind: "SURRENDER" } }),
    );
    expect(a.outcome).toMatchObject({ result: "LOSS", reason: "SURRENDER" });
    expect(a.lifecycle).toBe("COMPLETED");
  });
});
it("turn-start reveal precedes energy and draws, later turns escalate mandatory fatigue 1/2/3", () => {
  let s = endState();
  s.turn = 1;
  s.board[2]!.location = {
    state: "HIDDEN",
    definitionId: "ancient_forest",
    revealTurn: 3,
  };
  s.players.GOOD.deck = [];
  for (const expected of [1, 2, 3]) {
    s = finish(s);
    expect(s.players.GOOD.fatigueCounter).toBe(expected);
    expect(s.players.GOOD.hp).toBe(20 - (expected * (expected + 1)) / 2);
    if (expected === 2) expect(s.board[2]!.location.state).toBe("ACTIVE");
    s.phase = "TURN_END";
    s.activeSide = null;
  }
});
it("full-turn overdraw discards publicly and does not fatigue or affect reserve", () => {
  const s = endState();
  const p = s.players.GOOD;
  while (p.hand.length < 10) p.hand.push(p.deck.shift()!);
  const top = p.deck[0]!;
  const before = p.reserve;
  let current = s;
  const events = [];
  while (["TURN_END", "TURN_START"].includes(current.phase)) {
    const r = advanceAutomatic(current, { maxRoots: 1 });
    events.push(...r.events);
    current = r.nextState;
  }
  expect(current.players.GOOD.hand).toHaveLength(10);
  expect(current.players.GOOD.fatigueCounter).toBe(0);
  expect(current.players.GOOD.reserve).toEqual(before);
  expect(events).toContainEqual(
    expect.objectContaining({
      kind: "CardDiscarded",
      visibility: "PUBLIC",
      payload: expect.objectContaining({
        definitionId: top.definitionId,
        reason: "OVERDRAW",
      }),
    }),
  );
});
it("Poison death lethal on turn20 takes priority over TURN_LIMIT and stops later roots", () => {
  const s = endState();
  s.turn = 20;
  s.players.GOOD.hp = 1;
  const u = unit(s, "EC04", "EVIL", 1);
  u.current.hp = 1;
  u.statuses.poisoned = true;
  const r = advanceAutomatic(s, { maxRoots: 8 });
  expect(r.nextState.outcome).toEqual({
    result: "LOSS",
    winner: "EVIL",
    reason: "HERO_DEFEATED",
  });
  expect(r.nextState.rootSeq).toBe(s.rootSeq + 1);
  expect(r.nextState.endTurn).toBeUndefined();
  expect(r.events.filter((e) => e.kind === "MatchEnded")).toHaveLength(1);
});
