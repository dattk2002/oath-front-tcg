import { classFactions, selectors, validateWire } from "@oathfront/contracts";
import type {
  Ability,
  CardDefinition,
  Catalog,
  DeckInput,
  DeckIssue,
  DeckValidation,
  Effect,
  HeroDefinition,
  LocationDefinition,
  Targeting,
  ValidationIssue,
} from "@oathfront/contracts";

type RecordValue = Record<string, unknown>;
const object = (v: unknown): v is RecordValue =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const integer = (v: unknown, min = 0): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= min;
const nonempty = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0;
const oneOf = (v: unknown, choices: readonly unknown[]) => choices.includes(v);
const duration = (v: unknown) => oneOf(v, ["PERMANENT", "TURN_END"]);
const selector = (v: unknown) =>
  oneOf(v, selectors) &&
  !oneOf(v, ["EMPTY_ALLY_LANE", "EMPTY_UNIT_OWNER_LANE", "SELECTED_LANE"]);
const unitSelector = (v: unknown) =>
  selector(v) && !oneOf(v, ["ALLY_HERO", "ENEMY_HERO", "ENEMY_CHARACTER"]);
const exactKeys = (v: RecordValue, keys: string[]) =>
  Object.keys(v).length === keys.length &&
  keys.every((k) => Object.hasOwn(v, k));
const without = <T extends object>(v: T, keys: string[]): RecordValue =>
  Object.fromEntries(Object.entries(v).filter(([k]) => !keys.includes(k)));
const hooks = [
  "ON_PLAY",
  "BEFORE_COMBAT_HERE",
  "ON_DAMAGED",
  "ON_DESTROYED",
  "ON_TURN_END",
];
const conditions = [
  "SELF_ALIVE",
  "SELF_DAMAGED",
  "ENEMY_PRESENT_HERE",
  "EMPTY_LANE_HERE",
  "FIRST_TIME_THIS_TURN",
];
const targetKinds = [
  "NONE",
  "ALLY_UNIT",
  "ENEMY_UNIT",
  "ENEMY_CHARACTER",
  "EMPTY_ALLY_LANE",
  "MOVE_ALLY",
  "MOVE_ENEMY",
];
const families = [
  "kinetic",
  "shield",
  "growth",
  "prism",
  "ember",
  "ink",
  "veil",
];

