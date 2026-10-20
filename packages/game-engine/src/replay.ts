import { tutorialCanAdvance } from "./tutorial.js";
import { validateWire } from "@oathfront/contracts";
import type { EngineAction, GameEvent, MatchState } from "./model.js";
import type { RandomState } from "./rng.js";
import { abandonMatch } from "./terminal.js";
import { applyAction } from "./actions.js";
import { applyBotGuardFault, hasBotDecision } from "./bot-guard.js";
import { advanceAutomatic } from "./automatic.js";
import { hashState, canonicalJson } from "./hash.js";
export type AutomaticOperation =
  | {
      kind: "TUTORIAL_LOAD_SCENE";
      scenarioId: "tutorial_v1" | "tutorial_evil_v1";
      sceneId: "A" | "B" | "C" | "D" | "E";
      ordinal: number;
      manifestVersion: "tutorial_v1";
    }
  | { kind: "ADMIN_ABANDON"; reason: "ACCOUNT_MERGE" | "EXPIRED" }
  | {
      kind: "COMBAT_ROOT";
      continuation: NonNullable<MatchState["continuation"]>;
    }
  | { kind: "TURN_END_ROOT"; cursor: MatchState["endTurn"] | null }
  | { kind: "TURN_START_ROOT" }
  | { kind: "BOT_GUARD_FAULT"; turn: number; botIntents: 64 };
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
  | "EVENT_BOUNDS"
  | "BOT_GUARD";
export type ReplayResult =
  | {
      ok: true;
      finalState: MatchState;
      events: GameEvent[];
      botIntentsThisTurn: number;
    }
  | { ok: false; stepSeq: number; reason: ReplayMismatch };
export function describeAutomaticOperation(
  state: MatchState,
  botIntentsThisTurn = 0,
): AutomaticOperation | null {
  if (state.lifecycle === "ACTIVE" && state.tutorial?.pendingScene)
    return {
      kind: "TUTORIAL_LOAD_SCENE",
      scenarioId: state.tutorial.scenarioId,
      sceneId: state.tutorial.pendingScene,
      ordinal: state.tutorial.sceneLoadOrdinal + 1,
      manifestVersion: "tutorial_v1",
    };
  if (!tutorialCanAdvance(state)) return null;
  if (botIntentsThisTurn === 64 && hasBotDecision(state))
    return { kind: "BOT_GUARD_FAULT", turn: state.turn, botIntents: 64 };
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
  botIntentsThisTurn = 0,
): ReplayResult {
  if (
    !Number.isSafeInteger(botIntentsThisTurn) ||
    botIntentsThisTurn < 0 ||
    botIntentsThisTurn > 64
  )
    return {
      ok: false,
      stepSeq: entries[0]?.stepSeq ?? 0,
      reason: "BOT_GUARD",
    };
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
      entry.action.kind !== "ADMIN_ABANDON" &&
      canonicalJson(describeAutomaticOperation(current, botIntentsThisTurn)) !==
        canonicalJson(entry.action)
    )
      return fail("AUTOMATIC_OPERATION");
    if (
      (entry.origin === "BOT" && !validRandom(entry.nextBotRandomState)) ||
      (entry.origin !== "BOT" && entry.nextBotRandomState !== null)
    )
      return fail("BOT_RANDOM_STATE");
    if (
      entry.origin !== "AUTO" &&
      (!["HUMAN", "BOT"].includes(entry.origin) ||
        Object.keys(entry.action).sort().join(",") !== "action,actor" ||
        !validateWire("PlayerAction", entry.action.action) ||
        entry.action.action.kind === "ADVANCE" ||
        entry.action.actor !==
          (entry.origin === "HUMAN"
            ? current.humanSide
            : current.humanSide === "GOOD"
              ? "EVIL"
              : "GOOD"))
    )
      return fail("INVALID_ACTION");
    if (entry.origin === "BOT" && botIntentsThisTurn >= 64)
      return fail("BOT_GUARD");
    if (
      entry.origin === "AUTO" &&
      entry.action.kind === "ADMIN_ABANDON" &&
      (Object.keys(entry.action).sort().join(",") !== "kind,reason" ||
        !["ACCOUNT_MERGE", "EXPIRED"].includes(entry.action.reason) ||
        !["ACTIVE", "PAUSED"].includes(current.lifecycle))
    )
      return fail("INVALID_ACTION");
    const result =
      entry.origin === "AUTO"
        ? entry.action.kind === "ADMIN_ABANDON"
          ? abandonMatch(current, entry.action.reason)
          : entry.action.kind === "BOT_GUARD_FAULT"
            ? applyBotGuardFault(current, botIntentsThisTurn)
            : advanceAutomatic(current, { maxRoots: 1 })
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
    botIntentsThisTurn =
      after.turn !== current.turn
        ? 0
        : botIntentsThisTurn + Number(entry.origin === "BOT");
    current = after;
    events.push(...result.events);
  }
  return { ok: true, finalState: current, events, botIntentsThisTurn };
}
