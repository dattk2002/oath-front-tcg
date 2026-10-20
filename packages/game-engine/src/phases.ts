import type { Phase } from "@oathfront/contracts";
import type { MatchState, GameEvent, PlayerId } from "./model.js";
import { emitEvent } from "./events.js";
import { getActiveLocation } from "./locations.js";
export function phaseActor(phase: Phase): PlayerId | null {
  return phase === "GOOD_PLAY"
    ? "GOOD"
    : phase === "EVIL_DEPLOY" || phase === "EVIL_TRICKS"
      ? "EVIL"
      : null;
}
export function refillEnergyOnDraft(
  state: MatchState,
  events: GameEvent[],
): void {
  const max = Math.min(state.turn, 10);
  if (max < 1 || !Number.isSafeInteger(max))
    throw new RangeError("Invalid energy turn");
  for (const side of ["EVIL", "GOOD"] as const) {
    const before = state.players[side].energy.current;
    state.players[side].energy = { current: max, max };
    emitEvent(state, events, {
      kind: "EnergyRefilled",
      visibility: "PUBLIC",
      ownerSide: null,
      payload: { side, before, after: max, max },
    });
  }
}
export function playedUnitCost(
  state: MatchState,
  printedCost: number,
  laneId: number,
): number {
  const rule = getActiveLocation(state, laneId)?.rule;
  return printedCost + (rule?.kind === "UNIT_COST" ? rule.amount : 0);
}
export function changePhaseOnDraft(
  state: MatchState,
  events: GameEvent[],
  phase: Phase,
): void {
  const from = state.phase;
  state.phase = phase;
  state.activeSide = phaseActor(phase);
  emitEvent(state, events, {
    kind: "PhaseChanged",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: { from, to: phase, turn: state.turn },
  });
}
export function passPhaseOnDraft(state: MatchState, events: GameEvent[]): void {
  switch (state.phase) {
    case "EVIL_DEPLOY":
      changePhaseOnDraft(state, events, "GOOD_PLAY");
      break;
    case "GOOD_PLAY":
      changePhaseOnDraft(state, events, "EVIL_TRICKS");
      break;
    case "EVIL_TRICKS":
      changePhaseOnDraft(state, events, "COMBAT");
      state.continuation = {
        laneId: 1,
        stage: "BEFORE_PAIR",
        pendingResponders: [],
      };
      break;
    default:
      throw new TypeError("Phase cannot pass");
  }
}
