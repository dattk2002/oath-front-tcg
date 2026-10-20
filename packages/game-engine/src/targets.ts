import type {
  EntityRef,
  Selector,
  Target,
  Targeting,
  ModifierView,
  UnitView,
} from "@oathfront/contracts";
import type { LaneId, PlayerId } from "./model.js";
export interface EffectContext {
  owner: PlayerId;
  definitionId: ModifierView["sourceDefinitionId"];
  instanceId: string | null;
  laneId: number | null;
  target: Target;
  /** Corpse snapshot is retained for death hooks only. */
  corpse?: UnitView;
}
export const opposite = (side: PlayerId): PlayerId =>
  side === "GOOD" ? "EVIL" : "GOOD";
export const slot = (side: PlayerId): "good" | "evil" =>
  side === "GOOD" ? "good" : "evil";
export interface RuleWorld<U extends UnitView = UnitView> {
  board: { laneId: number; good: U | null; evil: U | null }[];
  players: Record<PlayerId, { hp: number; maxHp: number }>;
}
export function orderedUnits<U extends UnitView>(state: RuleWorld<U>): U[] {
  return state.board
    .flatMap((l) => [l.evil, l.good])
    .filter((u): u is U => u !== null)
    .sort(
      (a, b) =>
        a.laneId - b.laneId ||
        (a.owner === "EVIL" ? 0 : 1) - (b.owner === "EVIL" ? 0 : 1) ||
        creationOrder(a) - creationOrder(b) ||
        (a.instanceId < b.instanceId
          ? -1
          : a.instanceId > b.instanceId
            ? 1
            : 0),
    );
}
export function findUnit<U extends UnitView>(
  state: RuleWorld<U>,
  id: string,
): U | undefined {
  return orderedUnits(state).find(
    (u) => u.instanceId === id && u.current.hp > 0,
  );
}
export function sourceLane(
  state: RuleWorld,
  context: EffectContext,
): number | null {
  return (
    (context.instanceId
      ? findUnit(state, context.instanceId)?.laneId
      : undefined) ??
    context.corpse?.laneId ??
    context.laneId
  );
}
export function legalTargets(
  state: RuleWorld,
  owner: PlayerId,
  targeting: Targeting,
): Target[] {
  const alive = orderedUnits(state).filter((u) => u.current.hp > 0),
    ally = alive.filter((u) => u.owner === owner),
    enemy = alive.filter((u) => u.owner !== owner);
  const unitRefs = (values: UnitView[]): Target[] =>
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
  state: RuleWorld,
  context: EffectContext,
  selector: Selector,
): EntityRef[] {
  const units = orderedUnits(state).filter((u) => u.current.hp > 0),
    lane = sourceLane(state, context),
    enemy = opposite(context.owner);
  const selected = context.target;
  const selectedUnit =
    "instanceId" in selected ? findUnit(state, selected.instanceId) : undefined;
  const refs = (values: UnitView[]): EntityRef[] =>
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

function creationOrder(unit: UnitView): number {
  return "creationSeq" in unit && typeof unit.creationSeq === "number"
    ? unit.creationSeq
    : 0;
}
