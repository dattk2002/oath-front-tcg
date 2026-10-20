import type {
  CardId,
  Effect,
  EntityRef,
  HandCard,
  ModifierView,
} from "@oathfront/contracts";
import { coreCatalog } from "@oathfront/game-content";
import type {
  MatchState,
  GameEvent,
  TransitionResult,
  PlayerId,
  UnitState,
} from "../model.js";
import type { EffectContext } from "../targets.js";
import {
  findUnit,
  orderedUnits,
  resolveTargets,
  slot,
  sourceLane,
  internalLaneId,
} from "../targets.js";
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
  state.outcome = {
    result:
      winner === null ? "DRAW" : winner === state.humanSide ? "WIN" : "LOSS",
    winner,
    reason: winner === null ? "SIMULTANEOUS_LETHAL" : "HERO_DEFEATED",
  };
  state.lifecycle = "COMPLETED";
  state.activeSide = null;
  state.blockResponse = null;
  state.continuation = null;
  const from = state.phase;
  state.phase = "GAME_OVER";
  emitEvent(state, events, {
    kind: "PhaseChanged",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: { from, to: "GAME_OVER", turn: state.turn },
  });
  emitEvent(state, events, {
    kind: "MatchEnded",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: { outcome: { ...state.outcome }, turn: state.turn },
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
    switch (effect.kind) {
      case "DAMAGE": {
        const targets = resolveTargets(state, context, effect.targets);
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
            rawDamage: effect.amount,
            damageType: effect.damageKind,
          })),
        );
        break;
      }
      case "HEAL":
        for (const ref of resolveTargets(state, context, effect.targets)) {
          safeInteger(effect.amount);
          if (effect.amount < 0) throw new RangeError("Invalid heal");
          if (ref.kind === "HERO") {
            const hero = state.players[ref.side];
            if (hero.hp <= 0) continue;
            const before = hero.hp;
            hero.hp = Math.min(
              hero.maxHp,
              safeInteger(hero.hp + effect.amount),
            );
            emitEvent(state, root.events, {
              kind: "HeroHealed",
              visibility: "PUBLIC",
              ownerSide: null,
              payload: {
                side: ref.side,
                amount: hero.hp - before,
                before,
                after: hero.hp,
              },
            });
          } else {
            const unit = findUnit(state, ref.instanceId);
            if (!unit) continue;
            const before = { ...unit.current };
            unit.current.hp = Math.min(
              unit.current.maxHp,
              safeInteger(unit.current.hp + effect.amount),
            );
            emitStats(state, root.events, unit, before);
          }
        }
        break;
      case "MODIFY_STATS":
        safeInteger(effect.attackDelta);
        safeInteger(effect.healthDelta);
        if (effect.healthDelta < 0)
          throw new RangeError("Negative health buff");
        for (const ref of resolveTargets(state, context, effect.targets)) {
          const unit =
            ref.kind === "UNIT" ? findUnit(state, ref.instanceId) : undefined;
          if (unit)
            addModifierOnDraft(
              state,
              root.events,
              unit,
              context,
              effect.attackDelta,
              effect.healthDelta,
              null,
              effect.duration,
            );
        }
        break;
      case "GRANT_SHIELD":
      case "GRANT_ARMOR":
      case "APPLY_POISON":
      case "APPLY_STUN":
      case "GRANT_PIERCE": {
        const trait: ModifierView["trait"] =
          effect.kind === "GRANT_SHIELD"
            ? "SHIELD"
            : effect.kind === "GRANT_ARMOR"
              ? "ARMOR"
              : effect.kind === "APPLY_POISON"
                ? "POISONED"
                : effect.kind === "APPLY_STUN"
                  ? "STUNNED"
                  : "PIERCE";
        const status =
          trait === "SHIELD"
            ? "shield"
            : trait === "ARMOR"
              ? "armor"
              : trait === "POISONED"
                ? "poisoned"
                : trait === "STUNNED"
                  ? "stunned"
                  : "pierce";
        for (const ref of resolveTargets(state, context, effect.targets)) {
          const unit =
            ref.kind === "UNIT" ? findUnit(state, ref.instanceId) : undefined;
          if (!unit) continue;
          const before = { ...unit.statuses };
          // Permanent Pierce still needs recording when it replaces a temporary grant.
          const upgrade =
            trait === "PIERCE" &&
            effect.kind === "GRANT_PIERCE" &&
            effect.duration === "PERMANENT" &&
            !unit.modifiers.some(
              (m) => m.trait === "PIERCE" && m.duration === "PERMANENT",
            );
          if (!unit.statuses[status] || upgrade)
            addModifierOnDraft(
              state,
              root.events,
              unit,
              context,
              0,
              0,
              trait,
              "duration" in effect ? effect.duration : "PERMANENT",
            );
          if (upgrade && before.pierce)
            emitStats(state, root.events, unit, { ...unit.current });
          if (status === "armor") unit.statuses.armor = 1;
          else unit.statuses[status] = true;
          emitStatus(state, root.events, unit, before);
        }
        break;
      }
      case "MOVE_UNIT": {
        const target = context.target,
          unit =
            "instanceId" in target
              ? findUnit(state, target.instanceId)
              : undefined;
        if (
          unit &&
          "laneId" in target &&
          target.laneId !== unit.laneId &&
          !state.board[target.laneId - 1]![slot(unit.owner)]
        ) {
          const fromLane = unit.laneId;
          state.board[fromLane - 1]![slot(unit.owner)] = null;
          unit.laneId = internalLaneId(target.laneId);
          state.board[target.laneId - 1]![slot(unit.owner)] = unit;
          emitEvent(state, root.events, {
            kind: "UnitMoved",
            visibility: "PUBLIC",
            ownerSide: null,
            payload: {
              instanceId: unit.instanceId,
              side: unit.owner,
              fromLane,
              toLane: target.laneId,
            },
          });
        }
        break;
      }
      case "SUMMON_TOKEN": {
        const lane =
          effect.laneSelector === "SELF"
            ? sourceLane(state, context)
            : "laneId" in context.target
              ? context.target.laneId
              : null;
        const definition = coreCatalog.tokens.find(
          (t) => t.id === effect.tokenId,
        );
        if (!definition) throw new RangeError("Missing token");
        if (
          lane &&
          !state.board[lane - 1]![slot(context.owner)] &&
          (!definition.tutorialOnly || state.mode === "TUTORIAL")
        )
          createUnitOnDraft(
            state,
            root.events,
            definition,
            context.owner,
            internalLaneId(lane),
            "SUMMON",
          );
        break;
      }
      case "DRAW":
        drawOnDraft(state, context.owner, effect.count, root);
        break;
      default: {
        const exhaustive: never = effect;
        throw new TypeError(`Unknown primitive ${String(exhaustive)}`);
      }
    }
    settleOnDraft(state, root, damaged);
  }
}
