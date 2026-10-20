import type { CardId, Effect, EntityRef, HandCard } from "@oathfront/contracts";
import { finishMatchOnDraft } from "../terminal.js";
import { executePrimitive } from "../primitive.js";
import { coreCatalog } from "@oathfront/game-content";
import type {
  MatchState,
  GameEvent,
  TransitionResult,
  PlayerId,
  UnitState,
} from "../model.js";
import type { EffectContext } from "../targets.js";
import { findUnit, orderedUnits, slot, internalLaneId } from "../targets.js";
import { transition, emitEvent } from "../events.js";
import {
  addModifierOnDraft,
  emitStats,
  emitStatus,
  safeInteger,
} from "../modifiers.js";
import { createUnitOnDraft } from "../units.js";
import { emitHandCount, emitSetupDraw } from "../setup.js";
import { applyDamageBatchOnDraft } from "./damage.js";
import type { TriggerJob } from "./triggers.js";
import {
  enqueueHooksOnDraft,
  triggerEligible,
  triggerKey,
} from "./triggers.js";
export type { EffectContext } from "../targets.js";
export interface RootResolution {
  events: GameEvent[];
  primitiveCount: number;
  generation: number;
  queue: TriggerJob[];
}
/** A single transaction; no partial root or consumed RNG escapes a safety fault. */
export function runRoot(
  state: MatchState,
  body: (draft: MatchState, root: RootResolution) => void,
): TransitionResult {
  const draft = structuredClone(state),
    root: RootResolution = {
      events: [],
      primitiveCount: 0,
      generation: 0,
      queue: [],
    };
  if (draft.lifecycle !== "ACTIVE") return transition(draft, []);
  ++draft.rootSeq;
  try {
    body(draft, root);
    drainTriggersOnDraft(draft, root);
    checkLethalOnDraft(draft, root.events);
    return transition(draft, root.events);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    const rolledBack = structuredClone(state);
    rolledBack.lifecycle = "FAULTED";
    const events: GameEvent[] = [];
    emitEvent(rolledBack, events, {
      kind: "LifecycleChanged",
      visibility: "PUBLIC",
      ownerSide: null,
      payload: { from: state.lifecycle, to: "FAULTED", reason: "FAULT" },
    });
    return transition(rolledBack, events);
  }
}
export function checkLethalOnDraft(
  state: MatchState,
  events: GameEvent[],
): void {
  const good = state.players.GOOD.hp <= 0,
    evil = state.players.EVIL.hp <= 0;
  if (!good && !evil) return;
  const winner = good && evil ? null : good ? "EVIL" : "GOOD";
  finishMatchOnDraft(state, events, {
    result:
      winner === null ? "DRAW" : winner === state.humanSide ? "WIN" : "LOSS",
    winner,
    reason: winner === null ? "SIMULTANEOUS_LETHAL" : "HERO_DEFEATED",
  });
}
export function discardOnDraft(
  state: MatchState,
  events: GameEvent[],
  owner: PlayerId,
  definitionId: CardId,
  reason: "OVERDRAW" | "TRICK_RESOLVED" | "UNIT_DESTROYED",
): void {
  const discard = state.players[owner].discard,
    entry = discard.find((c) => c.definitionId === definitionId);
  if (entry) {
    if (entry.quantity >= 2)
      throw new RangeError("Invalid duplicate card count");
    entry.quantity = 2;
  } else discard.push({ definitionId, quantity: 1 });
  emitEvent(state, events, {
    kind: "CardDiscarded",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: {
      side: owner,
      definitionId,
      reason,
      discardQuantity: entry?.quantity ?? 1,
    },
  });
}
/** Standard draw, shared by card effects and later turn-start code. Fatigue remains in the caller's root. */
export function drawOnDraft(
  state: MatchState,
  owner: PlayerId,
  count: number,
  root: RootResolution,
): void {
  safeInteger(count);
  if (count < 0) throw new RangeError("Invalid draw count");
  const player = state.players[owner];
  for (let i = 0; i < count; i++) {
    const card: HandCard | undefined = player.deck.shift();
    if (card) {
      if (player.hand.length < 10) {
        player.hand.push(card);
        emitSetupDraw(state, owner, card, root.events);
      } else
        discardOnDraft(
          state,
          root.events,
          owner,
          card.definitionId,
          "OVERDRAW",
        );
      emitHandCount(state, owner, root.events);
    } else {
      player.fatigueCounter = safeInteger(player.fatigueCounter + 1);
      const damaged = applyDamageBatchOnDraft(state, root.events, [
        {
          source: null,
          target: { kind: "HERO", side: owner },
          damageType: "FATIGUE",
          rawDamage: player.fatigueCounter,
        },
      ]);
      settleOnDraft(state, root, damaged);
    }
  }
}
/** Deaths removed together, then ON_DAMAGED precedes ON_DESTROYED in stable FIFO order. */
export function settleOnDraft(
  state: MatchState,
  root: RootResolution,
  damaged: readonly UnitState[] = [],
): void {
  const dead = orderedUnits(state)
    .filter((u) => u.current.hp <= 0)
    .map((u) => structuredClone(u));
  for (const unit of dead)
    state.board[unit.laneId - 1]![slot(unit.owner)] = null;
  for (const unit of dead) {
    emitEvent(state, root.events, {
      kind: "UnitDestroyed",
      visibility: "PUBLIC",
      ownerSide: null,
      payload: {
        instanceId: unit.instanceId,
        definitionId: unit.definitionId,
        owner: unit.owner,
        laneId: unit.laneId,
        isToken: unit.isToken,
      },
    });
    if (!unit.isToken)
      discardOnDraft(
        state,
        root.events,
        unit.owner,
        unit.definitionId as CardId,
        "UNIT_DESTROYED",
      );
  }
  enqueueHooksOnDraft(
    state,
    root,
    "ON_DAMAGED",
    damaged.filter((u) => !!findUnit(state, u.instanceId)),
  );
  enqueueHooksOnDraft(state, root, "ON_DESTROYED", dead);
  drainTriggersOnDraft(state, root);
}
export function drainTriggersOnDraft(
  state: MatchState,
  root: RootResolution,
): void {
  while (root.queue.length) {
    const job = root.queue.shift()!;
    if (!triggerEligible(state, job)) continue;
    if (job.generation > 32) throw new RangeError("Trigger generation limit");
    const previous = root.generation;
    root.generation = job.generation;
    state.turnCounters[triggerKey(job.source, job.ability)] =
      (state.turnCounters[triggerKey(job.source, job.ability)] ?? 0) + 1;
    const live = findUnit(state, job.source.instanceId);
    const context: EffectContext = {
      owner: job.source.owner,
      definitionId: job.source.definitionId,
      instanceId: job.source.instanceId,
      laneId: live?.laneId ?? job.source.laneId,
      target: { kind: "NONE" },
      ...(job.ability.hook === "ON_DESTROYED" ? { corpse: job.source } : {}),
    };
    resolveEffectsOnDraft(state, context, job.ability.effects, root);
    root.generation = previous;
  }
}
export function resolveEffects(
  state: MatchState,
  context: EffectContext,
  effects: readonly Effect[],
): TransitionResult {
  return runRoot(state, (draft, root) =>
    resolveEffectsOnDraft(draft, context, effects, root),
  );
}
export function resolveEffectsOnDraft(
  state: MatchState,
  context: EffectContext,
  effects: readonly Effect[],
  root: RootResolution,
): void {
  for (const effect of effects) {
    if (++root.primitiveCount > 256) throw new RangeError("Primitive limit");
    let damaged: UnitState[] = [];
    executePrimitive(state, context, effect, {
      damage(targets, amount) {
        const source: EntityRef =
          context.instanceId &&
          (context.corpse || findUnit(state, context.instanceId))
            ? { kind: "UNIT", instanceId: context.instanceId }
            : { kind: "HERO", side: context.owner };
        damaged = applyDamageBatchOnDraft(
          state,
          root.events,
          targets.map((target) => ({
            source,
            target,
            rawDamage: amount,
            damageType: "EFFECT",
          })),
        );
      },
      stats(unit, before) {
        emitStats(state, root.events, unit, before);
      },
      status(unit, before) {
        emitStatus(state, root.events, unit, before);
      },
      heroHeal(side, before, after) {
        emitEvent(state, root.events, {
          kind: "HeroHealed",
          visibility: "PUBLIC",
          ownerSide: null,
          payload: { side, amount: after - before, before, after },
        });
      },
      modify(unit, attack, health, trait, duration) {
        addModifierOnDraft(
          state,
          root.events,
          unit,
          context,
          attack,
          health,
          trait,
          duration,
        );
      },
      move(unit, laneId) {
        const fromLane = unit.laneId;
        state.board[fromLane - 1]![slot(unit.owner)] = null;
        unit.laneId = internalLaneId(laneId);
        state.board[laneId - 1]![slot(unit.owner)] = unit;
        emitEvent(state, root.events, {
          kind: "UnitMoved",
          visibility: "PUBLIC",
          ownerSide: null,
          payload: {
            instanceId: unit.instanceId,
            side: unit.owner,
            fromLane,
            toLane: laneId,
          },
        });
      },
      summon(tokenId, laneId) {
        const definition = coreCatalog.tokens.find((t) => t.id === tokenId);
        if (!definition) throw new RangeError("Missing token");
        if (!definition.tutorialOnly || state.mode === "TUTORIAL")
          createUnitOnDraft(
            state,
            root.events,
            definition,
            context.owner,
            internalLaneId(laneId),
            "SUMMON",
          );
      },
      draw(count) {
        drawOnDraft(state, context.owner, count, root);
      },
    });
    settleOnDraft(state, root, damaged);
  }
}