/** Closed primitive registry: unknown operations and extra payload fields are rejected. */
export function isEffect(value: unknown): value is Effect {
  if (!object(value)) return false;
  const v = value;
  const keys = (names: string[]) => exactKeys(v, ["kind", ...names]);
  switch (v.kind) {
    case "DAMAGE":
      return (
        keys(["targets", "amount", "damageKind"]) &&
        selector(v.targets) &&
        integer(v.amount) &&
        v.damageKind === "EFFECT"
      );
    case "HEAL":
      return (
        keys(["targets", "amount"]) && selector(v.targets) && integer(v.amount)
      );
    case "MODIFY_STATS":
      return (
        keys(["targets", "attackDelta", "healthDelta", "duration"]) &&
        unitSelector(v.targets) &&
        integer(v.attackDelta, Number.MIN_SAFE_INTEGER) &&
        integer(v.healthDelta) &&
        duration(v.duration)
      );
    case "GRANT_SHIELD":
    case "GRANT_ARMOR":
    case "APPLY_POISON":
      return keys(["targets"]) && unitSelector(v.targets);
    case "APPLY_STUN":
      return (
        keys(["targets", "duration"]) &&
        unitSelector(v.targets) &&
        v.duration === "TURN_END"
      );
    case "GRANT_PIERCE":
      return (
        keys(["targets", "duration"]) &&
        unitSelector(v.targets) &&
        duration(v.duration)
      );
    case "MOVE_UNIT":
      return (
        keys(["targetUnit", "targetLane"]) &&
        v.targetUnit === "SELECTED_UNIT" &&
        v.targetLane === "SELECTED_LANE"
      );
    case "SUMMON_TOKEN":
      return (
        keys(["tokenId", "laneSelector"]) &&
        nonempty(v.tokenId) &&
        oneOf(v.laneSelector, ["SELF", "SELECTED_LANE"])
      );
    case "DRAW":
      return (
        keys(["owner", "count"]) && v.owner === "SELF" && integer(v.count, 1)
      );
    default:
      return false;
  }
}
function validTargeting(v: unknown): v is Targeting {
  return object(v) && exactKeys(v, ["kind"]) && oneOf(v.kind, targetKinds);
}
function validAbility(v: unknown): v is Ability {
  if (
    !object(v) ||
    !exactKeys(v, [
      "id",
      "hook",
      "conditions",
      "effects",
      "limit",
      "exactTextVi",
    ])
  )
    return false;
  if (
    !nonempty(v.id) ||
    !oneOf(v.hook, hooks) ||
    !nonempty(v.exactTextVi) ||
    !Array.isArray(v.conditions) ||
    !v.conditions.every((c) => oneOf(c, conditions)) ||
    new Set(v.conditions).size !== v.conditions.length ||
    !Array.isArray(v.effects) ||
    !v.effects.length ||
    !v.effects.every(isEffect)
  )
    return false;
  const limited = oneOf(v.hook, ["ON_DAMAGED", "BEFORE_COMBAT_HERE"]);
  if (
    v.limit !== null &&
    (!object(v.limit) ||
      !exactKeys(v.limit, ["scope", "count", "counterKey"]) ||
      v.limit.scope !== "GLOBAL_TURN" ||
      v.limit.count !== 1 ||
      !nonempty(v.limit.counterKey))
  )
    return false;
  if (
    limited &&
    (v.limit === null || !v.conditions.includes("FIRST_TIME_THIS_TURN"))
  )
    return false;
  if (v.hook === "ON_DAMAGED" && !v.conditions.includes("SELF_DAMAGED"))
    return false;
  // Triggers are deterministic and must never ask the player for a new selection.
  return v.effects.every(
    (e) =>
      !Object.values(e).some(
        (x) => x === "SELECTED_UNIT" || x === "SELECTED_LANE",
      ),
  );
}
function validRule(location: LocationDefinition): boolean {
  const v: unknown = location.rule;
  if (!object(v)) return false;
  switch (v.kind) {
    case "ENTRY_HEALTH":
      return (
        exactKeys(v, ["kind", "amount", "duration"]) &&
        v.amount === 1 &&
        v.duration === "PERMANENT" &&
        location.hook === "ON_UNIT_PLAYED"
      );
    case "AFTER_COMBAT_DAMAGE":
      return (
        exactKeys(v, ["kind", "amount", "simultaneous"]) &&
        v.amount === 1 &&
        v.simultaneous === true &&
        location.hook === "AFTER_LANE_COMBAT"
      );
    case "ATTACK_BONUS":
      return (
        exactKeys(v, ["kind", "amount", "condition", "duration"]) &&
        v.amount === 1 &&
        oneOf(v.condition, [
          "PRINTED_ATTACK_AT_MOST_3",
          "ENEMY_PRESENT_AT_SNAPSHOT",
        ]) &&
        v.duration === "REGULAR_ATTACK" &&
        location.hook === "BEFORE_ATTACK"
      );
    case "ENTRY_EXHAUST":
      return (
        exactKeys(v, ["kind", "duration"]) &&
        v.duration === "TURN_END" &&
        location.hook === "ON_UNIT_PLAYED"
      );
    case "UNIT_COST":
      return (
        exactKeys(v, ["kind", "amount"]) &&
        v.amount === 1 &&
        location.hook === "COST_MODIFIER"
      );
    case "END_TURN_HEAL":
      return (
        exactKeys(v, ["kind", "amount"]) &&
        v.amount === 1 &&
        location.hook === "END_TURN"
      );
    case "NONE":
      return exactKeys(v, ["kind"]) && location.hook === "NONE";
    default:
      return false;
  }
}
export function eligibleCards(
  hero: HeroDefinition,
  catalog: Catalog,
): CardDefinition[] {
  return catalog.cards.filter(
    (c) =>
      c.faction === hero.faction &&
      (c.classId === null || hero.classes.includes(c.classId)),
  );
}
export function validateDeck(
  deck: DeckInput,
  catalog: Catalog,
): DeckValidation {
  const issues: DeckIssue[] = [];
  const add = (code: DeckIssue["code"], cardId: string | null = null) =>
    issues.push({ code, cardId, messageKey: `deck.${code.toLowerCase()}` });
  if (deck.contentVersion !== catalog.version) add("VERSION_UNSUPPORTED");
  const hero = catalog.heroes.find((h) => h.id === deck.heroId);
  if (!hero) add("WRONG_FACTION");
  const seen = new Set<string>();
  let totalCards = 0;
  for (const entry of deck.entries) {
    if (seen.has(entry.cardId)) add("DUPLICATE_CARD_ID", entry.cardId);
    seen.add(entry.cardId);
    if (!integer(entry.quantity, 1) || entry.quantity > 2)
      add("TOO_MANY_COPIES", entry.cardId);
    if (integer(entry.quantity, 1)) totalCards += entry.quantity;
    const card = catalog.cards.find((c) => c.id === entry.cardId);
    if (!card) add("UNKNOWN_CARD", entry.cardId);
    else if (hero && card.faction !== hero.faction)
      add("WRONG_FACTION", entry.cardId);
    else if (
      hero &&
      card.classId !== null &&
      !hero.classes.includes(card.classId)
    )
      add("WRONG_CLASS", entry.cardId);
  }
  if (totalCards !== 30) add("TOTAL_NOT_30");
  return { playable: issues.length === 0, totalCards, issues };
}
export function validateCatalog(catalog: Catalog): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (path: string, code: string, message = code) =>
    issues.push({ path, code, message });
  if (
    !catalog ||
    !Array.isArray(catalog.cards) ||
    !Array.isArray(catalog.powers) ||
    !Array.isArray(catalog.heroes) ||
    !Array.isArray(catalog.locations) ||
    !Array.isArray(catalog.tokens) ||
    !Array.isArray(catalog.presets)
  )
    return [
      {
        path: "catalog",
        code: "INVALID_SHAPE",
        message: "Catalog collections must be arrays",
      },
    ];
  if (
    [
      ...catalog.cards,
      ...catalog.powers,
      ...catalog.heroes,
      ...catalog.locations,
      ...catalog.tokens,
      ...catalog.presets,
    ].some((entry) => !object(entry))
  )
    return [
      {
        path: "catalog",
        code: "INVALID_DEFINITION",
        message: "Definitions must be objects",
      },
    ];
  if (
    !exactKeys(catalog as unknown as RecordValue, [
      "version",
      "rulesVersion",
      "locationVersion",
      "cards",
      "heroes",
      "powers",
      "locations",
      "tokens",
      "presets",
    ]) ||
    catalog.version !== "core_v1" ||
    catalog.rulesVersion !== "rules_v1" ||
    catalog.locationVersion !== "locations_v1"
  )
    add("catalog", "INVALID_VERSION_OR_FIELDS");
  for (const [name, count] of [
    ["cards", 60],
    ["powers", 18],
    ["heroes", 6],
    ["locations", 8],
    ["tokens", 3],
    ["presets", 6],
  ] as const) {
    const entries = catalog[name];
    if (entries.length !== count) add(name, "INVALID_COUNT");
    const seen = new Set<string>();
    entries.forEach((entry, i) => {
      const id = "id" in entry ? entry.id : entry.presetId;
      if (seen.has(id)) add(`${name}.${i}`, "DUPLICATE_ID");
      seen.add(id);
    });
  }
  const effects = (
    values: Effect[],
    path: string,
    faction: string,
    targeting?: Targeting,
  ) => {
    if (!Array.isArray(values)) {
      add(path, "INVALID_EFFECTS");
      return;
    }
    values.forEach((effect, i) => {
      const p = `${path}.${i}`;
      if (!isEffect(effect)) {
        add(p, "INVALID_EFFECT");
        return;
      }
      if (effect.kind === "SUMMON_TOKEN") {
        const token = catalog.tokens.find((t) => t.id === effect.tokenId);
        if (!token || token.tutorialOnly || token.faction !== faction)
          add(p, "INVALID_TOKEN");
      }
      if (
        targeting &&
        Object.values(effect).includes("SELECTED_UNIT") &&
        !oneOf(targeting.kind, [
          "ALLY_UNIT",
          "ENEMY_UNIT",
          "MOVE_ALLY",
          "MOVE_ENEMY",
        ])
      )
        add(p, "MISSING_UNIT_TARGET");
      if (
        targeting &&
        Object.values(effect).includes("SELECTED_LANE") &&
        !oneOf(targeting.kind, ["EMPTY_ALLY_LANE", "MOVE_ALLY", "MOVE_ENEMY"])
      )
        add(p, "MISSING_LANE_TARGET");
      if (
        targeting &&
        "targets" in effect &&
        effect.targets === "ENEMY_CHARACTER" &&
        targeting.kind !== "ENEMY_CHARACTER"
      )
        add(p, "MISSING_CHARACTER_TARGET");
    });
  };
  for (const [i, card] of catalog.cards.entries()) {
    const path = `cards.${i}`;
    if (
      !Array.isArray(card.effects) ||
      !Array.isArray(card.abilities) ||
      !validTargeting(card.targeting) ||
      !nonempty(card.id) ||
      card.abilities.some((a) => !object(a))
    ) {
      add(path, "INVALID_CARD_SHAPE");
      continue;
    }
    const view = without(card, [
      "contentVersion",
      "effects",
      "targeting",
      "sfxFamily",
      "vfxFamily",
    ]);
    if (Array.isArray(card.abilities))
      view.abilities = card.abilities.map((a) =>
        without(a, ["conditions", "effects", "limit"]),
      );
    if (!validateWire("CardDefinitionView", view)) add(path, "INVALID_CARD");
    if (
      card.contentVersion !== catalog.version ||
      !oneOf(card.vfxFamily, families) ||
      !oneOf(card.sfxFamily, families) ||
      !validTargeting(card.targeting)
    )
      add(path, "INVALID_METADATA");
    if (card.classId && classFactions[card.classId] !== card.faction)
      add(path, "WRONG_CLASS_FACTION");
    if (card.artKey !== `cards/${card.id.toLowerCase()}.webp`)
      add(path, "INVALID_ART_KEY");
    effects(card.effects, `${path}.effects`, card.faction, card.targeting);
    if (!Array.isArray(card.abilities)) add(path, "INVALID_ABILITIES");
    else {
      const seen = new Set<string>();
      card.abilities.forEach((ability, j) => {
        const p = `${path}.abilities.${j}`;
        if (
          !validAbility(ability) ||
          seen.has(ability.id) ||
          ability.exactTextVi !== card.exactTextVi
        )
          add(p, "INVALID_ABILITY");
        seen.add(ability.id);
        effects(ability.effects, p, card.faction);
      });
    }
    if (
      card.type === "UNIT" &&
      (card.effects.length || card.targeting.kind !== "NONE")
    )
      add(path, "UNIT_ACTION_EFFECTS");
    if (
      card.type === "TRICK" &&
      (!card.effects.length || card.abilities.length)
    )
      add(path, "INVALID_TRICK");
  }
  if (catalog.cards.filter((c) => c.type === "UNIT").length !== 38)
    add("cards", "INVALID_UNIT_COUNT");
  for (const side of ["GOOD", "EVIL"] as const) {
    if (
      catalog.cards.filter((c) => c.faction === side && c.type === "UNIT")
        .length !== 19 ||
      catalog.cards.filter((c) => c.faction === side && c.type === "TRICK")
        .length !== 11 ||
      catalog.cards.filter((c) => c.faction === side && c.classId === null)
        .length !== 6
    )
      add("cards", "INVALID_FACTION_COUNTS");
  }
  for (const classId of Object.keys(classFactions))
    if (catalog.cards.filter((c) => c.classId === classId).length !== 8)
      add("cards", "INVALID_CLASS_COUNT");
  for (const [i, power] of catalog.powers.entries()) {
    const path = `powers.${i}`;
    if (
      !Array.isArray(power.effects) ||
      !validTargeting(power.targeting) ||
      !nonempty(power.id)
    ) {
      add(path, "INVALID_POWER_SHAPE");
      continue;
    }
    if (
      !validateWire(
        "PowerDefinitionView",
        without(power, [
          "contentVersion",
          "validPhase",
          "effects",
          "targeting",
          "sfxFamily",
          "vfxFamily",
        ]),
      )
    )
      add(path, "INVALID_POWER");
    if (
      power.contentVersion !== catalog.version ||
      !validTargeting(power.targeting) ||
      !oneOf(power.sfxFamily, families) ||
      !oneOf(power.vfxFamily, families) ||
      power.validPhase !==
        (power.faction === "GOOD" ? "GOOD_PLAY" : "EVIL_TRICKS")
    )
      add(path, "INVALID_METADATA");
    const expected = {
      NONE: "NONE",
      ALLY_UNIT: "UNIT",
      ENEMY_UNIT: "UNIT",
      ENEMY_CHARACTER: "HERO_OR_UNIT",
      EMPTY_ALLY_LANE: "LANE",
      MOVE_ALLY: "UNIT_AND_LANE",
      MOVE_ENEMY: "UNIT_AND_LANE",
    } as const;
    if (power.targetKind !== expected[power.targeting.kind])
      add(path, "INVALID_TARGET_KIND");
    if (
      power.classId !== null
        ? power.signatureOwner !== null ||
          classFactions[power.classId] !== power.faction
        : !catalog.heroes.some(
            (h) =>
              h.id === power.signatureOwner &&
              h.faction === power.faction &&
              h.signaturePowerId === power.id,
          )
    )
      add(path, "INVALID_POWER_OWNER");
    if (!power.effects.length) add(path, "EMPTY_EFFECTS");
    effects(power.effects, `${path}.effects`, power.faction, power.targeting);
    if (power.artKey !== `powers/${power.id.toLowerCase()}.webp`)
      add(path, "INVALID_ART_KEY");
  }
  for (const [i, hero] of catalog.heroes.entries()) {
    const path = `heroes.${i}`;
    if (
      !Array.isArray(hero.classes) ||
      !Array.isArray(hero.powerIds) ||
      !nonempty(hero.id)
    ) {
      add(path, "INVALID_HERO_SHAPE");
      continue;
    }
    if (
      !validateWire("HeroDefinitionView", without(hero, ["maxHp"])) ||
      hero.maxHp !== 20
    )
      add(path, "INVALID_HERO");
    if (
      hero.classes.some((c) => classFactions[c] !== hero.faction) ||
      eligibleCards(hero, catalog).length !== 22
    )
      add(path, "INVALID_HERO_CLASSES");
    if (!hero.powerIds.includes(hero.signaturePowerId))
      add(path, "MISSING_SIGNATURE");
    for (const id of hero.powerIds) {
      const power = catalog.powers.find((p) => p.id === id);
      if (
        !power ||
        power.faction !== hero.faction ||
        (power.classId !== null
          ? !hero.classes.includes(power.classId)
          : power.signatureOwner !== hero.id)
      )
        add(path, "INVALID_HERO_POWER");
    }
    const signature = catalog.powers.find(
      (p) => p.id === hero.signaturePowerId,
    );
    if (!signature || signature.signatureOwner !== hero.id)
      add(path, "INVALID_SIGNATURE");
    if (hero.portraitKey !== `heroes/${hero.id.toLowerCase()}/portrait.webp`)
      add(path, "INVALID_ART_KEY");
  }
  for (const [i, location] of catalog.locations.entries()) {
    if (
      !validateWire(
        "LocationDefinitionView",
        without(location, ["locationVersion", "rule"]),
      ) ||
      location.locationVersion !== catalog.locationVersion ||
      !validRule(location)
    )
      add(`locations.${i}`, "INVALID_LOCATION");
  }
  for (const [i, token] of catalog.tokens.entries()) {
    if (
      !validateWire(
        "TokenDefinitionView",
        without(token, ["type", "contentVersion"]),
      ) ||
      token.type !== "TOKEN" ||
      token.contentVersion !== catalog.version ||
      token.tutorialOnly !== (token.id === "TK_G_LANTERN")
    )
      add(`tokens.${i}`, "INVALID_TOKEN");
  }
  for (const [i, preset] of catalog.presets.entries()) {
    if (!validateWire("PresetDTO", preset as unknown)) {
      add(`presets.${i}`, "INVALID_PRESET");
      if (
        !Array.isArray(preset.entries) ||
        preset.entries.some((e) => !object(e))
      )
        continue;
    }
    for (const issue of validateDeck(preset, catalog).issues)
      add(`presets.${i}`, issue.code);
  }
  return issues;
}
