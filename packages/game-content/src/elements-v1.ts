import type {
  Ability,
  CardDefinition,
  CardId,
  CardRarity,
  Catalog,
  Effect,
  HeroDefinition,
  PowerDefinition,
  PowerId,
  PresetDTO,
  SystemId,
  Targeting,
} from "@oathfront/contracts";
import { heroesCatalog } from "./heroes-v1.js";
import { heroSystems, systemCards, systemDefinitions } from "./systems.js";

const rarityIds: Record<Exclude<CardRarity, "U" | "E">, readonly CardId[]> = {
  SL: ["B05", "V05", "P05", "F05", "X05", "S05"],
  SR: [
    "B03",
    "B04",
    "V04",
    "P04",
    "F04",
    "X04",
    "F08",
    "P08",
    "X08",
    "S08",
    "V06",
    "B08",
  ],
  R: [
    "B02",
    "V02",
    "V03",
    "P02",
    "P03",
    "F02",
    "F03",
    "X02",
    "X03",
    "S02",
    "S03",
    "B07",
    "P07",
    "X07",
    "V07",
    "V08",
    "S07",
    "F06",
  ],
};
const baseCards: CardDefinition[] = heroesCatalog.cards.map((original) => ({
  ...structuredClone(original),
  contentVersion: "elements_v1",
  classId:
    systemDefinitions.find((s) => systemCards[s.id].includes(original.id))
      ?.id ?? null,
  rarity: (Object.entries(rarityIds).find(([, ids]) =>
    ids.includes(original.id),
  )?.[0] ?? "U") as CardRarity,
}));
const heal = (
  targets: Extract<Effect, { kind: "HEAL" }>["targets"],
  amount: number,
): Effect => ({ kind: "HEAL", targets, amount });
const damage = (
  targets: Extract<Effect, { kind: "DAMAGE" }>["targets"],
  amount: number,
): Effect => ({ kind: "DAMAGE", targets, amount, damageKind: "EFFECT" });
const stats = (
  targets: Extract<Effect, { kind: "MODIFY_STATS" }>["targets"],
  attackDelta: number,
  healthDelta: number,
  duration: "PERMANENT" | "TURN_END" = "PERMANENT",
): Effect => ({
  kind: "MODIFY_STATS",
  targets,
  attackDelta,
  healthDelta,
  duration,
});
const draw = (count = 1): Effect => ({ kind: "DRAW", owner: "SELF", count });
const stun = (
  targets: Extract<Effect, { kind: "APPLY_STUN" }>["targets"],
): Effect => ({ kind: "APPLY_STUN", targets, duration: "TURN_END" });
const move: Effect = {
  kind: "MOVE_UNIT",
  targetUnit: "SELECTED_UNIT",
  targetLane: "SELECTED_LANE",
};
const shared = (
  system: SystemId,
  index: 1 | 2,
  name: string,
  kind: Targeting["kind"],
  text: string,
  effects: Effect[],
): PowerDefinition => ({
  id: `P_${system}${index}` as PowerId,
  contentVersion: "elements_v1",
  faction: "NEUTRAL",
  classId: system,
  signatureOwner: null,
  type: "SUPERPOWER",
  nameVi: name,
  baseCost: 1,
  targetKind: (
    {
      NONE: "NONE",
      ALLY_UNIT: "UNIT",
      ENEMY_UNIT: "UNIT",
      ENEMY_CHARACTER: "HERO_OR_UNIT",
      EMPTY_ALLY_LANE: "LANE",
      MOVE_ALLY: "UNIT_AND_LANE",
      MOVE_ENEMY: "UNIT_AND_LANE",
    } as const
  )[kind],
  targeting: { kind },
  validPhase: "OWNER_PLAY",
  effects,
  exactTextVi: text,
  artKey: `powers/p_${system.toLowerCase()}${index}.webp`,
  sfxFamily: systemDefinitions.find((s) => s.id === system)!.family,
  vfxFamily: systemDefinitions.find((s) => s.id === system)!.family,
});
export const systemPowers: PowerDefinition[] = [
  shared(
    "GROVE",
    1,
    "Verdant Pulse",
    "NONE",
    "Heal your hero 3 and all allied units 1.",
    [heal("ALLY_HERO", 3), heal("ALL_ALLY_UNITS", 1)],
  ),
  shared(
    "GROVE",
    2,
    "Rootguard",
    "ALLY_UNIT",
    "Give an allied unit +0/+2 permanently. Draw 1.",
    [stats("SELECTED_UNIT", 0, 2), draw()],
  ),
  shared(
    "TERRA",
    1,
    "Oathshield",
    "ALLY_UNIT",
    "Give an allied unit Shield. Draw 1.",
    [{ kind: "GRANT_SHIELD", targets: "SELECTED_UNIT" }, draw()],
  ),
  shared(
    "TERRA",
    2,
    "Stone Skin",
    "ALLY_UNIT",
    "Give an allied unit Armor and +0/+1 permanently.",
    [
      { kind: "GRANT_ARMOR", targets: "SELECTED_UNIT" },
      stats("SELECTED_UNIT", 0, 1),
    ],
  ),
  shared(
    "TIDE",
    1,
    "Undertow",
    "MOVE_ENEMY",
    "Move an enemy unit to an empty lane on its side.",
    [move],
  ),
  shared(
    "TIDE",
    2,
    "Stillwater",
    "ENEMY_UNIT",
    "Stun an enemy unit this turn. Heal your hero 1.",
    [stun("SELECTED_UNIT"), heal("ALLY_HERO", 1)],
  ),
  shared(
    "TEMPEST",
    1,
    "Slipstream",
    "MOVE_ALLY",
    "Move an allied unit to an empty allied lane. Give it +2 ATK this turn.",
    [move, stats("SELECTED_UNIT", 2, 0, "TURN_END")],
  ),
  shared(
    "TEMPEST",
    2,
    "Stormspark",
    "ENEMY_CHARACTER",
    "Deal 2 damage to an enemy unit or hero.",
    [damage("ENEMY_CHARACTER", 2)],
  ),
  shared(
    "SOLAR",
    1,
    "Radiant Surge",
    "ALLY_UNIT",
    "Give an allied unit +2 ATK this turn. Draw 1.",
    [stats("SELECTED_UNIT", 2, 0, "TURN_END"), draw()],
  ),
  shared("SOLAR", 2, "Sunwell", "NONE", "Heal your hero 4.", [
    heal("ALLY_HERO", 4),
  ]),
  shared(
    "FORGE",
    1,
    "Field Repair",
    "ALLY_UNIT",
    "Heal an allied unit 4. Draw 1.",
    [heal("SELECTED_UNIT", 4), draw()],
  ),
  shared(
    "FORGE",
    2,
    "Overclock",
    "ALLY_UNIT",
    "Give an allied unit +1/+1 permanently.",
    [stats("SELECTED_UNIT", 1, 1)],
  ),
  shared("ARCANE", 1, "Second Sight", "NONE", "Draw 2.", [draw(2)]),
  shared(
    "ARCANE",
    2,
    "Suspension",
    "ENEMY_UNIT",
    "Stun an enemy unit this turn. Draw 1.",
    [stun("SELECTED_UNIT"), draw()],
  ),
  shared("UMBRAL", 1, "Venom Thread", "ENEMY_UNIT", "Poison an enemy unit.", [
    { kind: "APPLY_POISON", targets: "SELECTED_UNIT" },
  ]),
  shared(
    "UMBRAL",
    2,
    "Fading Hex",
    "ENEMY_UNIT",
    "Give an enemy unit -2 ATK this turn. Draw 1.",
    [stats("SELECTED_UNIT", -2, 0, "TURN_END"), draw()],
  ),
];

