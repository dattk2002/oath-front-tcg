import type { GameEvent, MatchState, TransitionResult } from "./model.js";

type WithoutIds<T> = T extends GameEvent
  ? Omit<T, "eventId" | "sequence" | "rootId">
  : never;
export type EventInput = WithoutIds<GameEvent>;
/** Call only against a transaction draft after validation. */
export function emitEvent(
  state: MatchState,
  events: GameEvent[],
  event: EventInput,
): void {
  const sequence = ++state.eventSeq;
  events.push({
    ...event,
    sequence,
    eventId: `${state.matchId}:${sequence}`,
    rootId: `${state.matchId}:${state.rootSeq}`,
  });
}
export function transition(
  nextState: MatchState,
  events: GameEvent[],
): TransitionResult {
  return {
    kind: "transition",
    nextState,
    events,
    waitingForInput:
      nextState.lifecycle === "ACTIVE" &&
      (!!nextState.blockResponse ||
        ["MULLIGAN", "EVIL_DEPLOY", "GOOD_PLAY", "EVIL_TRICKS"].includes(
          nextState.phase,
        )),
    terminalOutcome: nextState.outcome,
  };
}
