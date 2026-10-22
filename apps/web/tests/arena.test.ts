import { expect, it } from "vitest";
import { arenaForView, arenas } from "../src/features/match/rendering/arena";
import { readFileSync } from "node:fs";
import { response } from "./fixtures";
it("selects a deterministic environment from public revealed locations without reading hidden assignments", () => {
  const view = response().view;
  for (const lane of view.board)
    lane.location = { state: "HIDDEN", revealTurn: 3 };
  expect(arenaForView(view)).toEqual(arenaForView(structuredClone(view)));
  expect(arenas).toContainEqual(arenaForView(view));
  for (const [id, key] of [
    ["ancient_forest", "moonroot-conservatory"],
    ["volcano", "cinder-foundry"],
    ["frozen_lake", "glasswater-sanctum"],
    ["storm_peak", "astral-causeway"],
  ] as const) {
    const revealed = structuredClone(view);
    revealed.board[0]!.location = {
      state: "REVEALED",
      definitionId: id!,
      revealTurn: 3,
    };
    expect(arenaForView(revealed).key).toBe(key);
  }
  for (const arena of arenas)
    expect(
      readFileSync(`apps/web/public${arena.medium}`).byteLength,
    ).toBeLessThan(1500000);
});
it("honors the public daily scenario arena over ordinary location decoration", () => {
  const view = response().view;
  view.challenge = {
    scenarioId: "season01-week01-day1",
    eventId: "season01-week01",
    dayIndex: 0,
    manifestSha256: "a".repeat(64),
    arenaKey: "glasswater-sanctum",
  };
  view.board[0]!.location = {
    state: "REVEALED",
    definitionId: "volcano",
    revealTurn: 1,
  };
  expect(arenaForView(view).key).toBe("glasswater-sanctum");
});
