import type { LocationDefinition, LocationId } from "@oathfront/contracts";
import { coreCatalog } from "@oathfront/game-content";
import type {
  GameEvent,
  LaneId,
  LaneState,
  MatchState,
  TransitionResult,
} from "./model.js";
import type { RandomResult, RandomState } from "./rng.js";
import { nextInt, shuffle } from "./rng.js";
import { emitEvent, transition } from "./events.js";

export function enumerateLocationTriples(
  locations: readonly LocationDefinition[],
): [LocationId, LocationId, LocationId][] {
  const sorted = [...locations].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  const triples: [LocationId, LocationId, LocationId][] = [];
  for (let i = 0; i < sorted.length - 2; i++)
    for (let j = i + 1; j < sorted.length - 1; j++)
      for (let k = j + 1; k < sorted.length; k++) {
        const a = sorted[i]!,
          b = sorted[j]!,
          c = sorted[k]!;
        if ([a, b, c].some((l) => l.group === "BUFF" || l.group === "NEUTRAL"))
          triples.push([a.id, b.id, c.id]);
      }
  return triples;
}
export function assignLocations(state: RandomState): RandomResult<LaneState[]> {
  const triples = enumerateLocationTriples(coreCatalog.locations);
  const subset = nextInt(state, triples.length);
  const permutation = shuffle(triples[subset.value]!, subset.state);
  const lanes: LaneId[] = [1, 2, 3, 4, 5];
  return {
    state: permutation.state,
    value: lanes.map((laneId): LaneState => ({
      laneId,
      good: null,
      evil: null,
      location:
        laneId === 2 || laneId === 4
          ? { state: "NORMAL" }
          : {
              state: "HIDDEN",
              definitionId: permutation.value[(laneId - 1) / 2]!,
              revealTurn: laneId,
            },
    })),
  };
}
/** Effect callers must use this gate rather than reading private assignment directly. */
export function getActiveLocation(
  state: MatchState,
  laneId: number,
): LocationDefinition | null {
  const location = state.board.find((lane) => lane.laneId === laneId)?.location;
  return location?.state === "ACTIVE"
    ? coreCatalog.locations.find((d) => d.id === location.definitionId)!
    : null;
}
/** Turn-start primitive. Core locations have no on-reveal effect; no retroactive entry buffs. */
export function revealLocationsOnDraft(
  state: MatchState,
  turn: number,
  events: GameEvent[],
): void {
  for (const lane of state.board)
    if (lane.location.state === "HIDDEN" && lane.location.revealTurn === turn) {
      lane.location.state = "ACTIVE";
      emitEvent(state, events, {
        kind: "LocationRevealed",
        visibility: "PUBLIC",
        ownerSide: null,
        payload: {
          laneId: lane.laneId,
          definitionId: lane.location.definitionId,
        },
      });
    }
}
export function revealLocations(
  state: MatchState,
  turn: number,
): TransitionResult {
  const nextState = structuredClone(state),
    events: GameEvent[] = [];
  if (
    nextState.board.some(
      (l) => l.location.state === "HIDDEN" && l.location.revealTurn === turn,
    )
  )
    ++nextState.rootSeq;
  revealLocationsOnDraft(nextState, turn, events);
  return transition(nextState, events);
}
