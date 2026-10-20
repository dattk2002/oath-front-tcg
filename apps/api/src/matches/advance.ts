import { chooseBotAction } from "@oathfront/bot";
import {
  describeAutomaticOperation,
  hasBotDecision,
  projectPlayerView,
  tutorialBotAction,
} from "@oathfront/game-engine";
import { recordAutomatic, recordIntent } from "./journal.js";
import type { Scheduler } from "./commands.js";
/** A single pure operation; service commands.ts owns all CPU and eight-operation budgeting. */
export const botScheduler: Scheduler = {
  canAdvance: (state, guard) =>
    describeAutomaticOperation(state, guard) !== null || hasBotDecision(state),
  step(state, seq, guard) {
    const operation = describeAutomaticOperation(state, guard);
    if (operation) {
      const result = recordAutomatic(state, seq, guard);
      return {
        ...result,
        botIntentsThisTurn:
          result.transition.nextState.turn === state.turn ? guard : 0,
      };
    }
    if (!hasBotDecision(state)) return null;
    const actor = state.humanSide === "GOOD" ? "EVIL" : "GOOD",
      view = projectPlayerView(state, actor);
    const scripted = tutorialBotAction(state);
    const decision = state.tutorial
      ? {
          action: scripted!,
          nextBotRandomState: state.random.states["bot:easy"],
        }
      : chooseBotAction(view, view.legalActions, {
          difficulty: state.difficulty,
          randomState: state.random.states["bot:easy"],
          observationMemory: [],
        });
    if (state.tutorial && !scripted)
      throw new RangeError("Missing tutorial bot action");
    const result = recordIntent(
      state,
      { actor, action: decision.action },
      "BOT",
      seq,
      decision.nextBotRandomState,
    );
    return {
      ...result,
      botIntentsThisTurn:
        result.transition.nextState.turn === state.turn ? guard + 1 : 0,
    };
  },
};
