import type { AuthoredScenario } from "@oathfront/game-content/events";
import { contentHash } from "@oathfront/game-content/events";
import { elementsCatalog } from "@oathfront/game-content";
import type { CardId, Side } from "@oathfront/contracts";
import type { GameEvent, MatchState } from "./model.js";
import {
  createMatchWithEvents,
  emitSetupDraw,
  emitHandCount,
} from "./setup.js";
import { createRandomStreams } from "./rng.js";
import { createUnitOnDraft } from "./units.js";
import { grantPowerOnDraft } from "./powers.js";
import { emitEvent, transition } from "./events.js";
import { emitStats } from "./modifiers.js";
import { changePhaseOnDraft } from "./phases.js";

/** Immutable authored initial position. Placement consumes real deck copies and never fires on-play effects. */
export function createChallengeMatch(
  matchId: string,
  scenario: AuthoredScenario,
) {
  const m = scenario.manifest;
  if (
    contentHash(m) !== scenario.sha256 ||
    m.version !== "daily_v1" ||
    m.contentVersion !== "elements_v1" ||
    m.id !== scenario.id ||
    m.eventId !== scenario.eventId ||
    m.dayIndex !== scenario.dayIndex
  )
    throw new RangeError("Invalid scenario manifest");
  const normal = createMatchWithEvents(
    {
      matchId,
      mode: "SKIRMISH",
      humanSide: m.humanSide,
      difficulty: m.difficulty,
      versions: {
        rules: "rules_v1",
        content: "elements_v1",
        locations: "locations_v1",
        bot: "bot_v1",
      },
      decks: m.decks,
    },
    createRandomStreams(Buffer.from(m.seedHex, "hex")),
  );
  const state: MatchState = normal.nextState,
    events: GameEvent[] = [];
  state.mode = "DAILY_CHALLENGE";
  state.challenge = {
    scenarioId: scenario.id,
    eventId: scenario.eventId,
    dayIndex: scenario.dayIndex,
    manifestSha256: scenario.sha256,
    arenaKey: scenario.arenaKey,
  };
  state.eventSeq = 0;
  state.turn = m.turn;
  emitEvent(state, events, {
    kind: "MatchStarted",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: {
      mode: state.mode,
      heroes: { GOOD: m.decks.GOOD.heroId, EVIL: m.decks.EVIL.heroId },
      versions: { ...state.versions },
    },
  });
  for (const lane of state.board) lane.location = { state: "NORMAL" };
  for (const location of m.locations)
    state.board[location.laneId - 1]!.location = {
      state: "ACTIVE",
      definitionId: location.id,
      revealTurn: location.laneId,
    };
  for (const side of ["EVIL", "GOOD"] as const) {
    const p = state.players[side];
    p.deck = [...p.hand, ...p.deck];
    p.hand = [];
    p.mulliganCommitted = true;
    p.hp = m.heroHp[side];
    p.energy = { current: m.energy[side], max: Math.min(m.turn, 10) };
  }
  const take = (side: Side, id: CardId) => {
    const p = state.players[side],
      index = p.deck.findIndex((c) => c.definitionId === id);
    if (index < 0)
      throw new RangeError("Scenario exhausts borrowed card copies");
    return p.deck.splice(index, 1)[0]!;
  };
  for (const placement of m.board) {
    const def = elementsCatalog.cards.find((c) => c.id === placement.cardId)!;
    if (def.type !== "UNIT")
      throw new RangeError("Scenario board requires units");
    const held = take(placement.owner, placement.cardId);
    const u = createUnitOnDraft(
      state,
      events,
      def,
      placement.owner,
      placement.laneId,
      "PLAY",
      held.instanceId,
    );
    if (placement.hp !== null) {
      if (
        !Number.isInteger(placement.hp) ||
        placement.hp < 1 ||
        placement.hp > u.current.maxHp
      )
        throw new RangeError("Invalid scenario HP");
      const before = { ...u.current };
      u.current.hp = placement.hp;
      emitStats(state, events, u, before);
    }
  }
  for (const side of ["EVIL", "GOOD"] as const) {
    for (const id of m.hand[side]) {
      const held = take(side, id);
      state.players[side].hand.push(held);
      emitSetupDraw(state, side, held, events);
    }
    emitHandCount(state, side, events);
    grantPowerOnDraft(state, events, side, "INITIAL");
  }
  changePhaseOnDraft(state, events, m.phase);
  return transition(state, events);
}
