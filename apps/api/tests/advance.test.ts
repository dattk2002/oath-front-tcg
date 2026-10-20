import { it, expect } from "vitest";
import {
  commandTransition,
  engineScheduler,
  needsAdvance,
} from "../src/matches/commands.js";
import { combatState } from "../../../packages/game-engine/tests/fixtures/combat-pierce-volcano.js";
import { ready } from "../../../packages/game-engine/tests/helpers.js";
it("bounds complete automatic journal operations to eight or 250ms and carries durable guard unchanged", () => {
  const state = combatState();
  const batch = commandTransition(
    state,
    { kind: "ADVANCE" },
    12,
    9,
    engineScheduler,
    () => 0,
  );
  expect(batch.journal).toHaveLength(8);
  expect(batch.journal.map((j) => j.stepSeq)).toEqual([
    13, 14, 15, 16, 17, 18, 19, 20,
  ]);
  expect(batch.botIntentsSinceHuman).toBe(9);
  expect(batch.transition.nextState.continuation?.laneId).toBe(3);
  let cpu = 0;
  const bounded = commandTransition(
    state,
    { kind: "ADVANCE" },
    12,
    9,
    engineScheduler,
    () => {
      const elapsed = cpu;
      cpu += 80;
      return elapsed;
    },
  );
  expect(bounded.journal).toHaveLength(4);
  expect(state.continuation?.laneId).toBe(1);
});
it("stops advancement at human input even if an injected scheduler advertises work", () => {
  const state = ready();
  state.phase = "GOOD_PLAY";
  state.activeSide = "GOOD";
  const scheduler = { canAdvance: () => true, step: engineScheduler.step };
  expect(needsAdvance(state, 7, scheduler)).toBe(false);
});
