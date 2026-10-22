import type {
  CardDefinitionView,
  ClassId,
  HeroDefinitionView,
  LocationDefinitionView,
  PowerDefinitionView,
  PresetDTO,
  Side,
  TokenDefinitionView,
  TokenId,
} from "./generated/api-v1.js";
export const selectors = [
  "SELF",
  "ALLY_UNIT",
  "ENEMY_UNIT",
  "ANY_UNIT",
  "ALLY_HERO",
  "ENEMY_HERO",
  "ENEMY_CHARACTER",
  "ALLY_UNIT_HERE",
  "ENEMY_UNIT_HERE",
  "ALLY_ADJACENT",
  "ENEMY_ADJACENT",
  "ALL_ALLY_UNITS",
  "ALL_ENEMY_UNITS",
  "EMPTY_ALLY_LANE",
  "EMPTY_UNIT_OWNER_LANE",
  "SELECTED_UNIT",
  "SELECTED_LANE",
] as const;
export type Selector = (typeof selectors)[number];
export type Duration = "PERMANENT" | "TURN_END";
export type Effect =
  | { kind: "DAMAGE"; targets: Selector; amount: number; damageKind: "EFFECT" }
  | { kind: "HEAL"; targets: Selector; amount: number }
  | {
      kind: "MODIFY_STATS";
      targets: Selector;
      attackDelta: number;
      healthDelta: number;
      duration: Duration;
    }
  | { kind: "GRANT_SHIELD" | "GRANT_ARMOR" | "APPLY_POISON"; targets: Selector }
  | { kind: "APPLY_STUN"; targets: Selector; duration: "TURN_END" }
  | { kind: "GRANT_PIERCE"; targets: Selector; duration: Duration }
  | {
      kind: "MOVE_UNIT";
      targetUnit: "SELECTED_UNIT";
      targetLane: "SELECTED_LANE";
    }
  | {
      kind: "SUMMON_TOKEN";
      tokenId: TokenId;
      laneSelector: "SELF" | "SELECTED_LANE";
    }
  | { kind: "DRAW"; owner: "SELF"; count: number };
export type Hook =
  | "ON_PLAY"
  | "BEFORE_COMBAT_HERE"
  | "ON_DAMAGED"
  | "ON_DESTROYED"
  | "ON_TURN_END";
export type Condition =
  | "SELF_ALIVE"
  | "SELF_DAMAGED"
  | "ENEMY_PRESENT_HERE"
  | "EMPTY_LANE_HERE"
  | "FIRST_TIME_THIS_TURN";
export interface Ability {
  id: string;
  hook: Hook;
  conditions: Condition[];
  effects: Effect[];
  limit: { scope: "GLOBAL_TURN"; count: 1; counterKey: string } | null;
  exactTextVi: string;
}
export interface Targeting {
  kind:
    | "NONE"
    | "ALLY_UNIT"
    | "ENEMY_UNIT"
    | "ENEMY_CHARACTER"
    | "EMPTY_ALLY_LANE"
    | "MOVE_ALLY"
    | "MOVE_ENEMY";
}
export type VfxFamily =
  "kinetic" | "shield" | "growth" | "prism" | "ember" | "ink" | "veil";
type WithAbilities<T> = T extends unknown
  ? Omit<T, "abilities"> & { abilities: Ability[] }
  : never;
export type CardDefinition = WithAbilities<CardDefinitionView> & {
  contentVersion: "core_v1";
  abilities: Ability[];
  effects: Effect[];
  targeting: Targeting;
  sfxFamily: VfxFamily;
  vfxFamily: VfxFamily;
};
export type ContentVersion = "core_v1" | "heroes_v1";
export type PowerDefinition = PowerDefinitionView & {
  contentVersion: ContentVersion;
  validPhase: "GOOD_PLAY" | "EVIL_TRICKS";
  effects: Effect[];
  targeting: Targeting;
  sfxFamily: VfxFamily;
  vfxFamily: VfxFamily;
};
export type HeroDefinition = HeroDefinitionView & { maxHp: 20 };
export type LocationRule =
  | { kind: "ENTRY_HEALTH"; amount: 1; duration: "PERMANENT" }
  | { kind: "AFTER_COMBAT_DAMAGE"; amount: 1; simultaneous: true }
  | {
      kind: "ATTACK_BONUS";
      amount: 1;
      condition: "PRINTED_ATTACK_AT_MOST_3" | "ENEMY_PRESENT_AT_SNAPSHOT";
      duration: "REGULAR_ATTACK";
    }
  | { kind: "ENTRY_EXHAUST"; duration: "TURN_END" }
  | { kind: "UNIT_COST"; amount: 1 }
  | { kind: "END_TURN_HEAL"; amount: 1 }
  | { kind: "NONE" };
export type LocationDefinition = LocationDefinitionView & {
  locationVersion: "locations_v1";
  rule: LocationRule;
};
export type TokenDefinition = TokenDefinitionView & {
  type: "TOKEN";
  contentVersion: "core_v1";
};
export interface Catalog {
  version: ContentVersion;
  rulesVersion: "rules_v1";
  locationVersion: "locations_v1";
  cards: CardDefinition[];
  heroes: HeroDefinition[];
  powers: PowerDefinition[];
  locations: LocationDefinition[];
  tokens: TokenDefinition[];
  presets: PresetDTO[];
}
export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}
export const classFactions: Record<ClassId, Side> = {
  BASTION: "GOOD",
  VERDANT: "GOOD",
  PRISM: "GOOD",
  FURNACE: "EVIL",
  HEX: "EVIL",
  VEIL: "EVIL",
};
