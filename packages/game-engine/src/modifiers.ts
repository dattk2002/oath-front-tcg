import type { Duration, ModifierView, Statuses } from "@oathfront/contracts";
import { coreCatalog } from "@oathfront/game-content";
import type { MatchState, GameEvent, UnitState } from "./model.js";
import type { EffectContext } from "./targets.js";
import { orderedUnits, sourceLane, slot, opposite } from "./targets.js";
import { getActiveLocation } from "./locations.js";
import { emitEvent } from "./events.js";
export function safeInteger(value: number): number {
  if (!Number.isSafeInteger(value))
    throw new RangeError("Engine integer overflow");
  return value;
}
export function unitView(unit: UnitState) {
  return structuredClone({
    instanceId: unit.instanceId,
    definitionId: unit.definitionId,
    owner: unit.owner,
    laneId: unit.laneId,
    isToken: unit.isToken,
    printed: unit.printed,
    current: unit.current,
    statuses: unit.statuses,
    modifiers: unit.modifiers,
    lastRegularAttackTurn: unit.lastRegularAttackTurn,
  });
}
export function emitStats(
  state: MatchState,
  events: GameEvent[],
  unit: UnitState,
  before: UnitState["current"],
): void {
  emitEvent(state, events, {
    kind: "StatsChanged",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: {
      instanceId: unit.instanceId,
      before,
      after: { ...unit.current },
      modifiers: structuredClone(unit.modifiers),
    },
  });
}
export function emitStatus(
  state: MatchState,
  events: GameEvent[],
  unit: UnitState,
  before: Statuses,
): void {
  if (JSON.stringify(before) !== JSON.stringify(unit.statuses))
    emitEvent(state, events, {
      kind: "StatusChanged",
      visibility: "PUBLIC",
      ownerSide: null,
      payload: {
        instanceId: unit.instanceId,
        before,
        after: { ...unit.statuses },
      },
    });
}
export function addModifierOnDraft(
  state: MatchState,
  events: GameEvent[],
  unit: UnitState,
  context: EffectContext,
  attackDelta: number,
  healthDelta: number,
  trait: ModifierView["trait"],
  duration: Duration,
): void {
  const before = { ...unit.current };
  const modifier: ModifierView = {
    sourceDefinitionId: context.definitionId,
    sourceInstanceId: context.instanceId,
    sourceLaneAtCreation: sourceLane(state, context),
    createdEventSeq: state.eventSeq + 1,
    attackDelta,
    healthDelta,
    trait,
    duration,
    expiryTurn: duration === "TURN_END" ? state.turn : null,
  };
  if (unit.modifiers.length >= 256) throw new RangeError("Modifier limit");
  unit.modifiers.push(modifier);
  unit.current.attack = Math.max(
    0,
    safeInteger(
      unit.modifiers.reduce(
        (sum, m) => safeInteger(sum + m.attackDelta),
        unit.printed.attack,
      ),
    ),
  );
  unit.current.maxHp = safeInteger(unit.current.maxHp + healthDelta);
  unit.current.hp = Math.min(
    unit.current.maxHp,
    safeInteger(unit.current.hp + healthDelta),
  );
  if (attackDelta !== 0 || healthDelta !== 0)
    emitStats(state, events, unit, before);
}
export function regularAttackValue(state: MatchState, unit: UnitState): number {
  const rule = getActiveLocation(state, unit.laneId)?.rule;
  const bonus =
    rule?.kind === "ATTACK_BONUS" &&
    ((rule.condition === "PRINTED_ATTACK_AT_MOST_3" &&
      unit.printed.attack <= 3) ||
      (rule.condition === "ENEMY_PRESENT_AT_SNAPSHOT" &&
        (state.board[unit.laneId - 1]![slot(opposite(unit.owner))]?.current
          .hp ?? 0) > 0))
      ? rule.amount
      : 0;
  return Math.max(0, safeInteger(unit.current.attack + bonus));
}
export function expireModifiersOnDraft(
  state: MatchState,
  events: GameEvent[],
): void {
  for (const unit of orderedUnits(state)) {
    const before = { ...unit.current },
      statuses = { ...unit.statuses };
    unit.modifiers = unit.modifiers.filter(
      (m) =>
        !(
          m.duration === "TURN_END" &&
          m.expiryTurn !== null &&
          m.expiryTurn <= state.turn
        ),
    );
    unit.current.attack = Math.max(
      0,
      unit.modifiers.reduce(
        (n, m) => safeInteger(n + m.attackDelta),
        unit.printed.attack,
      ),
    );
    unit.current.maxHp = unit.modifiers.reduce(
      (n, m) => safeInteger(n + m.healthDelta),
      unit.printed.maxHp,
    );
    unit.current.hp = Math.min(unit.current.hp, unit.current.maxHp);
    unit.statuses.stunned = false;
    unit.statuses.exhausted = false;
    // Pierce can be innate or granted permanently; unlike shield it is never consumed.
    const permanentPierce = unit.modifiers.some((m) => m.trait === "PIERCE");
    unit.statuses.pierce = permanentPierce || innatePierce(unit);
    if (JSON.stringify(before) !== JSON.stringify(unit.current))
      emitStats(state, events, unit, before);
    emitStatus(state, events, unit, statuses);
  }
}
function innatePierce(unit: UnitState): boolean {
  const keywords: readonly string[] =
    (unit.isToken
      ? coreCatalog.tokens.find((t) => t.id === unit.definitionId)
      : coreCatalog.cards.find((c) => c.id === unit.definitionId)
    )?.keywords ?? [];
  return keywords.includes("PIERCE");
}
