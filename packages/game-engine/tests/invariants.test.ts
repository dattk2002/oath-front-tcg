import { it, expect } from "vitest";
import {
  createMatch,
  createRandomStreams,
  getLegalActions,
  applyAction,
  advanceAutomatic,
  projectPlayerView,
} from "../src/index.js";
import { matchConfig } from "../../../tests/fixtures/match-fixture.js";
import type { MatchState } from "../src/model.js";
function verify(s: MatchState) {
  const ids: string[] = [];
  for (const side of ["GOOD", "EVIL"] as const) {
    const p = s.players[side];
    expect(Number.isFinite(p.hp)).toBe(true);
    expect(p.hand.length).toBeLessThanOrEqual(10);
    expect(p.reserve.length).toBeLessThanOrEqual(4);
    ids.push(
      ...p.hand.map((c) => c.instanceId),
      ...p.deck.map((c) => c.instanceId),
      ...p.reserve.map((c) => c.instanceId),
    );
  }
  expect(s.board).toHaveLength(5);
  for (const lane of s.board)
    for (const u of [lane.evil, lane.good])
      if (u) {
        expect(u.laneId).toBe(lane.laneId);
        expect(Number.isFinite(u.current.hp)).toBe(true);
        expect(u.current.hp).toBeGreaterThan(0);
        expect(Number.isFinite(u.current.attack)).toBe(true);
        expect(u.current.attack).toBeGreaterThanOrEqual(0);
        ids.push(u.instanceId);
      }
  expect(new Set(ids).size).toBe(ids.length);
}
it("AC21: 1000 reproducible seeded legal-action sequences preserve invariants and rejected-action purity", () => {
  for (let sequenceSeed = 0; sequenceSeed < 1000; sequenceSeed++) {
    let step = -1;
    try {
      const bytes = new Uint8Array(32);
      new DataView(bytes.buffer).setUint32(0, sequenceSeed, true);
      let s = createMatch(matchConfig(), createRandomStreams(bytes));
      let chooser = (sequenceSeed + 1) >>> 0;
      for (step = 0; step < 100 && s.lifecycle === "ACTIVE"; step++) {
        verify(s);
        const before = JSON.stringify(s);
        const illegal = applyAction(s, {
          actor: "GOOD",
          action: {
            kind: "PLAY_UNIT",
            cardInstanceId: "f".repeat(32),
            laneId: 1,
          },
        });
        expect(illegal.kind).toBe("error");
        expect(JSON.stringify(s)).toBe(before);
        let result;
        if (
          ["COMBAT", "TURN_END", "TURN_START"].includes(s.phase) &&
          !s.blockResponse
        )
          result = advanceAutomatic(s, { maxRoots: 8 });
        else {
          const actor = s.blockResponse?.side ?? s.activeSide ?? s.humanSide;
          let legal = getLegalActions(s, actor).filter(
            (a) =>
              !["PAUSE", "RESUME", "SURRENDER", "ADVANCE"].includes(a.kind),
          );
          if (!legal.length && s.phase === "MULLIGAN")
            legal = getLegalActions(
              s,
              actor === "GOOD" ? "EVIL" : "GOOD",
            ).filter((a) => a.kind === "MULLIGAN");
          const owner =
            s.phase === "MULLIGAN" && s.players[actor].mulliganCommitted
              ? actor === "GOOD"
                ? "EVIL"
                : "GOOD"
              : actor;
          expect(legal.length).toBeGreaterThan(0);
          chooser = (Math.imul(chooser, 1664525) + 1013904223) >>> 0;
          const action = legal[chooser % legal.length]!;
          result = applyAction(s, { actor: owner, action });
        }
        expect(result.kind).toBe("transition");
        expect(JSON.stringify(s)).toBe(before);
        if (result.kind !== "transition") throw Error(result.code);
        s = result.nextState;
        verify(s);
      }
      projectPlayerView(s, s.humanSide);
    } catch (error) {
      throw new Error(`sequenceSeed=${sequenceSeed}; step=${step}`, {
        cause: error,
      });
    }
  }
}, 120000);
