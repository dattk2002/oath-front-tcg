import type { PlayerAction, VisibleEvent } from "@oathfront/contracts";
import type { RandomState } from "@oathfront/game-engine";
export interface BotContext {
  difficulty: "EASY" | "NORMAL";
  randomState: RandomState;
  observationMemory: readonly VisibleEvent[];
}
export interface BotDecision {
  action: PlayerAction;
  nextBotRandomState: RandomState;
}