type Trigger = [Ability["hook"], Effect[], Ability["conditions"]?];
const eventUnit = (
  index: number,
  system: SystemId,
  name: string,
  cost: number,
  attack: number,
  hp: number,
  keywords: CardDefinition["keywords"],
  text: string,
  triggers: Trigger[],
): CardDefinition => {
  const id = `E${String(index).padStart(2, "0")}` as CardId;
  const family = systemDefinitions.find((s) => s.id === system)!.family;
  return {
    id,
    contentVersion: "elements_v1",
    faction: index % 2 ? "GOOD" : "EVIL",
    classId: system,
    nameVi: name,
    type: "UNIT",
    cost,
    printed: { attack, hp },
    keywords,
    rarity: "E",
    effects: [],
    targeting: { kind: "NONE" },
    exactTextVi: text,
    artKey: `cards/${id.toLowerCase()}.webp`,
    sfxFamily: family,
    vfxFamily: family,
    abilities: triggers.map(([hook, effects, conditions = []], i) => {
      const limited = hook === "BEFORE_COMBAT_HERE" || hook === "ON_DAMAGED";
      return {
        id: `${id}:${hook}:${i}`,
        hook,
        effects,
        conditions: [
          ...conditions,
          ...(limited ? ["FIRST_TIME_THIS_TURN" as const] : []),
        ],
        limit: limited
          ? { scope: "GLOBAL_TURN", count: 1, counterKey: `${id}:${hook}:${i}` }
          : null,
        exactTextVi: text,
      };
    }),
  };
};
export const eventCards: CardDefinition[] = [
  eventUnit(
    1,
    "TERRA",
    "Oathglass Sentinel",
    3,
    2,
    3,
    ["SHIELD"],
    "Shield. When destroyed: heal your hero 2.",
    [["ON_DESTROYED", [heal("ALLY_HERO", 2)]]],
  ),
  eventUnit(
    2,
    "GROVE",
    "Moonpetal Keeper",
    3,
    2,
    3,
    [],
    "On play: heal your hero 2. End turn: heal this unit 1.",
    [
      ["ON_PLAY", [heal("ALLY_HERO", 2)]],
      ["ON_TURN_END", [heal("SELF", 1)], ["SELF_ALIVE"]],
    ],
  ),
  eventUnit(
    3,
    "SOLAR",
    "Sunflare Lynx",
    3,
    3,
    2,
    [],
    "On play: deal 1 to the enemy unit here. When destroyed: deal 1 to the enemy hero.",
    [
      ["ON_PLAY", [damage("ENEMY_UNIT_HERE", 1)]],
      ["ON_DESTROYED", [damage("ENEMY_HERO", 1)]],
    ],
  ),
  eventUnit(
    4,
    "UMBRAL",
    "Veilfin Stalker",
    3,
    2,
    3,
    [],
    "Before combat here, once per turn: gain +1 ATK this turn. When destroyed: poison the enemy unit here.",
    [
      ["BEFORE_COMBAT_HERE", [stats("SELF", 1, 0, "TURN_END")], ["SELF_ALIVE"]],
      ["ON_DESTROYED", [{ kind: "APPLY_POISON", targets: "ENEMY_UNIT_HERE" }]],
    ],
  ),
  eventUnit(
    5,
    "FORGE",
    "Cobalt Repairbot",
    2,
    1,
    4,
    [],
    "End turn: heal this unit 1.",
    [["ON_TURN_END", [heal("SELF", 1)], ["SELF_ALIVE"]]],
  ),
  eventUnit(
    6,
    "TIDE",
    "Rimewake Courier",
    4,
    2,
    5,
    [],
    "On play: stun the enemy unit here this turn. Heal your hero 1.",
    [["ON_PLAY", [stun("ENEMY_UNIT_HERE"), heal("ALLY_HERO", 1)]]],
  ),
  eventUnit(
    7,
    "TEMPEST",
    "Stormcrest Glider",
    4,
    3,
    3,
    ["PIERCE"],
    "Pierce. On play: gain +1 ATK this turn.",
    [["ON_PLAY", [stats("SELF", 1, 0, "TURN_END")]]],
  ),
  eventUnit(
    8,
    "ARCANE",
    "Chronicle Wisp",
    3,
    1,
    3,
    [],
    "On play: draw 1. When destroyed: draw 1.",
    [
      ["ON_PLAY", [draw()]],
      ["ON_DESTROYED", [draw()]],
    ],
  ),
  eventUnit(
    9,
    "GROVE",
    "Reedheart Guardian",
    4,
    3,
    3,
    [],
    "On play: heal your hero 1. When destroyed: summon a Seedling here if empty.",
    [
      ["ON_PLAY", [heal("ALLY_HERO", 1)]],
      [
        "ON_DESTROYED",
        [{ kind: "SUMMON_TOKEN", tokenId: "TK_G_SEED", laneSelector: "SELF" }],
        ["EMPTY_LANE_HERE"],
      ],
    ],
  ),
  eventUnit(
    10,
    "TERRA",
    "Cragbound Ram",
    4,
    3,
    4,
    ["ARMOR"],
    "Armor. When damaged, once per turn while alive: gain +1 ATK this turn.",
    [
      [
        "ON_DAMAGED",
        [stats("SELF", 1, 0, "TURN_END")],
        ["SELF_ALIVE", "SELF_DAMAGED"],
      ],
    ],
  ),
  eventUnit(
    11,
    "SOLAR",
    "Dawncomet Phoenix",
    6,
    5,
    4,
    ["PIERCE"],
    "Pierce. When destroyed: heal your hero 3.",
    [["ON_DESTROYED", [heal("ALLY_HERO", 3)]]],
  ),
  eventUnit(
    12,
    "UMBRAL",
    "Hollowmask Oracle",
    5,
    3,
    4,
    [],
    "On play: poison the enemy unit here. When destroyed: draw 1.",
    [
      ["ON_PLAY", [{ kind: "APPLY_POISON", targets: "ENEMY_UNIT_HERE" }]],
      ["ON_DESTROYED", [draw()]],
    ],
  ),
];
const originalNames: Record<string, [string, string]> = {
  H_G_BV: ["Briar", "The Rootbound Warden"],
  H_G_BP: ["Aster", "The Prism Vanguard"],
  H_G_VP: ["Lumen", "The Stormweaver"],
  H_E_FX: ["Cinder", "The Furnace Breaker"],
  H_E_FS: ["Vesper", "The Shard Duelist"],
  H_E_XS: ["Morrow", "The Rift Architect"],
  H_G_CAI: ["Cairn", "The Gravity Sentinel"],
  H_G_ROW: ["Rowan", "The Tidal Wanderer"],
};
const heroes: HeroDefinition[] = heroesCatalog.heroes.map((h) => {
  const [a, b] = heroSystems[h.id];
  return {
    ...structuredClone(h),
    nameVi: originalNames[h.id]?.[0] ?? h.nameVi,
    titleVi: originalNames[h.id]?.[1] ?? h.titleVi,
    classes: [a, b],
    powerIds: [
      `P_${a}1`,
      `P_${a}2`,
      `P_${b}1`,
      h.signaturePowerId,
    ] as HeroDefinition["powerIds"],
  };
});
const presets: PresetDTO[] = heroes.map((h) => {
  const ids = h.classes.flatMap((system) =>
    baseCards
      .filter((c) => c.classId === system)
      .sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id))
      .slice(0, 5)
      .map((c) => c.id),
  );
  const neutral: CardId[] = ["GC01", "GC02", "GC03", "EC01", "EC02"];
  return {
    presetId: h.id.replace("H_", "D_") as PresetDTO["presetId"],
    heroId: h.id,
    name: `${h.nameVi}'s Oath`,
    contentVersion: "elements_v1",
    strategyKey: `elements.${h.id}.strategy`,
    entries: [...ids, ...neutral].map((cardId) => ({
      cardId,
      quantity: 2,
    })) as PresetDTO["entries"],
  };
});
export const elementsCatalog: Catalog = {
  version: "elements_v1",
  rulesVersion: "rules_v1",
  locationVersion: "locations_v1",
  cards: [...baseCards, ...eventCards],
  heroes,
  powers: [
    ...systemPowers,
    ...heroesCatalog.powers
      .filter((p) => p.signatureOwner !== null)
      .map((p) => ({
        ...structuredClone(p),
        contentVersion: "elements_v1" as const,
      })),
  ],
  locations: structuredClone(heroesCatalog.locations),
  tokens: structuredClone(heroesCatalog.tokens),
  presets,
};
