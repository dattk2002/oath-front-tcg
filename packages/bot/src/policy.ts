import type { PlayerView, PlayerAction } from "@oathfront/contracts";
import { nextInt } from "@oathfront/game-engine/random";
import type { BotContext, BotDecision } from "./model.js";
import { evaluateAction } from "./evaluate.js";
import { chooseMulligan, compare } from "./mulligan.js";
export function actionTieKey(view: PlayerView, action: PlayerAction): string[] {
  const id =
    "cardInstanceId" in action
      ? action.cardInstanceId
      : "powerInstanceId" in action
        ? action.powerInstanceId
        : "";
  const definitionId =
    [...view.self.hand, ...view.self.reserve].find((c) => c.instanceId === id)
      ?.definitionId ?? "";
  const target = "target" in action ? action.target : null;
  const lane =
    action.kind === "PLAY_UNIT"
      ? action.laneId
      : target && (target.kind === "LANE" || target.kind === "UNIT_AND_LANE")
        ? target.laneId
        : target?.kind === "UNIT"
          ? (view.board.find(
              (l) =>
                l.good?.instanceId === target.instanceId ||
                l.evil?.instanceId === target.instanceId,
            )?.laneId ?? "")
          : "";
  const instance =
    target && (target.kind === "UNIT" || target.kind === "UNIT_AND_LANE")
      ? target.instanceId
      : "";
  // Target kind/hero side only settle ties left unspecified by the five mandated fields.
  return [
    action.kind,
    definitionId,
    id,
    String(lane),
    instance,
    target?.kind ?? "",
    target?.kind === "HERO" ? target.side : "",
  ];
}
export function chooseBotAction(
  view: PlayerView,
  legal: PlayerAction[],
  context: BotContext,
): BotDecision {
  let randomState = context.randomState;
  const decide = (action: PlayerAction): BotDecision => ({
    action: structuredClone(action),
    nextBotRandomState: structuredClone(randomState),
  });
  const mulligan = chooseMulligan(view, legal);
  if (mulligan) return decide(mulligan);
  const ranked = legal
    .filter((a) =>
      ["PLAY_UNIT", "PLAY_TRICK", "USE_POWER", "USE_BLOCK_POWER"].includes(
        a.kind,
      ),
    )
    .map((action) => ({
      action,
      score: evaluateAction(view, action).score,
      key: actionTieKey(view, action),
    }))
    .filter((a) => a.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.key.reduce(
          (order, value, i) => order || compare(value, b.key[i]!),
          0,
        ),
    );
  if (ranked.length) {
    let index = 0;
    if (context.difficulty === "EASY") {
      const branch = nextInt(randomState, 10);
      randomState = branch.state;
      if (branch.value >= 7) {
        const choice = nextInt(randomState, Math.min(3, ranked.length));
        randomState = choice.state;
        index = choice.value;
      }
    }
    return decide(ranked[index]!.action);
  }
  const fallback =
    legal.find((a) => a.kind === "KEEP_BLOCK_POWER") ??
    legal.find((a) => a.kind === "PASS_PHASE");
  if (!fallback) throw new Error("No bot decision available");
  return decide(fallback);
}
