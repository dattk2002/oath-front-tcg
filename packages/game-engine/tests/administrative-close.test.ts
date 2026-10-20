import { expect, it } from "vitest";
import {
  abandonMatch,
  replayJournal,
  hashState,
  applyAction,
  projectPlayerView,
} from "../src/index.js";
import type { JournalEntry } from "../src/index.js";
import { ready } from "./helpers.js";
it.each(["ACCOUNT_MERGE", "EXPIRED"] as const)(
  "administrative %s is immutable, terminal, replayable and not a player command",
  (reason) => {
    const state = ready(),
      before = structuredClone(state),
      result = abandonMatch(state, reason);
    expect(state).toEqual(before);
    expect(result.nextState.lifecycle).toBe("ABANDONED");
    expect(result.nextState.outcome).toEqual({
      result: "NONE",
      winner: null,
      reason,
    });
    expect(result.nextState.phase).toBe("GAME_OVER");
    expect(result.nextState.activeSide).toBeNull();
    expect(
      projectPlayerView(result.nextState, state.humanSide).legalActions,
    ).toEqual([]);
    const entry: JournalEntry = {
      stepSeq: 1,
      origin: "AUTO",
      action: { kind: "ADMIN_ABANDON", reason },
      nextBotRandomState: null,
      preStateHash: hashState(state),
      postStateHash: hashState(result.nextState),
      firstEventSeq: result.events[0]!.sequence,
      lastEventSeq: result.events.at(-1)!.sequence,
    };
    expect(replayJournal(state, [entry])).toMatchObject({
      ok: true,
      finalState: result.nextState,
      events: result.events,
    });
    expect(
      applyAction(result.nextState, {
        actor: state.humanSide,
        action: { kind: "RESUME" },
      }),
    ).toMatchObject({ kind: "error" });
    expect(() => abandonMatch(result.nextState, reason)).toThrow(
      "Match already terminal",
    );
    const malformed = structuredClone(entry);
    Object.assign(malformed.action, { reason: "SURRENDER" });
    expect(replayJournal(state, [malformed])).toMatchObject({
      ok: false,
      reason: "INVALID_ACTION",
    });
  },
);
