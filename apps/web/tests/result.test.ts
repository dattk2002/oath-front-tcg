import { it, expect } from "vitest";
import type { MatchSummary } from "@oathfront/contracts";
import { resultCopy } from "../src/features/match/ResultDialog.js";
const summary: MatchSummary = {
  matchId: "10000000-0000-4000-8000-000000000001",
  mode: "SKIRMISH",
  lifecycle: "COMPLETED",
  humanHeroId: "H_G_BV",
  opponentHeroId: "H_E_FX",
  difficulty: "EASY",
  outcome: null,
  turns: 1,
  activeDurationMs: 1000,
  damageDealt: 0,
  createdAt: "2026-10-20T00:00:00Z",
  endedAt: "2026-10-20T00:01:00Z",
  resumable: false,
  blocksUsed: 0,
  rematch: null,
};
it("a surrendered LOSS is distinct from a WIN with the opponent surrendering", () => {
  expect(
    resultCopy({
      ...summary,
      outcome: { result: "LOSS", winner: "EVIL", reason: "SURRENDER" },
    }).heading,
  ).toBe("Surrendered");
  expect(
    resultCopy({
      ...summary,
      outcome: { result: "WIN", winner: "GOOD", reason: "SURRENDER" },
    }).heading,
  ).toBe("Victory");
});
it("draw, abandonment, fault and tutorial outcomes stay distinct from ranked win/loss copy", () => {
  expect(
    resultCopy({
      ...summary,
      outcome: { result: "DRAW", winner: null, reason: "TURN_LIMIT" },
    }),
  ).toEqual({ heading: "Draw", body: "Turn 20 has ended." });
  expect(
    resultCopy({
      ...summary,
      lifecycle: "ABANDONED",
      outcome: { result: "NONE", winner: null, reason: "EXPIRED" },
    }),
  ).toEqual({
    heading: "Match closed",
    body: "This match expired; no loss recorded.",
  });
  expect(
    resultCopy({
      ...summary,
      lifecycle: "FAULTED",
      outcome: { result: "NONE", winner: null, reason: "ENGINE_FAULT" },
    }),
  ).toEqual({
    heading: "Match interrupted",
    body: "No win or loss recorded.",
  });
  expect(
    resultCopy({
      ...summary,
      mode: "TUTORIAL",
      outcome: { result: "NONE", winner: null, reason: "TUTORIAL_COMPLETED" },
    }).heading,
  ).toBe("Tutorial complete");
});
