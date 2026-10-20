import type { Ability, Hook } from "@oathfront/contracts";
import { coreCatalog } from "@oathfront/game-content";
import type { MatchState, UnitState } from "../model.js";
import type { RootResolution } from "./resolve.js";
import { drainTriggersOnDraft } from "./resolve.js";
import { findUnit, slot, opposite } from "../targets.js";
export interface TriggerJob {
  source: UnitState;
  ability: Ability;
  generation: number;
  damaged: boolean;
}
export function triggerKey(unit: UnitState, ability: Ability): string {
  return `${unit.instanceId}:${ability.limit?.counterKey ?? ability.id}`;
}
export function enqueueHooksOnDraft(
  state: MatchState,
  root: RootResolution,
  hook: Hook,
  sources: readonly UnitState[],
  generation = root.generation + 1,
): void {
  const jobs = sources.flatMap((source) =>
    (
      coreCatalog.cards.find((c) => c.id === source.definitionId)?.abilities ??
      []
    )
      .filter((a) => a.hook === hook)
      .map((ability) => ({
        source: structuredClone(source),
        ability,
        generation,
        damaged: hook === "ON_DAMAGED",
      })),
  );
  jobs.sort(
    (a, b) =>
      a.source.laneId - b.source.laneId ||
      (a.source.owner === "EVIL" ? 0 : 1) -
        (b.source.owner === "EVIL" ? 0 : 1) ||
      a.source.creationSeq - b.source.creationSeq ||
      (a.ability.id < b.ability.id ? -1 : a.ability.id > b.ability.id ? 1 : 0),
  );
  root.queue.push(...jobs);
}
export function triggerEligible(state: MatchState, job: TriggerJob): boolean {
  const source = job.source,
    ability = job.ability,
    alive = findUnit(state, source.instanceId),
    lane = alive?.laneId ?? source.laneId;
  if (ability.hook !== "ON_DESTROYED" && !alive) return false;
  if (
    ability.limit &&
    (state.turnCounters[triggerKey(source, ability)] ?? 0) >=
      ability.limit.count
  )
    return false;
  return ability.conditions.every((condition) => {
    switch (condition) {
      case "SELF_ALIVE":
        return !!alive;
      case "SELF_DAMAGED":
        return job.damaged && !!alive;
      case "ENEMY_PRESENT_HERE":
        return (
          (state.board[lane - 1]![slot(opposite(source.owner))]?.current.hp ??
            0) > 0
        );
      case "EMPTY_LANE_HERE":
        return !state.board[lane - 1]![slot(source.owner)];
      case "FIRST_TIME_THIS_TURN":
        return (state.turnCounters[triggerKey(source, ability)] ?? 0) === 0;
    }
  });
}
/** Scheduled hook caller supplies eligible source snapshots; each call is inside an existing root. */
export function runHookOnDraft(
  state: MatchState,
  root: RootResolution,
  hook: Hook,
  sources: readonly UnitState[],
): void {
  enqueueHooksOnDraft(state, root, hook, sources);
  drainTriggersOnDraft(state, root);
}
