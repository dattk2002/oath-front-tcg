import { it, expect } from "vitest";
import { projectPlayerView } from "@oathfront/game-engine";
import { ready, card } from "../../game-engine/tests/helpers.js";
import { chooseBotAction } from "../src/policy.js";
it("different opponent hands/deck order/hidden locations/private counters never change a view-only decision", () => {
  const a = ready();
  a.players.EVIL.hand = [];
  card(a, "EC01", "EVIL");
  const b = structuredClone(a);
  b.players.GOOD.hand.reverse();
  b.players.GOOD.deck.reverse();
  b.turnCounters = { secret: 99 };
  b.random.identityKey = "f".repeat(64);
  b.random.states.location = [9, 8, 7, 6];
  a.board[0]!.location = {
    state: "HIDDEN",
    definitionId: "ancient_forest",
    revealTurn: 1,
  };
  b.board[0]!.location = {
    state: "HIDDEN",
    definitionId: "volcano",
    revealTurn: 1,
  };
  const av = projectPlayerView(a, "EVIL"),
    bv = projectPlayerView(b, "EVIL");
  expect(av).toEqual(bv);
  const context = {
    difficulty: "NORMAL" as const,
    randomState: [1, 2, 3, 4] as const,
    observationMemory: [],
  };
  expect(chooseBotAction(av, av.legalActions, context)).toEqual(
    chooseBotAction(bv, bv.legalActions, context),
  );
});
it("Easy is deterministic, chooses only top-three positive legal actions and advances only supplied bot RNG", () => {
  const s = ready();
  s.players.EVIL.hand = [];
  card(s, "EC01", "EVIL");
  const v = projectPlayerView(s, "EVIL");
  const context = {
    difficulty: "EASY" as const,
    randomState: [1, 2, 3, 4] as const,
    observationMemory: [],
  };
  const before = structuredClone({ v, context });
  const a = chooseBotAction(v, v.legalActions, context);
  expect(chooseBotAction(v, v.legalActions, context)).toEqual(a);
  expect(v.legalActions).toContainEqual(a.action);
  expect(a.action.kind).toBe("PLAY_UNIT");
  if (a.action.kind === "PLAY_UNIT")
    expect(a.action.laneId).toBeLessThanOrEqual(3);
  expect(a.nextBotRandomState).not.toEqual(context.randomState);
  expect({ v, context }).toEqual(before);
});
it("Easy takes the 70-percent best branch or the 30-percent uniform top-three branch with exact bot-only RNG checkpoints", () => {
  const s = ready();
  s.players.EVIL.hand = [];
  card(s, "EC01", "EVIL");
  const v = projectPlayerView(s, "EVIL");
  const best = chooseBotAction(v, v.legalActions, {
    difficulty: "EASY",
    randomState: [1, 0x12345678, 3, 4],
    observationMemory: [],
  });
  expect(best.action).toMatchObject({ kind: "PLAY_UNIT", laneId: 1 });
  expect(best.nextBotRandomState).toEqual([
    305419901, 305419898, 1756164098, 2729697425,
  ]);
  const explore = chooseBotAction(v, v.legalActions, {
    difficulty: "EASY",
    randomState: [1, 0xffffffff, 3, 4],
    observationMemory: [],
  });
  expect(explore.action).toMatchObject({ kind: "PLAY_UNIT", laneId: 2 });
  expect(explore.nextBotRandomState).toEqual([
    4294959096, 4294966789, 4294966264, 16781312,
  ]);
});
it("policy builds for browsers without private engine execution, crypto, hash or replay modules", async () => {
  const { build } = await import("esbuild");
  const result = await build({
    entryPoints: [new URL("../src/index.ts", import.meta.url).pathname],
    bundle: true,
    platform: "browser",
    write: false,
    metafile: true,
  });
  for (const source of Object.keys(result.metafile.inputs))
    expect(source).not.toMatch(
      /game-engine\/src\/(actions|automatic|setup|projection|hash|replay|rng|identity)\.ts$/,
    );
  expect(result.outputFiles[0]!.text.length).toBeGreaterThan(0);
});
