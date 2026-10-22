import { tutorialView } from "./tutorial.js";
import type {
  HeroView,
  LaneView,
  PlayerView,
  VisibleEvent,
} from "@oathfront/contracts";
import { validateWire } from "@oathfront/contracts";
import type { GameEvent, MatchState, PlayerId } from "./model.js";
import { getLegalActions } from "./actions.js";
import { unitView } from "./modifiers.js";
function hero(state: MatchState, side: PlayerId): HeroView {
  const p = state.players[side];
  return structuredClone({
    heroId: p.heroId,
    hp: p.hp,
    maxHp: p.maxHp,
    energy: p.energy,
    block: p.block,
    handCount: p.hand.length,
    deckCount: p.deck.length,
    reserveCount: p.reserve.length,
    discard: p.discard,
    usedPowers: p.usedPowers,
    fatigueCounter: p.fatigueCounter,
  });
}
export function projectPlayerView(
  state: MatchState,
  viewer: PlayerId,
): PlayerView {
  const lanes: LaneView[] = state.board.map((l) => ({
    laneId: l.laneId,
    location:
      l.location.state === "NORMAL"
        ? { state: "NORMAL" }
        : l.location.state === "HIDDEN"
          ? { state: "HIDDEN", revealTurn: l.location.revealTurn }
          : {
              state: "REVEALED",
              definitionId: l.location.definitionId,
              revealTurn: l.location.revealTurn,
            },
    good: l.good ? unitView(l.good) : null,
    evil: l.evil ? unitView(l.evil) : null,
  }));
  if (lanes.length !== 5) throw new RangeError("Invalid board");
  const [a, b, c, d, e] = lanes;
  if (!a || !b || !c || !d || !e) throw new RangeError("Invalid board");
  const p = state.players[viewer],
    r = state.blockResponse;
  const view: PlayerView = {
    schemaVersion: "api_v1",
    matchId: state.matchId,
    mode: state.mode,
    lifecycle: state.lifecycle,
    humanSide: state.humanSide,
    turn: state.turn,
    phase: state.phase,
    activeSide:
      state.phase === "MULLIGAN"
        ? state.players[state.humanSide].mulliganCommitted
          ? null
          : state.humanSide
        : (state.blockResponse?.side ?? state.activeSide),
    versions: structuredClone(state.versions),
    players: { GOOD: hero(state, "GOOD"), EVIL: hero(state, "EVIL") },
    board: [a, b, c, d, e],
    self: {
      side: viewer,
      hand: p.hand.map((c) => ({
        instanceId: c.instanceId,
        definitionId: c.definitionId,
      })),
      reserve: p.reserve.map((c) => ({
        instanceId: c.instanceId,
        definitionId: c.definitionId,
        normalCost: c.normalCost,
      })),
      mulliganCommitted: p.mulliganCommitted,
    },
    legalActions: getLegalActions(state, viewer),
    blockResponse: !r
      ? null
      : r.side === viewer
        ? {
            visibility: "OWN",
            side: r.side,
            laneId: r.laneId,
            powerInstanceId: r.powerInstanceId,
            costNow: 0,
          }
        : { visibility: "OPPONENT", side: r.side, laneId: r.laneId },
    combat: state.continuation
      ? { laneId: state.continuation.laneId, stage: state.continuation.stage }
      : null,
    outcome: state.outcome ? { ...state.outcome } : null,
    tutorial: tutorialView(state),
    ...(state.challenge ? { challenge: structuredClone(state.challenge) } : {}),
  };
  if (!validateWire("PlayerView", view))
    throw new RangeError("Invalid public view");
  return view;
}
/** Exact schema validation rejects extra payload fields; never forward raw/private event extensions. */
export function projectEvents(
  events: readonly GameEvent[],
  viewer: PlayerId,
): VisibleEvent[] {
  return events
    .filter(
      (e): e is VisibleEvent =>
        (e.visibility === "PUBLIC" ||
          (e.visibility === "OWNER" && e.ownerSide === viewer)) &&
        validateWire("VisibleEvent", e),
    )
    .map((e) => structuredClone(e));
}
