import type { PlayerView, PlayerAction } from "@oathfront/contracts";
import {
  previewPublicAction,
  previewPublicLaneCombat,
} from "@oathfront/game-engine/preview";
export function evaluateAction(view: PlayerView, action: PlayerAction) {
  const preview = previewPublicAction(view, action);
  let heuristic = 0;
  const laneId =
    action.kind === "PLAY_UNIT"
      ? action.laneId
      : "target" in action &&
          (action.target.kind === "UNIT_AND_LANE" ||
            action.target.kind === "LANE")
        ? action.target.laneId
        : null;
  if (laneId !== null && preview.legal) {
    const own = view.self.side === "GOOD" ? "good" : "evil",
      enemy = own === "good" ? "evil" : "good";
    const before = view.board[laneId - 1]!,
      after = preview.board[laneId - 1]!;
    if (after[own] && after[own]?.instanceId !== before[own]?.instanceId) {
      const combatBefore = previewPublicLaneCombat(view, laneId);
      const future = structuredClone(view);
      future.board = preview.board;
      future.players = preview.players;
      const combatAfter = previewPublicLaneCombat(future, laneId),
        lane = combatAfter.board[laneId - 1]!;
      if (
        !before[own] &&
        combatBefore.ownHeroDamage > 0 &&
        combatAfter.ownHeroDamage < combatBefore.ownHeroDamage
      )
        heuristic = 1.5;
      else if (after[enemy] && !lane[enemy] && lane[own]) heuristic = 1;
    }
  }
  return {
    preview,
    heuristic,
    score:
      10000 * Number(preview.immediateWin) -
      10000 * Number(preview.immediateLoss) +
      3 * preview.enemyHeroDamage -
      4 * preview.ownHeroDamage +
      2 * preview.effectiveOwnHeroHeal +
      preview.deltaBoardValue +
      1.2 * preview.netCardsGained -
      0.35 * preview.energySpent +
      heuristic,
  };
}
