import type { EntityRef, VisibleEvent } from "@oathfront/contracts";
import { coreCatalog } from "@oathfront/game-content";
import type { LaneId, MatchState } from "./model.js";
import { regularAttackValue } from "./modifiers.js";
import { orderedUnits, opposite, slot } from "./targets.js";
import { emitEvent } from "./events.js";
import { enqueueHooksOnDraft } from "./effects/triggers.js";
import { applyDamageBatchOnDraft } from "./effects/damage.js";
import type { DamageInput } from "./effects/damage.js";
import { drainTriggersOnDraft, settleOnDraft } from "./effects/resolve.js";
import type { RootResolution } from "./effects/resolve.js";
import { interceptCombatPacketOnDraft } from "./block.js";
import { getActiveLocation } from "./locations.js";

export function beforeCombatOnDraft(
  state: MatchState,
  root: RootResolution,
  laneId: LaneId,
): void {
  const continuation = state.continuation;
  if (!continuation) throw new RangeError("Missing combat continuation");
  if (!continuation.beforeCombatJobs) {
    enqueueHooksOnDraft(
      state,
      root,
      "BEFORE_COMBAT_HERE",
      orderedUnits(state).filter((u) => u.laneId === laneId),
    );
    continuation.beforeCombatJobs = root.queue
      .splice(0)
      .map((job) => ({ source: job.source, abilityId: job.ability.id }));
  }
  const pending = continuation.beforeCombatJobs.shift();
  if (pending) {
    const ability = coreCatalog.cards
      .find((c) => c.id === pending.source.definitionId)
      ?.abilities.find(
        (a) => a.id === pending.abilityId && a.hook === "BEFORE_COMBAT_HERE",
      );
    if (!ability) throw new RangeError("Unknown scheduled combat ability");
    root.queue.push({
      source: pending.source,
      ability,
      generation: 1,
      damaged: false,
    });
    drainTriggersOnDraft(state, root);
  }
  if (!continuation.beforeCombatJobs.length) {
    delete continuation.beforeCombatJobs;
    continuation.stage = "PAIR";
  }
}

/** Damage and attacker rights are snapshotted together; display order never grants first strike. */
export function combatPairOnDraft(
  state: MatchState,
  root: RootResolution,
  laneId: LaneId,
): void {
  type Attack = Extract<
    VisibleEvent,
    { kind: "AttackDeclared" }
  >["payload"]["attacks"][number];
  const attacks: Attack[] = [],
    packets: DamageInput[] = [],
    lane = state.board[laneId - 1]!;
  for (const side of ["EVIL", "GOOD"] as const) {
    const unit = lane[slot(side)];
    if (
      !unit ||
      unit.current.hp <= 0 ||
      unit.statuses.stunned ||
      unit.statuses.exhausted ||
      unit.lastRegularAttackTurn === state.turn
    )
      continue;
    const attack = regularAttackValue(state, unit);
    if (attack <= 0) continue;
    const enemy = opposite(side),
      defender = lane[slot(enemy)];
    const targets: [EntityRef, ...EntityRef[]] =
      defender && defender.current.hp > 0
        ? [{ kind: "UNIT", instanceId: defender.instanceId }]
        : [{ kind: "HERO", side: enemy }];
    if (defender && defender.current.hp > 0 && unit.statuses.pierce)
      targets.push({ kind: "HERO", side: enemy });
    const displayOrder = side === "EVIL" ? 1 : 2;
    unit.lastRegularAttackTurn = state.turn;
    attacks.push({
      sourceUnitId: unit.instanceId,
      side,
      laneId,
      attack,
      targets,
      displayOrder,
    });
    for (const target of targets)
      packets.push({
        source: { kind: "UNIT", instanceId: unit.instanceId },
        target,
        rawDamage: attack,
        damageType: "COMBAT",
        displayOrder,
      });
  }
  if (!attacks.length) return;
  const batchId = `${state.matchId}:${state.rootSeq}:combat`;
  emitEvent(state, root.events, {
    kind: "AttackDeclared",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: { batchId, attacks: [attacks[0]!, ...attacks.slice(1)] },
  });
  const intercepted = packets.map((packet) =>
    interceptCombatPacketOnDraft(state, root.events, packet),
  );
  scheduledDamageOnDraft(state, root, intercepted, batchId);
  state.continuation?.pendingResponders.sort(
    (a, b) => (a.side === "EVIL" ? 0 : 1) - (b.side === "EVIL" ? 0 : 1),
  );
}

/** Raw scheduled damage must consume a primitive just like catalog DAMAGE. */
export function scheduledDamageOnDraft(
  state: MatchState,
  root: RootResolution,
  packets: readonly DamageInput[],
  batchId?: string,
): void {
  if (++root.primitiveCount > 256) throw new RangeError("Primitive limit");
  settleOnDraft(
    state,
    root,
    applyDamageBatchOnDraft(state, root.events, packets, batchId),
  );
}

export function afterLaneOnDraft(
  state: MatchState,
  root: RootResolution,
  laneId: LaneId,
): void {
  const rule = getActiveLocation(state, laneId)?.rule;
  if (rule?.kind !== "AFTER_COMBAT_DAMAGE") return;
  const packets: DamageInput[] = orderedUnits(state)
    .filter((u) => u.laneId === laneId && u.current.hp > 0)
    .map((u) => ({
      source: null,
      target: { kind: "UNIT", instanceId: u.instanceId },
      rawDamage: rule.amount,
      damageType: "LOCATION",
    }));
  scheduledDamageOnDraft(state, root, packets);
}
