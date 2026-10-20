import { expect, it } from "vitest";
import { validateWire } from "@oathfront/contracts";
import { createMatch } from "../src/setup.js";
import { createRandomStreams } from "../src/rng.js";
import { applyMulligan } from "../src/mulligan.js";
import { matchConfig, seed } from "../../../tests/fixtures/match-fixture.js";
import type { MatchState, TransitionResult } from "../src/model.js";
const fresh = () => createMatch(matchConfig(), createRandomStreams(seed));
const commit = (
  s: MatchState,
  side: "GOOD" | "EVIL",
  ids: string[] = [],
): TransitionResult => {
  const result = applyMulligan(s, side, ids);
  if (result.kind === "error") throw new Error(result.code);
  return result;
};
it.each([0, 1, 4])(
  "exchanges %i cards once, excluding the removed instances and retaining all deck cards",
  (count) => {
    const initial = fresh(),
      before = structuredClone(initial);
    const removed = initial.players.GOOD.hand
      .slice(0, count)
      .map((c) => c.instanceId);
    const result = commit(initial, "GOOD", removed),
      p = result.nextState.players.GOOD;
    expect(initial).toEqual(before);
    expect(p.hand).toHaveLength(4);
    expect(p.deck).toHaveLength(26);
    expect(p.reserve).toHaveLength(0);
    expect(p.hand.every((c) => !removed.includes(c.instanceId))).toBe(true);
    expect(p.deck.filter((c) => removed.includes(c.instanceId))).toHaveLength(
      count,
    );
    expect([...p.deck, ...p.hand].map((c) => c.instanceId).sort()).toEqual(
      [...initial.players.GOOD.deck, ...initial.players.GOOD.hand]
        .map((c) => c.instanceId)
        .sort(),
    );
    expect(applyMulligan(result.nextState, "GOOD", [])).toMatchObject({
      kind: "error",
      code: "WRONG_PHASE",
    });
  },
);
it("excludes instances rather than the entire card definition", () => {
  const state = fresh();
  const removed = state.players.GOOD.hand[0]!;
  const duplicateAt = state.players.GOOD.deck.findIndex(
    (c) => c.definitionId === removed.definitionId,
  );
  const duplicate = state.players.GOOD.deck.splice(duplicateAt, 1)[0]!;
  state.players.GOOD.deck.unshift(duplicate);
  expect(
    commit(state, "GOOD", [removed.instanceId]).nextState.players.GOOD.hand,
  ).toContainEqual(duplicate);
});
it("rejects invalid selections and lifecycle without changing any counters, zones or RNG", () => {
  const state = fresh();
  const before = structuredClone(state);
  const id = state.players.GOOD.hand[0]!.instanceId;
  for (const ids of [
    [id, id],
    [state.players.EVIL.hand[0]!.instanceId],
    [state.players.GOOD.deck[0]!.instanceId],
    ["missing"],
    [...state.players.GOOD.hand.map((c) => c.instanceId), "extra"],
  ]) {
    expect(applyMulligan(state, "GOOD", ids)).toMatchObject({ kind: "error" });
    expect(state).toEqual(before);
  }
  state.lifecycle = "PAUSED";
  expect(applyMulligan(state, "GOOD", [])).toEqual({
    kind: "error",
    code: "MATCH_PAUSED",
  });
  state.lifecycle = "COMPLETED";
  expect(applyMulligan(state, "GOOD", [])).toEqual({
    kind: "error",
    code: "MATCH_ENDED",
  });
});
it("waits for both commitments before powers, then starts turn1 with reveal before energy and no extra draw", () => {
  const first = commit(fresh(), "GOOD");
  expect(first.nextState).toMatchObject({ turn: 0, phase: "MULLIGAN" });
  expect(first.nextState.random.states["power:good"]).toEqual(
    createRandomStreams(seed).states["power:good"],
  );
  expect(first.events.some((e) => e.kind === "PowerGranted")).toBe(false);
  const second = commit(first.nextState, "EVIL"),
    state = second.nextState;
  expect(state).toMatchObject({
    turn: 1,
    phase: "EVIL_DEPLOY",
    activeSide: "EVIL",
  });
  for (const side of ["GOOD", "EVIL"] as const) {
    expect(state.players[side].reserve).toHaveLength(1);
    expect(state.players[side].receivedPowerIds).toHaveLength(1);
    expect(state.players[side].energy).toEqual({ current: 1, max: 1 });
    expect(state.players[side].hand).toHaveLength(4);
    expect(state.players[side].deck).toHaveLength(26);
  }
  expect(state.players.EVIL.reserve[0]!.definitionId).toBe("S_E_FX");
  expect(state.players.GOOD.reserve[0]!.definitionId).toBe("P_V1");
  expect(state.instanceSeq).toBe(62);
  expect(
    second.events
      .filter((e) => e.kind === "PowerGranted")
      .map((e) => e.ownerSide),
  ).toEqual(["EVIL", "GOOD"]);
  expect(
    second.events.findIndex((e) => e.kind === "LocationRevealed"),
  ).toBeLessThan(second.events.findIndex((e) => e.kind === "EnergyRefilled"));
  expect(second.events.every((e) => validateWire("VisibleEvent", e))).toBe(
    true,
  );
  expect(
    second.events.every(
      (e, i) => e.sequence === first.nextState.eventSeq + i + 1,
    ),
  ).toBe(true);
});
it("power and completed setup are reproducible regardless of confirmation order", () => {
  const a = commit(commit(fresh(), "GOOD").nextState, "EVIL").nextState;
  const b = commit(commit(fresh(), "EVIL").nextState, "GOOD").nextState;
  expect(a).toEqual(b);
  const checkpoint = JSON.parse(
    JSON.stringify(commit(fresh(), "GOOD").nextState),
  );
  expect(commit(checkpoint, "EVIL").nextState).toEqual(a);
});
it("emits both phase transitions so event consumers observe complete setup advancement", () => {
  const result = commit(commit(fresh(), "GOOD").nextState, "EVIL");
  expect(
    result.events
      .filter((e) => e.kind === "PhaseChanged")
      .map((e) => e.payload),
  ).toEqual([
    { from: "MULLIGAN", to: "TURN_START", turn: 1 },
    { from: "TURN_START", to: "EVIL_DEPLOY", turn: 1 },
  ]);
});
