import type { DeckInput, HandCard, Side } from "@oathfront/contracts";
import { validateWire } from "@oathfront/contracts";
import { coreCatalog, validateDeck } from "@oathfront/game-content";
import type {
  GameEvent,
  MatchConfig,
  MatchState,
  PlayerState,
  TransitionResult,
} from "./model.js";
import { algorithmVersion, randomScopes, shuffle } from "./rng.js";
import type { RandomStreams } from "./rng.js";
import { allocateInstanceId } from "./identity.js";
import { assignLocations } from "./locations.js";
import { emitEvent, transition } from "./events.js";

function validateConfig(config: MatchConfig, random: RandomStreams): void {
  if (
    !validateWire("Uuid", config.matchId) ||
    !["GOOD", "EVIL"].includes(config.humanSide) ||
    !["SKIRMISH", "TUTORIAL"].includes(config.mode) ||
    !["EASY", "NORMAL"].includes(config.difficulty)
  )
    throw new TypeError("Invalid match configuration");
  if (
    !validateWire("Versions", config.versions) ||
    config.versions.rules !== coreCatalog.rulesVersion ||
    config.versions.content !== coreCatalog.version ||
    config.versions.locations !== coreCatalog.locationVersion ||
    config.versions.bot !== "bot_v1"
  )
    throw new RangeError("Unsupported match version");
  for (const side of ["EVIL", "GOOD"] as const) {
    const deck = config.decks[side];
    if (
      !validateWire("DeckInput", deck) ||
      !validateDeck(deck, coreCatalog).playable ||
      !coreCatalog.heroes.some(
        (h) => h.id === deck.heroId && h.faction === side,
      )
    )
      throw new TypeError(`Invalid ${side} deck`);
  }
  if (
    random.algorithmVersion !== algorithmVersion ||
    !/^[a-f0-9]{64}$/.test(random.identityKey) ||
    randomScopes.some((scope) => {
      const words = random.states[scope];
      return (
        !Array.isArray(words) ||
        words.length !== 4 ||
        !words.every(
          (n) => Number.isSafeInteger(n) && n >= 0 && n <= 0xffffffff,
        ) ||
        words.every((n) => n === 0)
      );
    })
  )
    throw new TypeError("Invalid random stream snapshot");
}
function emptyPlayer(deck: DeckInput): PlayerState {
  return {
    heroId: deck.heroId,
    hp: 20,
    maxHp: 20,
    energy: { current: 0, max: 0 },
    block: { charge: 0, used: 0, active: true },
    hand: [],
    deck: [],
    discard: [],
    reserve: [],
    receivedPowerIds: [],
    usedPowers: [],
    fatigueCounter: 0,
    mulliganCommitted: false,
  };
}
export function emitSetupDraw(
  state: MatchState,
  side: Side,
  card: HandCard,
  events: GameEvent[],
): void {
  const player = state.players[side];
  emitEvent(state, events, {
    kind: "CardDrawn",
    visibility: "OWNER",
    ownerSide: side,
    payload: {
      side,
      card: { ...card },
      handCount: player.hand.length,
      deckCount: player.deck.length,
    },
  });
}
export function emitHandCount(
  state: MatchState,
  side: Side,
  events: GameEvent[],
): void {
  const player = state.players[side];
  emitEvent(state, events, {
    kind: "HandCountChanged",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: {
      side,
      handCount: player.hand.length,
      deckCount: player.deck.length,
    },
  });
}
export function createMatch(
  config: MatchConfig,
  random: RandomStreams,
): MatchState {
  return createMatchWithEvents(config, random).nextState;
}
export function createMatchWithEvents(
  config: MatchConfig,
  random: RandomStreams,
): TransitionResult {
  validateConfig(config, random);
  const { decks, ...metadata } = structuredClone(config);
  const state: MatchState = {
    ...metadata,
    deckSnapshots: decks,
    lifecycle: "ACTIVE",
    turn: 0,
    phase: "MULLIGAN",
    activeSide: null,
    players: { EVIL: emptyPlayer(decks.EVIL), GOOD: emptyPlayer(decks.GOOD) },
    board: [],
    random: structuredClone(random),
    instanceSeq: 0,
    creationSeq: 0,
    eventSeq: 0,
    rootSeq: 1,
    turnCounters: {},
    continuation: null,
    blockResponse: null,
    outcome: null,
  };
  const events: GameEvent[] = [];
  emitEvent(state, events, {
    kind: "MatchStarted",
    visibility: "PUBLIC",
    ownerSide: null,
    payload: {
      mode: state.mode,
      heroes: { EVIL: decks.EVIL.heroId, GOOD: decks.GOOD.heroId },
      versions: { ...state.versions },
    },
  });
  for (const side of ["EVIL", "GOOD"] as const) {
    const player = state.players[side],
      scope = side === "EVIL" ? "deck:evil" : "deck:good";
    const cards: HandCard[] = decks[side].entries.flatMap((entry) =>
      Array.from({ length: entry.quantity }, () => ({
        instanceId: allocateInstanceId(state),
        definitionId: entry.cardId,
      })),
    );
    const shuffled = shuffle(cards, state.random.states[scope]);
    state.random.states[scope] = shuffled.state;
    player.deck = shuffled.value;
  }
  const locations = assignLocations(state.random.states.location);
  state.random.states.location = locations.state;
  state.board = locations.value;
  for (const side of ["EVIL", "GOOD"] as const) {
    const player = state.players[side];
    for (let i = 0; i < 4; i++) {
      const card = player.deck.shift()!;
      player.hand.push(card);
      emitSetupDraw(state, side, card, events);
    }
    emitHandCount(state, side, events);
  }
  return transition(state, events);
}
