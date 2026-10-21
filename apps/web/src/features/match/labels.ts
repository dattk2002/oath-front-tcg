import type {
  ClassId,
  Phase,
  Side,
  UnitView,
  VisibleEvent,
} from "@oathfront/contracts";
export const factionLabel: Record<Side, string> = {
  GOOD: "Dawnward",
  EVIL: "Ashen Court",
};
export const sideLabel = factionLabel;
export const phaseLabel: Record<Phase, string> = {
  MULLIGAN: "Mulligan",
  TURN_START: "Turn start",
  EVIL_DEPLOY: "Ashen deployment",
  GOOD_PLAY: "Dawnward play",
  EVIL_TRICKS: "Ashen tricks",
  COMBAT: "Combat",
  TURN_END: "Turn end",
  GAME_OVER: "Match ended",
};
export const classLabel: Record<ClassId, string> = {
  BASTION: "Bastion",
  VERDANT: "Verdant",
  PRISM: "Prism",
  FURNACE: "Furnace",
  HEX: "Hex",
  VEIL: "Veil",
};
export const keywordLabel: Record<string, string> = {
  SHIELD: "Shield",
  ARMOR: "Armor",
  POISONED: "Poison",
  STUNNED: "Stun",
  EXHAUSTED: "Exhausted",
  PIERCE: "Pierce",
  MOVE: "Move",
};
export function unitStatuses(unit: UnitView) {
  return Object.entries(unit.statuses)
    .filter(([, value]) => !!value)
    .map(
      ([key, value]) =>
        `${keywordLabel[key.toUpperCase()]}${typeof value === "number" ? ` ${value}` : ""}`,
    );
}

export const eventLabel: Partial<Record<VisibleEvent["kind"], string>> = {
  MatchStarted: "Match started",
  MulliganCommitted: "Mulligan confirmed",
  CardPlayed: "Card played",
  CardDrawn: "Card drawn",
  HandCountChanged: "Hand count changed",
  AttackDeclared: "Attack declared",
  UnitMoved: "Unit moved",
  StatsChanged: "Stats changed",
  StatusChanged: "Unit status changed",
  HeroHealed: "Hero healed",
  BlockOccurred: "Attack blocked",
  MatchEnded: "Match ended",
  UnitCreated: "Unit deployed",
  PowerUsed: "Power used",
  PhaseChanged: "Phase changed",
  TurnStarted: "Turn started",
  UnitDestroyed: "Unit destroyed",
  DamageBatchResolved: "Damage resolved",
  LocationRevealed: "Location revealed",
  LifecycleChanged: "Match state changed",
};
