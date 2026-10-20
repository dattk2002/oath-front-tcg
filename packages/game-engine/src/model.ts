import type {
  DeckInput,
  ErrorResponse,
  HandCard,
  HeroView,
  Lifecycle,
  LocationId,
  Outcome,
  Phase,
  PlayerAction,
  PowerId,
  ReservePower,
  Side,
  UnitView,
  Versions,
  VisibleEvent,
} from "@oathfront/contracts";
import type { RandomStreams } from "./rng.js";

export type PlayerId = Side;
export type LaneId = 1 | 2 | 3 | 4 | 5;
export type EngineAction = { actor: PlayerId; action: PlayerAction };
export interface AdvanceBudget {
  /** Deterministic complete scheduled roots; clamped to eight per call. */
  maxRoots: number;
}
export interface MatchConfig {
  matchId: string;
  mode: "SKIRMISH" | "TUTORIAL";
  humanSide: PlayerId;
  difficulty: "EASY" | "NORMAL";
  versions: Versions;
  decks: Record<PlayerId, DeckInput>;
}
export interface PlayerState extends Omit<
  HeroView,
  "handCount" | "deckCount" | "reserveCount"
> {
  hand: HandCard[];
  deck: HandCard[];
  reserve: ReservePower[];
  receivedPowerIds: PowerId[];
  mulliganCommitted: boolean;
}
export type UnitState = Omit<UnitView, "laneId"> & {
  laneId: LaneId;
  creationSeq: number;
};
export type LocationState =
  | { state: "NORMAL" }
  | {
      state: "HIDDEN" | "ACTIVE";
      definitionId: LocationId;
      revealTurn: 1 | 3 | 5;
    };
export interface LaneState {
  laneId: LaneId;
  location: LocationState;
  good: UnitState | null;
  evil: UnitState | null;
}
export interface MatchState extends Omit<MatchConfig, "decks"> {
  deckSnapshots: Record<PlayerId, DeckInput>;
  lifecycle: Lifecycle;
  turn: number;
  phase: Phase;
  activeSide: PlayerId | null;
  players: Record<PlayerId, PlayerState>;
  board: LaneState[];
  random: RandomStreams;
  instanceSeq: number;
  creationSeq: number;
  eventSeq: number;
  rootSeq: number;
  turnCounters: Record<string, number>;
  continuation: {
    laneId: LaneId;
    stage: "BEFORE_PAIR" | "PAIR" | "BLOCK_RESPONSES" | "AFTER_LANE";
    pendingResponders: { side: PlayerId; powerInstanceId: string }[];
    /** Remaining independent BEFORE_COMBAT_HERE roots, in stable snapshot order. */
    beforeCombatJobs?: { source: UnitState; abilityId: string }[];
  } | null;
  blockResponse: {
    side: PlayerId;
    laneId: LaneId;
    powerInstanceId: string;
  } | null;
  endTurn?: {
    stage: "HOOKS" | "LOCATIONS" | "EXPIRY";
    jobs: { source: UnitState; abilityId: string }[];
    locationIndex: number;
  };
  outcome: Outcome | null;
}
export type ServerDiagnostic = {
  eventId: string;
  sequence: number;
  rootId: string;
  kind: "BotGuardFault";
  visibility: "SERVER";
  ownerSide: null;
  payload: { turn: number; botIntents: 64 };
};
export type GameEvent = VisibleEvent | ServerDiagnostic;
export interface TransitionResult {
  kind: "transition";
  nextState: MatchState;
  events: GameEvent[];
  waitingForInput: boolean;
  terminalOutcome: Outcome | null;
}
export interface ActionError {
  kind: "error";
  code: Extract<
    ErrorResponse["error"],
    { code: "ILLEGAL_ACTION" }
  >["details"]["reason"];
}
