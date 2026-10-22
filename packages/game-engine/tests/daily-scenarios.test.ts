import { expect, it } from "vitest";
import { canonicalJson } from "../src/hash.js";
import { projectPlayerView } from "../src/projection.js";
import { replayJournal } from "../src/replay.js";
import { validateWire } from "@oathfront/contracts";
import { validateState } from "../../../apps/api/src/matches/checkpoint.js";
import { seasonScenarios } from "@oathfront/game-content/events";
import { createChallengeMatch } from "../src/challenges.js";
import { applyAction } from "../src/actions.js";
import { hashState } from "../src/hash.js";
it("bootstraps all84 genuine preset scenes deterministically with closed views and replayable state", async () => {
  for (const scenario of seasonScenarios) {
    const id = "31234567-1234-4123-8123-123456789012";
    const a = createChallengeMatch(id, scenario),
      b = createChallengeMatch(id, scenario);
    expect(canonicalJson(a)).toBe(canonicalJson(b));
    expect(a.nextState.mode).toBe("DAILY_CHALLENGE");
    expect(validateState(a.nextState)).toBe(a.nextState);
    for (const side of ["GOOD", "EVIL"] as const)
      expect(
        validateWire("PlayerView", projectPlayerView(a.nextState, side)),
      ).toBe(true);
    const action = {
      actor: a.nextState.humanSide,
      action: { kind: "PASS_PHASE" as const },
    };
    const result = applyAction(a.nextState, action);
    expect(result.kind).toBe("transition");
    if (result.kind !== "transition") throw Error(result.code);
    expect(
      replayJournal(a.nextState, [
        {
          stepSeq: 1,
          origin: "HUMAN",
          action,
          nextBotRandomState: null,
          preStateHash: hashState(a.nextState),
          postStateHash: hashState(result.nextState),
          firstEventSeq: result.events[0]?.sequence ?? null,
          lastEventSeq: result.events.at(-1)?.sequence ?? null,
        },
      ]),
    ).toMatchObject({
      ok: true,
      finalState: result.nextState,
      events: result.events,
    });
    expect(
      a.nextState.board.some(
        (l: { good: unknown; evil: unknown }) => l.good || l.evil,
      ),
    ).toBe(true);
    for (const side of ["GOOD", "EVIL"] as const) {
      const p = a.nextState.players[side],
        placed = a.nextState.board.filter(
          (l: { good: unknown; evil: unknown }) =>
            l[side === "GOOD" ? "good" : "evil"],
        ).length;
      expect(p.hand.length + p.deck.length + placed).toBe(30);
    }
  }
});
