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
  ).toBe("Đã đầu hàng");
  expect(
    resultCopy({
      ...summary,
      outcome: { result: "WIN", winner: "GOOD", reason: "SURRENDER" },
    }).heading,
  ).toBe("Chiến thắng");
});
it("draw, abandonment, fault and tutorial outcomes stay distinct from ranked win/loss copy", () => {
  expect(
    resultCopy({
      ...summary,
      outcome: { result: "DRAW", winner: null, reason: "TURN_LIMIT" },
    }),
  ).toEqual({ heading: "Hòa", body: "Đã kết thúc lượt 20." });
  expect(
    resultCopy({
      ...summary,
      lifecycle: "ABANDONED",
      outcome: { result: "NONE", winner: null, reason: "EXPIRED" },
    }),
  ).toEqual({
    heading: "Trận đã đóng",
    body: "Trận đã hết hạn; không tính thua.",
  });
  expect(
    resultCopy({
      ...summary,
      lifecycle: "FAULTED",
      outcome: { result: "NONE", winner: null, reason: "ENGINE_FAULT" },
    }),
  ).toEqual({
    heading: "Trận bị gián đoạn",
    body: "Không tính thắng hoặc thua.",
  });
  expect(
    resultCopy({
      ...summary,
      mode: "TUTORIAL",
      outcome: { result: "NONE", winner: null, reason: "TUTORIAL_COMPLETED" },
    }).heading,
  ).toBe("Đã hoàn thành hướng dẫn");
});
