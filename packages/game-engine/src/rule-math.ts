import type { UnitView, ModifierView } from "@oathfront/contracts";
export function safeInteger(value: number): number {
  if (!Number.isSafeInteger(value))
    throw new RangeError("Engine integer overflow");
  return value;
}
/** Pure arithmetic adapter; not a gameplay action. mitigatedDamage is the amount prevented. */
export function damage(input: {
  raw: number;
  armor: number;
  shield: boolean;
}): { finalDamage: number; shieldConsumed: boolean; mitigatedDamage: number } {
  const raw = Math.max(0, safeInteger(input.raw)),
    afterArmor = Math.max(
      0,
      raw - Math.min(1, Math.max(0, safeInteger(input.armor))),
    ),
    shieldConsumed = afterArmor > 0 && input.shield;
  const finalDamage = shieldConsumed ? 0 : afterArmor;
  return { finalDamage, shieldConsumed, mitigatedDamage: raw - finalDamage };
}
export function applyStatModifier(
  unit: UnitView,
  modifier: ModifierView,
): void {
  unit.modifiers.push(modifier);
  unit.current.attack = Math.max(
    0,
    unit.modifiers.reduce(
      (sum, m) => safeInteger(sum + m.attackDelta),
      unit.printed.attack,
    ),
  );
  unit.current.maxHp = safeInteger(unit.current.maxHp + modifier.healthDelta);
  unit.current.hp = Math.min(
    unit.current.maxHp,
    safeInteger(unit.current.hp + modifier.healthDelta),
  );
}
export function attackValue(
  unit: UnitView,
  rule: import("@oathfront/contracts").LocationDefinition["rule"] | undefined,
  enemyPresent: boolean,
): number {
  const bonus =
    rule?.kind === "ATTACK_BONUS" &&
    ((rule.condition === "PRINTED_ATTACK_AT_MOST_3" &&
      unit.printed.attack <= 3) ||
      (rule.condition === "ENEMY_PRESENT_AT_SNAPSHOT" && enemyPresent))
      ? rule.amount
      : 0;
  return Math.max(0, safeInteger(unit.current.attack + bonus));
}
export function newUnit(
  definition:
    | import("@oathfront/contracts").CardDefinition
    | import("@oathfront/contracts").TokenDefinition,
  owner: "GOOD" | "EVIL",
  laneId: number,
  instanceId: string,
): UnitView {
  if (!definition.printed) throw new TypeError("Unit definition required");
  const printed = { ...definition.printed, maxHp: definition.printed.hp };
  const keywords: readonly string[] = definition.keywords;
  return {
    instanceId,
    definitionId: definition.id,
    owner,
    laneId,
    isToken: definition.type === "TOKEN",
    printed,
    current: { ...printed },
    statuses: {
      shield: keywords.includes("SHIELD"),
      armor: keywords.includes("ARMOR") ? 1 : 0,
      poisoned: false,
      stunned: false,
      exhausted: false,
      pierce: keywords.includes("PIERCE"),
    },
    modifiers: [],
    lastRegularAttackTurn: null,
  };
}
/** Returns whether this positive regular-attack hero packet is blocked; cap disables charge. */
export function chargeBlock(
  meter: import("@oathfront/contracts").HeroView["block"],
): boolean {
  if (meter.used >= 3) return false;
  const next = meter.charge + 2;
  if (next >= 8) {
    meter.charge = 0;
    meter.used++;
    meter.active = meter.used < 3;
    return true;
  }
  if (next === 2 || next === 4 || next === 6) meter.charge = next;
  return false;
}
