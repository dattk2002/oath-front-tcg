import { performance } from "node:perf_hooks";
import {
  applyAction,
  describeAutomaticOperation,
  getLegalActions,
} from "@oathfront/game-engine";
import type {
  MatchState,
  JournalEntry,
  TransitionResult,
} from "@oathfront/game-engine";
import type { PlayerAction } from "@oathfront/contracts";
import { recordIntent, recordAutomatic } from "./journal.js";
import { HttpError } from "../http.js";
/** T08 supplies a pure, synchronous single complete operation. No I/O or batching here. */
export interface ScheduledOperation {
  transition: TransitionResult;
  entry: JournalEntry;
  botIntentsSinceHuman: number;
}
export interface Scheduler {
  canAdvance(state: MatchState, botIntentsSinceHuman: number): boolean;
  step(
    state: MatchState,
    nextStepSeq: number,
    botIntentsSinceHuman: number,
  ): ScheduledOperation | null;
}
export const engineScheduler: Scheduler = {
  canAdvance: (state) => describeAutomaticOperation(state) !== null,
  step: (state, seq, guard) =>
    describeAutomaticOperation(state)
      ? { ...recordAutomatic(state, seq), botIntentsSinceHuman: guard }
      : null,
};
export function needsAdvance(
  state: MatchState,
  guard: number,
  scheduler: Scheduler,
) {
  return (
    state.lifecycle === "ACTIVE" &&
    !humanWaiting(state) &&
    scheduler.canAdvance(state, guard)
  );
}
export function commandTransition(
  state: MatchState,
  action: PlayerAction,
  lastStepSeq: number,
  guard: number,
  scheduler: Scheduler,
  clock = () => performance.now(),
) {
  if (action.kind !== "ADVANCE") {
    const valid = applyAction(state, { actor: state.humanSide, action });
    if (valid.kind === "error")
      throw new HttpError(422, "ILLEGAL_ACTION", {
        reason: valid.code,
        field: null,
      });
    return {
      ...recordIntent(
        state,
        { actor: state.humanSide, action },
        "HUMAN",
        lastStepSeq + 1,
        null,
      ),
      botIntentsSinceHuman: guard,
      journal: [] as JournalEntry[],
    };
  }
  if (!needsAdvance(state, guard, scheduler))
    throw new HttpError(422, "ILLEGAL_ACTION", {
      reason: state.lifecycle === "PAUSED" ? "MATCH_PAUSED" : "WRONG_PHASE",
      field: null,
    });
  const start = clock(),
    entries: JournalEntry[] = [],
    events: TransitionResult["events"] = [];
  let current = state;
  while (
    entries.length < 8 &&
    (entries.length === 0 || clock() - start < 250) &&
    needsAdvance(current, guard, scheduler)
  ) {
    const next = scheduler.step(
      current,
      lastStepSeq + entries.length + 1,
      guard,
    );
    if (!next) break;
    if (
      !Number.isSafeInteger(next.botIntentsSinceHuman) ||
      next.botIntentsSinceHuman < 0 ||
      next.botIntentsSinceHuman > 64
    )
      throw new HttpError(500, "INTERNAL");
    current = next.transition.nextState;
    guard = next.botIntentsSinceHuman;
    entries.push(next.entry);
    events.push(...next.transition.events);
  }
  if (!entries.length)
    throw new HttpError(422, "ILLEGAL_ACTION", {
      reason: "WRONG_PHASE",
      field: null,
    });
  return {
    transition: {
      kind: "transition" as const,
      nextState: current,
      events,
      waitingForInput: !needsAdvance(current, guard, scheduler),
      terminalOutcome: current.outcome,
    },
    entry: entries[0]!,
    journal: entries,
    botIntentsSinceHuman: guard,
  };
}
export function humanWaiting(state: MatchState) {
  return getLegalActions(state, state.humanSide).some(
    (a) => !["ADVANCE", "PAUSE", "SURRENDER"].includes(a.kind),
  );
}
