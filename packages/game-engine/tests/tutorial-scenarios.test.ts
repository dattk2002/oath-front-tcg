import { describe, it, expect } from "vitest";
import {
  createMatch,
  createRandomStreams,
  applyAction,
  getLegalActions,
  advanceAutomatic,
  tutorialBotAction,
} from "../src/index.js";
import type { MatchState } from "../src/index.js";
import type { PlayerAction } from "@oathfront/contracts";
import { matchConfig, seed } from "../../../tests/fixtures/match-fixture.js";
const start = (side: "GOOD" | "EVIL" = "GOOD") =>
  createMatch(
    { ...matchConfig(), mode: "TUTORIAL", humanSide: side },
    createRandomStreams(seed),
  );
function act(s: MatchState, kind: PlayerAction["kind"]) {
  const a = getLegalActions(s, s.humanSide).find((a) => a.kind === kind);
  expect(a, `legal ${kind}`).toBeDefined();
  const r = applyAction(s, { actor: s.humanSide, action: a! });
  if (r.kind === "error") throw new Error(r.code);
  return r.nextState;
}
function settle(s: MatchState): MatchState {
  for (let i = 0; i < 100; i++) {
    if (
      getLegalActions(s, s.humanSide).some(
        (a) =>
          !["ADVANCE", "PAUSE", "TUTORIAL_SKIP", "TUTORIAL_RESTART"].includes(
            a.kind,
          ),
      )
    )
      return s;
    const bot = tutorialBotAction(s);
    const result = bot
      ? applyAction(s, {
          actor: s.humanSide === "GOOD" ? "EVIL" : "GOOD",
          action: bot,
        })
      : advanceAutomatic(s, { maxRoots: 1 });
    if (result.kind === "error") throw new Error(result.code);
    const n = result.nextState;
    if (JSON.stringify(n) === JSON.stringify(s)) return s;
    s = n;
  }
  throw new Error("unbounded tutorial");
}
describe("tutorial manifest scenarios", () => {
  it("TU01 loads scene A and plays GC01 with exact mana and hand", () => {
    let s = settle(start());
    expect(s.phase).toBe("GOOD_PLAY");
    s = act(s, "PLAY_UNIT");
    expect(s.players.GOOD.energy.current).toBe(0);
    expect(s.board[1]!.good?.definitionId).toBe("GC01");
    expect(s.players.GOOD.hand).toHaveLength(3);
  });
  it("TU02 rejects off-step gameplay without mutating state and stops at TURN_END", () => {
    let s = settle(start());
    const before = structuredClone(s);
    expect(
      applyAction(s, { actor: "GOOD", action: { kind: "PASS_PHASE" } }),
    ).toMatchObject({ kind: "error", code: "TUTORIAL_STEP_MISMATCH" });
    expect(s).toEqual(before);
    s = act(s, "PLAY_UNIT");
    s = act(s, "TUTORIAL_CONTINUE");
    s = act(s, "TUTORIAL_CONTINUE");
    s = settle(act(s, "PASS_PHASE"));
    expect(s.phase).toBe("TURN_END");
    expect(s.board[1]!.good).toBeNull();
    expect(s.board[1]!.evil).toBeNull();
    expect(s.players.EVIL.hp).toBe(19);
    expect(s.players.EVIL.block.charge).toBe(2);
  });
});
function throughA() {
  let s = settle(start());
  s = act(s, "PLAY_UNIT");
  s = act(s, "TUTORIAL_CONTINUE");
  s = act(s, "TUTORIAL_CONTINUE");
  return settle(act(s, "PASS_PHASE"));
}
function throughB() {
  let s = settle(act(throughA(), "TUTORIAL_CONTINUE"));
  s = act(s, "PLAY_TRICK");
  s = act(s, "TUTORIAL_CONTINUE");
  return settle(act(s, "PASS_PHASE"));
}
function throughC() {
  const s = settle(act(throughB(), "TUTORIAL_CONTINUE"));
  return act(s, "PLAY_UNIT");
}
function block() {
  return settle(act(throughC(), "TUTORIAL_CONTINUE"));
}
describe("remaining exact tutorial outcomes", () => {
  it("TU03 trick kills lane4 immediately; pair leaves both lane2 units at1 HP", () => {
    let s = settle(act(throughA(), "TUTORIAL_CONTINUE"));
    s = act(s, "PLAY_TRICK");
    expect(s.phase).toBe("GOOD_PLAY");
    expect(s.board[3]!.evil).toBeNull();
    expect(s.players.GOOD.energy.current).toBe(0);
    s = act(s, "TUTORIAL_CONTINUE");
    s = settle(act(s, "PASS_PHASE"));
    expect(s.board[1]!.good?.current.hp).toBe(1);
    expect(s.board[1]!.evil?.current.hp).toBe(1);
    expect(s.players.EVIL.hp).toBe(19);
  });
  it("TU04 reveals Forest without retroactive buff and buffs played B01", () => {
    let s = settle(act(throughB(), "TUTORIAL_CONTINUE"));
    expect(s.board[2]!.location.state).toBe("ACTIVE");
    expect(s.board[2]!.evil?.current).toMatchObject({ attack: 2, hp: 3 });
    s = act(s, "PLAY_UNIT");
    expect(s.board[2]!.good?.current).toMatchObject({ attack: 1, hp: 2 });
    expect(s.board[2]!.good?.statuses.shield).toBe(true);
    expect(s.players.GOOD.energy.current).toBe(2);
  });
  it("TU05 blocks at6 charge and grants signature once", () => {
    const s = block();
    expect(s.players.GOOD.hp).toBe(10);
    expect(s.players.GOOD.block).toMatchObject({ charge: 0, used: 1 });
    expect(s.players.GOOD.receivedPowerIds).toEqual(["P_V1", "S_G_BV"]);
    expect(s.blockResponse).not.toBeNull();
  });
  it.each(["USE_BLOCK_POWER", "KEEP_BLOCK_POWER"] as const)(
    "TU06/TU07 %s preserves branch through turn5 and completion",
    (kind) => {
      let s = act(block(), kind);
      expect(s.players.GOOD.hp).toBe(kind === "USE_BLOCK_POWER" ? 12 : 10);
      expect(s.board[3]!.good?.current).toMatchObject({
        attack: 2,
        hp: kind === "USE_BLOCK_POWER" ? 5 : 3,
      });
      expect(s.board[3]!.good?.statuses.shield).toBe(
        kind === "USE_BLOCK_POWER",
      );
      expect(s.players.GOOD.energy.current).toBe(0);
      s = settle(act(s, "TUTORIAL_CONTINUE"));
      expect(s.turn).toBe(5);
      expect(s.phase).toBe("GOOD_PLAY");
      expect(s.board[4]!.location.state).toBe("ACTIVE");
      expect(s.players.EVIL.hp).toBe(18);
      expect(s.players.GOOD.hp).toBe(kind === "USE_BLOCK_POWER" ? 12 : 10);
      expect(
        s.players.GOOD.reserve.some((p) => p.definitionId === "S_G_BV"),
      ).toBe(kind === "KEEP_BLOCK_POWER");
      s = act(s, "TUTORIAL_CONTINUE");
      expect(s.lifecycle).toBe("COMPLETED");
      expect(s.outcome).toEqual({
        result: "NONE",
        winner: null,
        reason: "TUTORIAL_COMPLETED",
      });
    },
  );
  it("TU08/TU09 preserves2 mana across phases, kills GC01 and resolves combat", () => {
    let s = settle(start("EVIL"));
    s = act(s, "PLAY_UNIT");
    s = settle(act(s, "PASS_PHASE"));
    expect(s.phase).toBe("GOOD_PLAY");
    expect(s.players.EVIL.energy.current).toBe(2);
    s = settle(act(s, "TUTORIAL_CONTINUE"));
    expect(s.phase).toBe("EVIL_TRICKS");
    expect(s.players.EVIL.energy.current).toBe(2);
    expect(s.board[4]!.good?.current.hp).toBe(2);
    s = act(s, "PLAY_TRICK");
    expect(s.board[4]!.good).toBeNull();
    expect(s.players.EVIL.energy.current).toBe(0);
    s = settle(act(s, "PASS_PHASE"));
    expect(s.phase).toBe("TURN_END");
    expect(s.players.GOOD.hp).toBe(18);
    expect(s.board[1]!.good?.current.hp).toBe(1);
    expect(s.board[1]!.evil).toBeNull();
    s = act(s, "TUTORIAL_CONTINUE");
    expect(s.tutorial?.completedStepIds).toEqual(["E01", "E02"]);
  });
  it("TU10 reloaded checkpoint rejects repeated CONTINUE and preserves pending branch", () => {
    let s = act(block(), "KEEP_BLOCK_POWER");
    const saved = JSON.parse(JSON.stringify(s)) as MatchState;
    expect(getLegalActions(saved, "GOOD")).toEqual(getLegalActions(s, "GOOD"));
    s = act(saved, "TUTORIAL_CONTINUE");
    const before = structuredClone(s);
    expect(
      applyAction(s, {
        actor: "GOOD",
        action: { kind: "TUTORIAL_CONTINUE", stepId: "G07" },
      }),
    ).toMatchObject({ kind: "error", code: "TUTORIAL_STEP_MISMATCH" });
    expect(s).toEqual(before);
  });
  it("TU11 restart uses fresh identities/monotonic counters and skip cannot score", () => {
    let s = throughB();
    const ids = s.players.GOOD.hand.map((c) => c.instanceId);
    const seq = s.instanceSeq,
      event = s.eventSeq,
      root = s.rootSeq;
    s = settle(act(s, "TUTORIAL_RESTART"));
    expect(s.tutorial?.stepId).toBe("G04");
    expect(s.tutorial?.completedStepIds).toEqual(["G01", "G02", "G03"]);
    expect(s.instanceSeq).toBeGreaterThan(seq);
    expect(s.eventSeq).toBeGreaterThan(event);
    expect(s.rootSeq).toBeGreaterThan(root);
    expect(s.players.GOOD.hand.some((c) => ids.includes(c.instanceId))).toBe(
      false,
    );
    s = act(s, "TUTORIAL_SKIP");
    expect(s.lifecycle).toBe("ABANDONED");
    expect(s.outcome).toEqual({
      result: "NONE",
      winner: null,
      reason: "TUTORIAL_SKIPPED",
    });
    const ordinary = createMatch(matchConfig(), createRandomStreams(seed));
    expect(
      applyAction(ordinary, {
        actor: ordinary.humanSide,
        action: { kind: "TUTORIAL_SKIP" },
      }),
    ).toMatchObject({ kind: "error", code: "TUTORIAL_STEP_MISMATCH" });
  });
});
