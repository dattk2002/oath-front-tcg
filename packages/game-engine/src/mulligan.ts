import { coreCatalog } from "@oathfront/game-content";
import type {
  ActionError,
  GameEvent,
  MatchState,
  PlayerId,
  TransitionResult,
} from "./model.js";
import { allocateInstanceId } from "./identity.js";
import { nextInt, shuffle } from "./rng.js";
import { emitEvent, transition } from "./events.js";
import { emitHandCount, emitSetupDraw } from "./setup.js";
import { revealLocationsOnDraft } from "./locations.js";

export function applyMulligan(
  state: MatchState,
  side: PlayerId,
  instanceIds: readonly string[],
): TransitionResult | ActionError {
  if (state.lifecycle === "PAUSED")
    return { kind: "error", code: "MATCH_PAUSED" };
  if (state.lifecycle !== "ACTIVE")
    return { kind: "error", code: "MATCH_ENDED" };
  const player = state.players[side];
  if (state.phase !== "MULLIGAN" || !player || player.mulliganCommitted)
    return { kind: "error", code: "WRONG_PHASE" };
  if (
    instanceIds.length > 4 ||
    new Set(instanceIds).size !== instanceIds.length
  )
    return { kind: "error", code: "INVALID_TARGET" };
  if (instanceIds.some((id) => !player.hand.some((c) => c.instanceId === id)))
    return { kind: "error", code: "CARD_UNAVAILABLE" };
  const next = structuredClone(state),
    events: GameEvent[] = [],
    owner = next.players[side];
  ++next.rootSeq;
  const removed = owner.hand.filter((c) => instanceIds.includes(c.instanceId));
  owner.hand = owner.hand.filter((c) => !instanceIds.includes(c.instanceId));
  for (let i = 0; i < removed.length; i++) {
    const card = owner.deck.shift()!;
    owner.hand.push(card);
    emitSetupDraw(next, side, card, events);
  }
  const scope = side === "EVIL" ? "deck:evil" : "deck:good";
  // Zero-card confirmation is not a shuffle; it preserves the existing deck stream.
  if (removed.length) {
    const shuffled = shuffle(
      [...owner.deck, ...removed],
      next.random.states[scope],
    );
    owner.deck = shuffled.value;
    next.random.states[scope] = shuffled.state;
  }
  owner.mulliganCommitted = true;
  emitHandCount(next, side, events);
  emitEvent(next, events, {
    kind: "MulliganCommitted",
    visibility: "OWNER",
    ownerSide: side,
    payload: { side, replacedCount: removed.length },
  });
  if (
    next.players.EVIL.mulliganCommitted &&
    next.players.GOOD.mulliganCommitted
  ) {
    for (const ownerSide of ["EVIL", "GOOD"] as const) {
      const p = next.players[ownerSide],
        hero = coreCatalog.heroes.find((h) => h.id === p.heroId)!;
      const powerScope = ownerSide === "EVIL" ? "power:evil" : "power:good";
      const draw = nextInt(
        next.random.states[powerScope],
        hero.powerIds.length,
      );
      next.random.states[powerScope] = draw.state;
      const definitionId = hero.powerIds[draw.value]!;
      const power = {
        instanceId: allocateInstanceId(next),
        definitionId,
        normalCost: 1 as const,
      };
      p.reserve.push(power);
      p.receivedPowerIds.push(definitionId);
      emitEvent(next, events, {
        kind: "PowerGranted",
        visibility: "OWNER",
        ownerSide,
        payload: { side: ownerSide, power: { ...power }, reason: "INITIAL" },
      });
      emitEvent(next, events, {
        kind: "ReserveCountChanged",
        visibility: "PUBLIC",
        ownerSide: null,
        payload: { side: ownerSide, reserveCount: p.reserve.length },
      });
    }
    next.turn = 1;
    next.phase = "TURN_START";
    emitEvent(next, events, {
      kind: "PhaseChanged",
      visibility: "PUBLIC",
      ownerSide: null,
      payload: { from: "MULLIGAN", to: "TURN_START", turn: 1 },
    });
    emitEvent(next, events, {
      kind: "TurnStarted",
      visibility: "PUBLIC",
      ownerSide: null,
      payload: { turn: 1 },
    });
    revealLocationsOnDraft(next, 1, events);
    for (const ownerSide of ["EVIL", "GOOD"] as const) {
      const p = next.players[ownerSide],
        before = p.energy.current;
      p.energy = { current: 1, max: 1 };
      emitEvent(next, events, {
        kind: "EnergyRefilled",
        visibility: "PUBLIC",
        ownerSide: null,
        payload: { side: ownerSide, before, after: 1, max: 1 },
      });
    }
    next.phase = "EVIL_DEPLOY";
    next.activeSide = "EVIL";
    emitEvent(next, events, {
      kind: "PhaseChanged",
      visibility: "PUBLIC",
      ownerSide: null,
      payload: { from: "TURN_START", to: "EVIL_DEPLOY", turn: 1 },
    });
  }
  return transition(next, events);
}
