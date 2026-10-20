import { isDeepStrictEqual } from "node:util";
import { validateWire } from "@oathfront/contracts";
import {
  applyAction,
  advanceAutomatic,
  describeAutomaticOperation,
  hashState,
  replayJournal,
} from "@oathfront/game-engine";
import type {
  MatchState,
  EngineAction,
  RandomState,
  TransitionResult,
  JournalEntry,
} from "@oathfront/game-engine";
import type { PoolClient } from "@oathfront/db";
import type { GameEvent } from "@oathfront/game-engine";
import { PersistenceError, validateState } from "./checkpoint.js";
const validRandom = (value: unknown): value is RandomState =>
  Array.isArray(value) &&
  value.length === 4 &&
  value.every((n) => Number.isSafeInteger(n) && n >= 0 && n <= 0xffffffff) &&
  value.some((n) => n !== 0);
function bounds(result: TransitionResult) {
  return {
    firstEventSeq: result.events[0]?.sequence ?? null,
    lastEventSeq: result.events.at(-1)?.sequence ?? null,
  };
}
export function recordIntent(
  state: MatchState,
  action: EngineAction,
  origin: "HUMAN" | "BOT",
  stepSeq: number,
  nextBotRandomState: RandomState | null,
) {
  if (
    origin === "BOT"
      ? !validRandom(nextBotRandomState)
      : nextBotRandomState !== null
  )
    throw new PersistenceError("INVALID_BOT_RNG");
  if (
    !validateWire("PlayerAction", action.action) ||
    action.action.kind === "ADVANCE" ||
    action.actor !==
      (origin === "HUMAN"
        ? state.humanSide
        : state.humanSide === "GOOD"
          ? "EVIL"
          : "GOOD")
  )
    throw new PersistenceError("INVALID_JOURNAL_ACTION");
  const transition = applyAction(state, action);
  if (transition.kind !== "transition")
    throw new PersistenceError("INVALID_JOURNAL_ACTION");
  if (origin === "BOT" && nextBotRandomState)
    transition.nextState.random.states["bot:easy"] =
      structuredClone(nextBotRandomState);
  const common = {
    stepSeq,
    action,
    preStateHash: hashState(state),
    postStateHash: hashState(transition.nextState),
    ...bounds(transition),
  };
  const entry: JournalEntry =
    origin === "BOT" && nextBotRandomState
      ? {
          ...common,
          origin,
          nextBotRandomState: structuredClone(nextBotRandomState),
        }
      : { ...common, origin: "HUMAN", nextBotRandomState: null };
  return { transition, entry };
}
export function recordAutomatic(state: MatchState, stepSeq: number) {
  const action = describeAutomaticOperation(state);
  if (!action) throw new PersistenceError("NO_AUTOMATIC_ROOT");
  const transition = advanceAutomatic(state, { maxRoots: 1 });
  const entry: JournalEntry = {
    stepSeq,
    origin: "AUTO",
    action,
    nextBotRandomState: null,
    preStateHash: hashState(state),
    postStateHash: hashState(transition.nextState),
    ...bounds(transition),
  };
  return { transition, entry };
}
/** Bounded append validation; stored sequences remain global, only the replay copy is normalized. */
export function validateJournalBatch(
  before: MatchState,
  lastStepSeq: number,
  transition: TransitionResult,
  entries: readonly JournalEntry[],
) {
  if (
    entries.length < 1 ||
    entries.length > 8 ||
    entries.some((e, i) => e.stepSeq !== lastStepSeq + i + 1)
  )
    throw new PersistenceError("INVALID_JOURNAL_SEQUENCE");
  for (const e of entries) {
    if (
      Object.keys(e).sort().join(",") !==
      "action,firstEventSeq,lastEventSeq,nextBotRandomState,origin,postStateHash,preStateHash,stepSeq"
    )
      throw new PersistenceError("INVALID_JOURNAL_SHAPE");
    if (
      e.origin !== "AUTO" &&
      (!validateWire("PlayerAction", e.action.action) ||
        Object.keys(e.action).sort().join(",") !== "action,actor" ||
        e.action.actor !==
          (e.origin === "HUMAN"
            ? before.humanSide
            : before.humanSide === "GOOD"
              ? "EVIL"
              : "GOOD"))
    )
      throw new PersistenceError("INVALID_JOURNAL_ACTION");
  }
  const replay = replayJournal(
    before,
    entries.map((entry, i) => ({ ...entry, stepSeq: i + 1 })),
  );
  if (
    !replay.ok ||
    !isDeepStrictEqual(replay.finalState, transition.nextState) ||
    !isDeepStrictEqual(replay.events, transition.events)
  )
    throw new PersistenceError("INVALID_JOURNAL_TRANSITION");
  validateState(transition.nextState);
  return replay;
}

export async function appendEvents(
  tx: PoolClient,
  matchId: string,
  events: readonly GameEvent[],
) {
  for (const event of events) {
    if (
      !validateWire("VisibleEvent", event) ||
      event.eventId !== matchId + ":" + event.sequence
    )
      throw new PersistenceError("INVALID_EVENT");
    await tx.query(
      "INSERT INTO match_events(match_id,seq,event_id,root_id,kind,visibility,owner_side,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        matchId,
        event.sequence,
        event.eventId,
        event.rootId,
        event.kind,
        event.visibility,
        event.ownerSide,
        JSON.stringify(event.payload),
      ],
    );
  }
}
