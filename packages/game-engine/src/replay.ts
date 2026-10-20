import type { EngineAction, GameEvent, MatchState } from "./model.js";
import type { RandomState } from "./rng.js";
import { applyAction } from "./actions.js";
import { advanceAutomatic } from "./automatic.js";
import { hashState, canonicalJson } from "./hash.js";
export type AutomaticOperation =
  | {
      kind: "COMBAT_ROOT";
      continuation: NonNullable<MatchState["continuation"]>;
    }
  | { kind: "TURN_END_ROOT"; cursor: MatchState["endTurn"] | null }
  | { kind: "TURN_START_ROOT" };
type JournalBase = {
  stepSeq: number;
  preStateHash: string;
  postStateHash: string;
  firstEventSeq: number | null;
  lastEventSeq: number | null;
};
export type JournalEntry = JournalBase &
  (
    | { origin: "HUMAN"; action: EngineAction; nextBotRandomState: null }
    | { origin: "BOT"; action: EngineAction; nextBotRandomState: RandomState }
    | { origin: "AUTO"; action: AutomaticOperation; nextBotRandomState: null }
  );
export type ReplayMismatch =
  | "STEP_SEQUENCE"
  | "PRE_HASH"
  | "AUTOMATIC_OPERATION"
  | "INVALID_ACTION"
  | "BOT_RANDOM_STATE"
  | "POST_HASH"
  | "EVENT_BOUNDS";
export type ReplayResult =
  | { ok: true; finalState: MatchState; events: GameEvent[] }
  | { ok: false; stepSeq: number; reason: ReplayMismatch };
export function describeAutomaticOperation(
  state: MatchState,
): AutomaticOperation | null {
  if (state.lifecycle !== "ACTIVE" || state.blockResponse) return null;
  if (state.phase === "COMBAT" && state.continuation)
    return {
      kind: "COMBAT_ROOT",
      continuation: structuredClone(state.continuation),
    };
  if (state.phase === "TURN_END")
    return {
      kind: "TURN_END_ROOT",
      cursor: structuredClone(state.endTurn ?? null),
    };
  if (state.phase === "TURN_START") return { kind: "TURN_START_ROOT" };
  return null;
}
function validRandom(value: unknown): value is RandomState {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((n) => Number.isSafeInteger(n) && n >= 0 && n <= 0xffffffff) &&
    value.some((n) => n !== 0)
  );
}
export function replayJournal(
  initialState: MatchState,
  entries: readonly JournalEntry[],
): ReplayResult {
  let current = structuredClone(initialState);
  const events: GameEvent[] = [];
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index]!;
    const fail = (reason: ReplayMismatch): ReplayResult => ({
      ok: false,
      stepSeq: entry.stepSeq,
      reason,
    });
    if (entry.stepSeq !== index + 1) return fail("STEP_SEQUENCE");
    if (hashState(current) !== entry.preStateHash) return fail("PRE_HASH");
    if (
      entry.origin === "AUTO" &&
      canonicalJson(describeAutomaticOperation(current)) !==
        canonicalJson(entry.action)
    )
      return fail("AUTOMATIC_OPERATION");
    if (
      (entry.origin === "BOT" && !validRandom(entry.nextBotRandomState)) ||
      (entry.origin !== "BOT" && entry.nextBotRandomState !== null)
    )
      return fail("BOT_RANDOM_STATE");
    if (entry.origin !== "AUTO" && entry.action.action.kind === "ADVANCE")
      return fail("INVALID_ACTION");
    const result =
      entry.origin === "AUTO"
        ? advanceAutomatic(current, { maxRoots: 1 })
        : applyAction(current, entry.action);
    if (result.kind !== "transition") return fail("INVALID_ACTION");
    const after = result.nextState;
    if (entry.origin === "BOT")
      after.random.states["bot:easy"] = structuredClone(
        entry.nextBotRandomState,
      );
    if (hashState(after) !== entry.postStateHash) return fail("POST_HASH");
    if (
      (result.events[0]?.sequence ?? null) !== entry.firstEventSeq ||
      (result.events.at(-1)?.sequence ?? null) !== entry.lastEventSeq
    )
      return fail("EVENT_BOUNDS");
    current = after;
    events.push(...result.events);
  }
  return { ok: true, finalState: current, events };
}
