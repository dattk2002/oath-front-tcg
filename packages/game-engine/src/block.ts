import type { PlayerAction } from "@oathfront/contracts";
import { coreCatalog } from "@oathfront/game-content";
import type {
  ActionError,
  GameEvent,
  MatchState,
  PlayerId,
  TransitionResult,
} from "./model.js";
import type { DamageInput } from "./effects/damage.js";
import { runRoot, resolveEffectsOnDraft } from "./effects/resolve.js";
import { emitEvent } from "./events.js";
import { legalTargets, targetEqual } from "./targets.js";
import { grantPowerOnDraft } from "./powers.js";

/** Called exactly once for each snapshotted regular attack hero packet. */
export function interceptCombatPacketOnDraft(
  state: MatchState,
  events: GameEvent[],
  packet: DamageInput,
): DamageInput {
  if (
    packet.damageType !== "COMBAT" ||
    packet.target.kind !== "HERO" ||
    packet.rawDamage <= 0
  )
    return packet;
  const side = packet.target.side,
    player = state.players[side],
    meter = player.block;
  if (meter.used >= 3) return packet;
  const before = meter.charge;
  meter.charge += 2;
  const blocked = meter.charge >= 8;
  if (blocked) {
    meter.charge = 0;
    ++meter.used;
    meter.active = meter.used < 3;
  }
  emitEvent(state, events, {
    kind: "BlockMeterChanged",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: {
      side,
      chargeBefore: before,
      chargeAfter: meter.charge,
      blocksUsed: meter.used,
    },
  });
  if (blocked) {
    emitEvent(state, events, {
      kind: "BlockOccurred",
      visibility: "PUBLIC",
      ownerSide: null,
      payload: {
        side,
        preventedDamage: packet.rawDamage,
        blocksUsed: meter.used,
      },
    });
    const power = grantPowerOnDraft(state, events, side, "BLOCK");
    if (!state.continuation)
      throw new RangeError("Block without combat continuation");
    state.continuation.pendingResponders.push({
      side,
      powerInstanceId: power.instanceId,
    });
  }
  return { ...packet, blocked };
}

/** This runs in a new root after the damage/response root's lethal checkpoint. */
export function openNextBlockResponseOnDraft(
  state: MatchState,
  events: GameEvent[],
): void {
  const continuation = state.continuation;
  if (!continuation) throw new RangeError("Missing combat continuation");
  const pending = continuation.pendingResponders[0];
  if (!pending) {
    continuation.stage = "AFTER_LANE";
    return;
  }
  state.blockResponse = { ...pending, laneId: continuation.laneId };
  emitEvent(state, events, {
    kind: "BlockResponseOpened",
    visibility: "OWNER",
    ownerSide: pending.side,
    payload: { ...state.blockResponse },
  });
}

export function legalBlockActions(
  state: MatchState,
  actor: PlayerId,
): PlayerAction[] {
  const response = state.blockResponse;
  if (!response || response.side !== actor) return [];
  const power = state.players[actor].reserve.find(
    (p) => p.instanceId === response.powerInstanceId,
  );
  const definition = coreCatalog.powers.find(
    (p) => p.id === power?.definitionId,
  );
  const actions: PlayerAction[] = [{ kind: "KEEP_BLOCK_POWER" }];
  if (definition?.faction === actor)
    for (const target of legalTargets(state, actor, definition.targeting))
      actions.push({
        kind: "USE_BLOCK_POWER",
        powerInstanceId: response.powerInstanceId,
        target,
      });
  return actions;
}

export function applyBlockAction(
  state: MatchState,
  actor: PlayerId,
  action: PlayerAction,
): TransitionResult | ActionError {
  const error = (code: ActionError["code"]): ActionError => ({
    kind: "error",
    code,
  });
  const response = state.blockResponse;
  if (!response) return error("WRONG_PHASE");
  if (response.side !== actor) return error("NOT_YOUR_TURN");
  if (action.kind !== "KEEP_BLOCK_POWER" && action.kind !== "USE_BLOCK_POWER")
    return error("WRONG_PHASE");
  const power = state.players[actor].reserve.find(
    (p) => p.instanceId === response.powerInstanceId,
  );
  const definition = coreCatalog.powers.find(
    (p) => p.id === power?.definitionId,
  );
  if (action.kind === "USE_BLOCK_POWER") {
    if (
      action.powerInstanceId !== response.powerInstanceId ||
      !power ||
      !definition ||
      definition.faction !== actor
    )
      return error("POWER_UNAVAILABLE");
    if (
      !legalTargets(state, actor, definition.targeting).some((t) =>
        targetEqual(t, action.target),
      )
    )
      return error("INVALID_TARGET");
  }
  return runRoot(state, (draft, root) => {
    if (action.kind === "USE_BLOCK_POWER" && power && definition) {
      const player = draft.players[actor];
      player.reserve = player.reserve.filter(
        (p) => p.instanceId !== power.instanceId,
      );
      player.usedPowers.push(power.definitionId);
      emitEvent(draft, root.events, {
        kind: "PowerUsed",
        visibility: "PUBLIC",
        ownerSide: null,
        payload: {
          side: actor,
          powerInstanceId: power.instanceId,
          definitionId: power.definitionId,
          target: action.target,
          energySpent: 0,
        },
      });
      emitEvent(draft, root.events, {
        kind: "ReserveCountChanged",
        visibility: "PUBLIC",
        ownerSide: null,
        payload: { side: actor, reserveCount: player.reserve.length },
      });
      resolveEffectsOnDraft(
        draft,
        {
          owner: actor,
          definitionId: definition.id,
          instanceId: power.instanceId,
          laneId: null,
          target: action.target,
        },
        definition.effects,
        root,
      );
    }
    emitEvent(draft, root.events, {
      kind: "BlockResponseClosed",
      visibility: "PUBLIC",
      ownerSide: null,
      payload: {
        side: actor,
        choice: action.kind === "USE_BLOCK_POWER" ? "USED" : "KEPT",
      },
    });
    draft.blockResponse = null;
    if (!draft.continuation)
      throw new RangeError("Missing response continuation");
    draft.continuation.pendingResponders.shift();
    draft.continuation.stage = draft.continuation.pendingResponders.length
      ? "BLOCK_RESPONSES"
      : "AFTER_LANE";
  });
}
