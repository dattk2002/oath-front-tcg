import type { MatchState, GameEvent } from "./model.js";
import { getLegalActions } from "./actions.js";
import { emitEvent, transition } from "./events.js";
/** Server orchestration only. Human waiting and automatic roots always retain priority. */
export function hasBotDecision(state: MatchState): boolean {
  if (state.lifecycle !== "ACTIVE") return false;
  const humanWaiting = getLegalActions(state, state.humanSide).some(
    (a) => !["ADVANCE", "PAUSE", "SURRENDER"].includes(a.kind),
  );
  if (humanWaiting) return false;
  const bot = state.humanSide === "GOOD" ? "EVIL" : "GOOD";
  return getLegalActions(state, bot).some((a) =>
    [
      "MULLIGAN",
      "PLAY_UNIT",
      "PLAY_TRICK",
      "USE_POWER",
      "USE_BLOCK_POWER",
      "KEEP_BLOCK_POWER",
      "PASS_PHASE",
    ].includes(a.kind),
  );
}
export function applyBotGuardFault(
  state: MatchState,
  botIntentsThisTurn: number,
) {
  if (botIntentsThisTurn !== 64 || !hasBotDecision(state))
    throw new RangeError("Invalid bot guard fault");
  const draft = structuredClone(state),
    events: GameEvent[] = [];
  ++draft.rootSeq;
  draft.lifecycle = "FAULTED";
  emitEvent(draft, events, {
    kind: "BotGuardFault",
    visibility: "SERVER",
    ownerSide: null,
    payload: { turn: draft.turn, botIntents: 64 },
  });
  emitEvent(draft, events, {
    kind: "LifecycleChanged",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: { from: state.lifecycle, to: "FAULTED", reason: "FAULT" },
  });
  return transition(draft, events);
}
