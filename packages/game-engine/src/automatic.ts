import type {
  AdvanceBudget,
  GameEvent,
  MatchState,
  TransitionResult,
} from "./model.js";
import { endTurnOnDraft, turnStartOnDraft } from "./end-turn.js";
import { transition } from "./events.js";
import { runRoot } from "./effects/resolve.js";
import {
  beforeCombatOnDraft,
  combatPairOnDraft,
  afterLaneOnDraft,
} from "./combat.js";
import { openNextBlockResponseOnDraft } from "./block.js";
import { changePhaseOnDraft } from "./phases.js";
import { internalLaneId } from "./targets.js";

/** No wall clock enters the engine. API CPU budgets can stop between these complete roots. */
export function advanceAutomatic(
  state: MatchState,
  budget: AdvanceBudget,
): TransitionResult {
  if (!Number.isSafeInteger(budget.maxRoots) || budget.maxRoots < 0)
    throw new RangeError("Invalid automatic root budget");
  let current = structuredClone(state);
  const events: GameEvent[] = [];
  for (let count = 0; count < Math.min(8, budget.maxRoots); count++) {
    if (
      current.lifecycle !== "ACTIVE" ||
      current.blockResponse ||
      !["COMBAT", "TURN_END", "TURN_START"].includes(current.phase)
    )
      break;
    const result = runRoot(current, (draft, root) => {
      if (draft.phase === "TURN_END") {
        endTurnOnDraft(draft, root);
        return;
      }
      if (draft.phase === "TURN_START") {
        turnStartOnDraft(draft, root);
        return;
      }
      const continuation = draft.continuation;
      if (!continuation) throw new RangeError("Missing combat continuation");
      const laneId = continuation.laneId;
      switch (continuation.stage) {
        case "BEFORE_PAIR":
          beforeCombatOnDraft(draft, root, laneId);
          break;
        case "PAIR":
          combatPairOnDraft(draft, root, laneId);
          continuation.stage = "BLOCK_RESPONSES";
          break;
        case "BLOCK_RESPONSES":
          openNextBlockResponseOnDraft(draft, root.events);
          break;
        case "AFTER_LANE":
          afterLaneOnDraft(draft, root, laneId);
          // The root checkpoint will end a lethal cascade; do not announce a following phase first.
          if (draft.players.GOOD.hp <= 0 || draft.players.EVIL.hp <= 0) break;
          if (laneId === 5) {
            draft.continuation = null;
            changePhaseOnDraft(draft, root.events, "TURN_END");
          } else {
            continuation.laneId = internalLaneId(laneId + 1);
            continuation.stage = "BEFORE_PAIR";
          }
          break;
      }
    });
    current = result.nextState;
    events.push(...result.events);
  }
  return transition(current, events);
}
