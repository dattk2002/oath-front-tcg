import type {
  EntityRef,
  Selector,
  Target,
  Targeting,
  ModifierView,
} from "@oathfront/contracts";
import type { LaneId, MatchState, PlayerId, UnitState } from "./model.js";
export interface EffectContext {
  owner: PlayerId;
  definitionId: ModifierView["sourceDefinitionId"];
  instanceId: string | null;
  laneId: LaneId | null;
  target: Target;
  /** Corpse snapshot is retained for death hooks only. */
  corpse?: UnitState;
}
export const opposite = (side: PlayerId): PlayerId =>
  side === "GOOD" ? "EVIL" : "GOOD";
export const slot = (side: PlayerId): "good" | "evil" =>
  side === "GOOD" ? "good" : "evil";
export function orderedUnits(state: MatchState): UnitState[] {
  return state.board
    .flatMap((l) => [l.evil, l.good])
    .filter((u): u is UnitState => u !== null)
    .sort(
      (a, b) =>
        a.laneId - b.laneId ||
        (a.owner === "EVIL" ? 0 : 1) - (b.owner === "EVIL" ? 0 : 1) ||
        a.creationSeq - b.creationSeq ||
        (a.instanceId < b.instanceId
          ? -1
          : a.instanceId > b.instanceId
            ? 1
            : 0),
    );
}
export function findUnit(state: MatchState, id: string): UnitState | undefined {
  return orderedUnits(state).find(
    (u) => u.instanceId === id && u.current.hp > 0,
  );
}
export function sourceLane(
  state: MatchState,
  context: EffectContext,
): LaneId | null {
  return (
    (context.instanceId
      ? findUnit(state, context.instanceId)?.laneId
      : undefined) ??
    context.corpse?.laneId ??
    context.laneId
  );
}
export function legalTargets(
  state: MatchState,
  owner: PlayerId,
  targeting: Targeting,
): Target[] {
  const alive = orderedUnits(state).filter((u) => u.current.hp > 0),
    ally = alive.filter((u) => u.owner === owner),
    enemy = alive.filter((u) => u.owner !== owner);
  const unitRefs = (values: UnitState[]): Target[] =>
    values.map((u) => ({ kind: "UNIT", instanceId: u.instanceId }));
  switch (targeting.kind) {
    case "NONE":
      return [{ kind: "NONE" }];
    case "ALLY_UNIT":
      return unitRefs(ally);
    case "ENEMY_UNIT":
      return unitRefs(enemy);
    case "ENEMY_CHARACTER":
      return [
        ...unitRefs(enemy),
        ...(state.players[opposite(owner)].hp > 0
          ? [{ kind: "HERO" as const, side: opposite(owner) }]
          : []),
      ];
    case "EMPTY_ALLY_LANE":
      return state.board
        .filter((l) => !l[slot(owner)])
        .map((l) => ({ kind: "LANE", laneId: l.laneId }));
    case "MOVE_ALLY":
    case "MOVE_ENEMY":
      return (targeting.kind === "MOVE_ALLY" ? ally : enemy).flatMap((u) =>
        state.board
          .filter((l) => l.laneId !== u.laneId && !l[slot(u.owner)])
          .map((l) => ({
            kind: "UNIT_AND_LANE" as const,
            instanceId: u.instanceId,
            laneId: l.laneId,
          })),
      );
  }
}
export function targetEqual(a: Target, b: Target): boolean {
  return (
    a.kind === b.kind &&
    (!("instanceId" in a) ||
      ("instanceId" in b && a.instanceId === b.instanceId)) &&
    (!("side" in a) || ("side" in b && a.side === b.side)) &&
    (!("laneId" in a) || ("laneId" in b && a.laneId === b.laneId))
  );
}
export function resolveTargets(
  state: MatchState,
  context: EffectContext,
  selector: Selector,
): EntityRef[] {
  const units = orderedUnits(state).filter((u) => u.current.hp > 0),
    lane = sourceLane(state, context),
    enemy = opposite(context.owner);
  const selected = context.target;
  const selectedUnit =
    "instanceId" in selected ? findUnit(state, selected.instanceId) : undefined;
  const refs = (values: UnitState[]): EntityRef[] =>
    values.map((u) => ({ kind: "UNIT", instanceId: u.instanceId }));
  switch (selector) {
    case "SELF": {
      const u = context.instanceId
        ? findUnit(state, context.instanceId)
        : undefined;
      return u ? refs([u]) : [];
    }
    case "ALLY_HERO":
      return state.players[context.owner].hp > 0
        ? [{ kind: "HERO", side: context.owner }]
        : [];
    case "ENEMY_HERO":
      return state.players[enemy].hp > 0 ? [{ kind: "HERO", side: enemy }] : [];
    case "ENEMY_CHARACTER":
      if (selected.kind === "HERO")
        return selected.side === enemy && state.players[enemy].hp > 0
          ? [selected]
          : [];
      return selectedUnit && selectedUnit.owner === enemy
        ? refs([selectedUnit])
        : [];
    case "SELECTED_UNIT":
    case "ANY_UNIT":
      return selectedUnit ? refs([selectedUnit]) : [];
    case "ALLY_UNIT":
      return selectedUnit?.owner === context.owner ? refs([selectedUnit]) : [];
    case "ENEMY_UNIT":
      return selectedUnit?.owner === enemy ? refs([selectedUnit]) : [];
    case "ALLY_UNIT_HERE":
      return refs(
        units.filter((u) => u.owner === context.owner && u.laneId === lane),
      );
    case "ENEMY_UNIT_HERE":
      return refs(units.filter((u) => u.owner === enemy && u.laneId === lane));
    case "ALLY_ADJACENT":
      return refs(
        units.filter(
          (u) =>
            u.owner === context.owner &&
            lane !== null &&
            Math.abs(u.laneId - lane) === 1,
        ),
      );
    case "ENEMY_ADJACENT":
      return refs(
        units.filter(
          (u) =>
            u.owner === enemy &&
            lane !== null &&
            Math.abs(u.laneId - lane) === 1,
        ),
      );
    case "ALL_ALLY_UNITS":
      return refs(units.filter((u) => u.owner === context.owner));
    case "ALL_ENEMY_UNITS":
      return refs(units.filter((u) => u.owner === enemy));
    case "EMPTY_ALLY_LANE":
    case "EMPTY_UNIT_OWNER_LANE":
    case "SELECTED_LANE":
      return [];
  }
}

export function internalLaneId(value: number): LaneId {
  switch (value) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
      return value;
    default:
      throw new RangeError("Invalid lane");
  }
}
