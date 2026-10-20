import type { PlayerAction, Target } from "@oathfront/contracts";
import { validateWire } from "@oathfront/contracts";
import { coreCatalog } from "@oathfront/game-content";
import type {
  MatchState,
  PlayerId,
  EngineAction,
  TransitionResult,
  ActionError,
} from "./model.js";
import { applyMulligan } from "./mulligan.js";
import { phaseActor, playedUnitCost, passPhaseOnDraft } from "./phases.js";
import { legalTargets, slot, targetEqual, internalLaneId } from "./targets.js";
import type { EffectContext } from "./targets.js";
import { getActiveLocation } from "./locations.js";
import { createUnitOnDraft } from "./units.js";
import { emitEvent } from "./events.js";
import { emitHandCount } from "./setup.js";
import { addModifierOnDraft, emitStatus } from "./modifiers.js";
import {
  discardOnDraft,
  resolveEffectsOnDraft,
  runRoot,
  settleOnDraft,
} from "./effects/resolve.js";
import { runHookOnDraft } from "./effects/triggers.js";
const error = (code: ActionError["code"]): ActionError => ({
  kind: "error",
  code,
});
export function getLegalActions(
  state: MatchState,
  actor: PlayerId,
): PlayerAction[] {
  if (state.lifecycle !== "ACTIVE") return [];
  if (state.phase === "MULLIGAN") {
    if (state.players[actor].mulliganCommitted) return [];
    const ids = state.players[actor].hand.map((c) => c.instanceId),
      actions: PlayerAction[] = [];
    for (let mask = 0; mask < 2 ** ids.length; mask++)
      actions.push({
        kind: "MULLIGAN",
        cardInstanceIds: ids.filter((_, i) => (mask & (1 << i)) !== 0),
      });
    return actions;
  }
  if (phaseActor(state.phase) !== actor) return [];
  const actions: PlayerAction[] = [{ kind: "PASS_PHASE" }],
    player = state.players[actor];
  for (const card of player.hand) {
    const def = coreCatalog.cards.find((c) => c.id === card.definitionId);
    if (!def || def.faction !== actor) continue;
    if (def.type === "UNIT" && state.phase !== "EVIL_TRICKS")
      for (const lane of state.board) {
        if (
          !lane[slot(actor)] &&
          player.energy.current >= playedUnitCost(state, def.cost, lane.laneId)
        )
          actions.push({
            kind: "PLAY_UNIT",
            cardInstanceId: card.instanceId,
            laneId: lane.laneId,
          });
      }
    if (
      def.type === "TRICK" &&
      state.phase !== "EVIL_DEPLOY" &&
      player.energy.current >= def.cost
    )
      for (const target of legalTargets(state, actor, def.targeting))
        actions.push({
          kind: "PLAY_TRICK",
          cardInstanceId: card.instanceId,
          target,
        });
  }
  if (state.phase !== "EVIL_DEPLOY" && player.energy.current >= 1)
    for (const power of player.reserve) {
      const def = coreCatalog.powers.find((p) => p.id === power.definitionId);
      if (def?.faction === actor && def.validPhase === state.phase)
        for (const target of legalTargets(state, actor, def.targeting))
          actions.push({
            kind: "USE_POWER",
            powerInstanceId: power.instanceId,
            target,
          });
    }
  return actions;
}
/** actor is supplied by the trusted API/bot/replay envelope, never by wire PlayerAction. */
export function applyAction(
  state: MatchState,
  envelope: EngineAction,
): TransitionResult | ActionError {
  const { actor, action } = envelope;
  if (
    !["GOOD", "EVIL"].includes(actor) ||
    !validateWire("PlayerAction", action)
  )
    return error("INVALID_TARGET");
  if (state.lifecycle === "PAUSED") return error("MATCH_PAUSED");
  if (state.lifecycle !== "ACTIVE") return error("MATCH_ENDED");
  if (action.kind === "MULLIGAN")
    return applyMulligan(state, actor, action.cardInstanceIds);
  if (phaseActor(state.phase) !== actor)
    return error(phaseActor(state.phase) ? "NOT_YOUR_TURN" : "WRONG_PHASE");
  if (action.kind === "PASS_PHASE")
    return runRoot(state, (draft, root) =>
      passPhaseOnDraft(draft, root.events),
    );
  if (action.kind === "PLAY_UNIT" || action.kind === "PLAY_TRICK") {
    const player = state.players[actor],
      card = player.hand.find((c) => c.instanceId === action.cardInstanceId),
      def = coreCatalog.cards.find((c) => c.id === card?.definitionId);
    if (!card || !def || def.faction !== actor)
      return error("CARD_UNAVAILABLE");
    if (
      (action.kind === "PLAY_UNIT" &&
        (def.type !== "UNIT" || state.phase === "EVIL_TRICKS")) ||
      (action.kind === "PLAY_TRICK" &&
        (def.type !== "TRICK" || state.phase === "EVIL_DEPLOY"))
    )
      return error("WRONG_PHASE");
    const target: Target =
      action.kind === "PLAY_UNIT"
        ? { kind: "LANE", laneId: action.laneId }
        : action.target;
    const cost =
      action.kind === "PLAY_UNIT"
        ? playedUnitCost(state, def.cost, action.laneId)
        : def.cost;
    if (
      action.kind === "PLAY_UNIT" &&
      state.board[action.laneId - 1]![slot(actor)]
    )
      return error("LANE_OCCUPIED");
    if (
      action.kind === "PLAY_TRICK" &&
      !legalTargets(state, actor, def.targeting).some((t) =>
        targetEqual(t, target),
      )
    )
      return error("INVALID_TARGET");
    if (player.energy.current < cost) return error("INSUFFICIENT_ENERGY");
    return runRoot(state, (draft, root) => {
      const p = draft.players[actor];
      p.energy.current -= cost;
      p.hand = p.hand.filter((c) => c.instanceId !== card.instanceId);
      emitEvent(draft, root.events, {
        kind: "CardPlayed",
        visibility: "PUBLIC",
        ownerSide: null,
        payload: {
          side: actor,
          cardInstanceId: card.instanceId,
          definitionId: def.id,
          target,
          energySpent: cost,
        },
      });
      emitHandCount(draft, actor, root.events);
      const context: EffectContext = {
        owner: actor,
        definitionId: def.id,
        instanceId: card.instanceId,
        laneId:
          action.kind === "PLAY_UNIT" ? internalLaneId(action.laneId) : null,
        target,
      };
      if (action.kind === "PLAY_UNIT") {
        const unit = createUnitOnDraft(
            draft,
            root.events,
            def,
            actor,
            internalLaneId(action.laneId),
            "PLAY",
            card.instanceId,
          ),
          location = getActiveLocation(draft, action.laneId);
        if (location) {
          const entry: EffectContext = {
            ...context,
            definitionId: location.id,
            instanceId: null,
          };
          if (location.rule.kind === "ENTRY_HEALTH")
            resolveEffectsOnDraft(
              draft,
              {
                ...entry,
                target: { kind: "UNIT", instanceId: unit.instanceId },
              },
              [
                {
                  kind: "MODIFY_STATS",
                  targets: "SELECTED_UNIT",
                  attackDelta: 0,
                  healthDelta: location.rule.amount,
                  duration: "PERMANENT",
                },
              ],
              root,
            );
          if (location.rule.kind === "ENTRY_EXHAUST") {
            const before = { ...unit.statuses };
            unit.statuses.exhausted = true;
            addModifierOnDraft(
              draft,
              root.events,
              unit,
              entry,
              0,
              0,
              "EXHAUSTED",
              "TURN_END",
            );
            emitStatus(draft, root.events, unit, before);
            settleOnDraft(draft, root);
          }
        }
        runHookOnDraft(draft, root, "ON_PLAY", [unit]);
      } else {
        discardOnDraft(draft, root.events, actor, def.id, "TRICK_RESOLVED");
        resolveEffectsOnDraft(draft, context, def.effects, root);
      }
    });
  }
  if (action.kind === "USE_POWER") {
    if (state.phase === "EVIL_DEPLOY") return error("WRONG_PHASE");
    const power = state.players[actor].reserve.find(
        (p) => p.instanceId === action.powerInstanceId,
      ),
      def = coreCatalog.powers.find((p) => p.id === power?.definitionId);
    if (!power || !def || def.faction !== actor)
      return error("POWER_UNAVAILABLE");
    if (def.validPhase !== state.phase) return error("WRONG_PHASE");
    if (
      !legalTargets(state, actor, def.targeting).some((t) =>
        targetEqual(t, action.target),
      )
    )
      return error("INVALID_TARGET");
    if (state.players[actor].energy.current < 1)
      return error("INSUFFICIENT_ENERGY");
    return runRoot(state, (draft, root) => {
      const p = draft.players[actor];
      p.energy.current -= 1;
      p.reserve = p.reserve.filter((v) => v.instanceId !== power.instanceId);
      p.usedPowers.push(power.definitionId);
      emitEvent(draft, root.events, {
        kind: "PowerUsed",
        visibility: "PUBLIC",
        ownerSide: null,
        payload: {
          side: actor,
          powerInstanceId: power.instanceId,
          definitionId: power.definitionId,
          target: action.target,
          energySpent: 1,
        },
      });
      resolveEffectsOnDraft(
        draft,
        {
          owner: actor,
          definitionId: def.id,
          instanceId: power.instanceId,
          laneId: null,
          target: action.target,
        },
        def.effects,
        root,
      );
    });
  }
  return error("WRONG_PHASE");
}
