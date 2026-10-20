import type { Outcome, PlayerAction } from "@oathfront/contracts";
import type {
  MatchState,
  GameEvent,
  PlayerId,
  TransitionResult,
  ActionError,
} from "./model.js";
import { emitEvent, transition } from "./events.js";
export function finishMatchOnDraft(
  state: MatchState,
  events: GameEvent[],
  outcome: Outcome,
): void {
  state.outcome = outcome;
  state.lifecycle = "COMPLETED";
  state.activeSide = null;
  state.blockResponse = null;
  state.continuation = null;
  delete state.endTurn;
  const from = state.phase;
  state.phase = "GAME_OVER";
  emitEvent(state, events, {
    kind: "PhaseChanged",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: { from, to: "GAME_OVER", turn: state.turn },
  });
  emitEvent(state, events, {
    kind: "MatchEnded",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: { outcome: { ...outcome }, turn: state.turn },
  });
}
export function legalControlActions(
  state: MatchState,
  actor: PlayerId,
): PlayerAction[] {
  if (actor !== state.humanSide) return [];
  return state.lifecycle === "ACTIVE"
    ? [{ kind: "PAUSE" }, { kind: "SURRENDER" }]
    : state.lifecycle === "PAUSED"
      ? [{ kind: "RESUME" }, { kind: "SURRENDER" }]
      : [];
}
export function applyControlAction(
  state: MatchState,
  actor: PlayerId,
  action: PlayerAction,
): TransitionResult | ActionError {
  if (actor !== state.humanSide)
    return { kind: "error", code: "NOT_YOUR_TURN" };
  if (!["ACTIVE", "PAUSED"].includes(state.lifecycle))
    return { kind: "error", code: "MATCH_ENDED" };
  if (!legalControlActions(state, actor).some((a) => a.kind === action.kind))
    return { kind: "error", code: "WRONG_PHASE" };
  const draft = structuredClone(state),
    events: GameEvent[] = [];
  ++draft.rootSeq;
  if (action.kind === "SURRENDER")
    finishMatchOnDraft(draft, events, {
      result: "LOSS",
      winner: actor === "GOOD" ? "EVIL" : "GOOD",
      reason: "SURRENDER",
    });
  else {
    const from = draft.lifecycle;
    draft.lifecycle = action.kind === "PAUSE" ? "PAUSED" : "ACTIVE";
    emitEvent(draft, events, {
      kind: "LifecycleChanged",
      visibility: "PUBLIC",
      ownerSide: null,
      payload: {
        from,
        to: draft.lifecycle,
        reason: action.kind === "PAUSE" ? "PAUSE" : "RESUME",
      },
    });
  }
  return transition(draft, events);
}

/** Server-only administrative closure; never exposed as a PlayerAction. */
export function abandonMatch(
  state: MatchState,
  reason: "ACCOUNT_MERGE" | "EXPIRED",
): TransitionResult {
  if (!["ACTIVE", "PAUSED"].includes(state.lifecycle))
    throw new RangeError("Match already terminal");
  const draft = structuredClone(state),
    events: GameEvent[] = [];
  ++draft.rootSeq;
  finishMatchOnDraft(draft, events, { result: "NONE", winner: null, reason });
  draft.lifecycle = "ABANDONED";
  emitEvent(draft, events, {
    kind: "LifecycleChanged",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: { from: state.lifecycle, to: "ABANDONED", reason },
  });
  return transition(draft, events);
}
