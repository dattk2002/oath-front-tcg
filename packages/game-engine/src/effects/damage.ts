import type { DamagePacket, EntityRef, HpChange } from "@oathfront/contracts";
import type { MatchState, GameEvent, UnitState } from "../model.js";
import { findUnit, orderedUnits } from "../targets.js";
import { emitEvent } from "../events.js";
import { safeInteger, emitStatus } from "../modifiers.js";
import { damage } from "../rule-math.js";
export { damage } from "../rule-math.js";
export interface DamageInput {
  source: EntityRef | null;
  target: EntityRef;
  rawDamage: number;
  damageType: DamagePacket["damageType"];
  displayOrder?: 1 | 2 | null;
  /** Combat code determines block/power charge; mitigation still runs through the same packet path. */
  blocked?: boolean;
}
/** Applies the complete batch before deaths are removed; return positive surviving unit recipients. */
export function applyDamageBatchOnDraft(
  state: MatchState,
  events: GameEvent[],
  inputs: readonly DamageInput[],
  batchId?: string,
): UnitState[] {
  const packets: DamagePacket[] = [],
    changes = new Map<string, HpChange>(),
    recipients = new Set<string>();
  const livingAtEntry = new Map(
    orderedUnits(state)
      .filter((u) => u.current.hp > 0)
      .map((u) => [u.instanceId, u]),
  );
  const livingHeroes = new Set(
    (["GOOD", "EVIL"] as const).filter((side) => state.players[side].hp > 0),
  );
  for (const input of inputs) {
    const unit =
      input.target.kind === "UNIT"
        ? livingAtEntry.get(input.target.instanceId)
        : undefined;
    const hero =
      input.target.kind === "HERO"
        ? state.players[input.target.side]
        : undefined;
    // Only targets alive at primitive entry are eligible, even for duplicate packets.
    const key =
      input.target.kind === "UNIT"
        ? input.target.instanceId
        : input.target.side;
    if (!unit && !hero) continue;
    if (input.target.kind === "HERO" && !livingHeroes.has(input.target.side))
      continue;
    const raw = Math.max(0, safeInteger(input.rawDamage));
    const result = damage({
      raw,
      armor: unit?.statuses.armor ?? 0,
      shield: unit?.statuses.shield ?? false,
    });
    const blocked = input.blocked ?? false,
      finalDamage = blocked ? 0 : result.finalDamage,
      shieldConsumed = !blocked && result.shieldConsumed;
    if (unit && shieldConsumed) {
      const before = { ...unit.statuses };
      unit.statuses.shield = false;
      emitStatus(state, events, unit, before);
    }
    const before = unit?.current.hp ?? hero!.hp;
    const after = safeInteger(before - finalDamage);
    if (unit) {
      unit.current.hp = after;
      if (finalDamage > 0) recipients.add(unit.instanceId);
    } else hero!.hp = after;
    const existing = changes.get(key);
    if (existing) existing.after = after;
    else changes.set(key, { target: { ...input.target }, before, after });
    packets.push({
      source: input.source ? { ...input.source } : null,
      target: { ...input.target },
      damageType: input.damageType,
      rawDamage: raw,
      mitigatedDamage: raw - finalDamage,
      finalDamage,
      blocked,
      shieldConsumed,
      displayOrder: input.displayOrder ?? null,
    });
  }
  if (packets.length) {
    if (packets.length > 20) throw new RangeError("Damage batch packet limit");
    emitEvent(state, events, {
      kind: "DamageBatchResolved",
      visibility: "PUBLIC",
      ownerSide: null,
      payload: {
        batchId:
          batchId ?? `${state.matchId}:${state.rootSeq}:${state.eventSeq + 1}`,
        packets: [packets[0]!, ...packets.slice(1)],
        hpChanges: [...changes.values()],
      },
    });
  }
  return [...recipients].flatMap((id) => {
    const u = findUnit(state, id);
    return u ? [u] : [];
  });
}
