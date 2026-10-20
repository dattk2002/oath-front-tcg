import { expect, it } from "vitest";
import * as runner from "../run.js";
import * as metrics from "../metrics.js";
import * as seeds from "../seed-list.js";
import type { MatchMetrics } from "../metrics.js";

it("runs the nine real matchups and accounts for every terminal game without leaks or illegal acceptance", () => {
  expect(runner.runMatrix).toBeTypeOf("function");
  const report = runner.runMatrix(
    runner.coreMatrix,
    [seeds.regressionSeeds[0]!],
    runner.currentVersions(),
  );
  expect(report.matchupCount).toBe(9);
  expect(report.matches).toHaveLength(9);
  expect(report.metrics.sampleSize).toBe(9);
  expect(
    Object.values(report.metrics.outcomes).reduce((a, b) => a + b, 0),
  ).toBe(9);
  expect(report.faultCount).toBe(0);
  expect(report.metrics.illegalAccepted).toBe(0);
  expect(report.metrics.privateLeaks).toBe(0);
  expect(report.metrics.illegalProbes).toBeGreaterThanOrEqual(27);
  expect(report.metrics.phaseActions.GOOD_PLAY).toBeGreaterThan(0);
  expect(report.metrics.phaseActions.EVIL_DEPLOY).toBeGreaterThan(0);
  expect(report.metrics.phaseActions.EVIL_TRICKS).toBeGreaterThan(0);
}, 120_000);

it("replays all twenty fixed regression seeds with identical metrics, final hashes and input identity", () => {
  expect(runner.runMatrix).toBeTypeOf("function");
  expect(new Set(seeds.regressionSeeds).size).toBeGreaterThanOrEqual(20);
  const config = [runner.coreMatrix[0]!],
    versions = runner.currentVersions();
  const first = runner.runMatrix(config, seeds.regressionSeeds, versions);
  const second = runner.runMatrix(config, seeds.regressionSeeds, versions);
  expect(first.metrics).toEqual(second.metrics);
  expect(first.matches).toEqual(second.matches);
  expect(first.inputHash).toEqual(second.inputHash);
  expect(first.faultCount).toBe(0);
}, 120_000);

it("rejects mixed versions, changed source/content hashes, duplicate seeds and duplicate matchups before running", () => {
  expect(runner.runMatrix).toBeTypeOf("function");
  const versions = runner.currentVersions(),
    matrix = [runner.coreMatrix[0]!],
    seedList = [seeds.regressionSeeds[0]!];
  for (const changed of [
    { ...versions, bot: "bot_v2" },
    { ...versions, contentHash: "0".repeat(64) },
    { ...versions, botHash: "0".repeat(64) },
  ]) {
    expect(() => runner.runMatrix(matrix, seedList, changed)).toThrow(
      /identity|version/i,
    );
  }
  expect(() =>
    runner.runMatrix(matrix, [...seedList, ...seedList], versions),
  ).toThrow(/seed/i);
  expect(() =>
    runner.runMatrix([...matrix, ...matrix], seedList, versions),
  ).toThrow(/matchup/i);
}, 120_000);

it("exercises all four distinct stress fixtures and records response movement, fatigue and poison packets", () => {
  expect(runner.runMatrix).toBeTypeOf("function");
  const report = runner.runMatrix(
    runner.stressMatrix,
    [seeds.regressionSeeds[0]!],
    runner.currentVersions(),
  );
  expect(report.matches).toHaveLength(4);
  expect(report.faultCount).toBe(0);
  const find = (scenario: string) =>
    report.matches.find((m) => m.scenario === scenario)!;
  expect(find("full-board").initialBoardUnits).toBe(10);
  expect(find("late-draw").fatigueDamage).toBeGreaterThan(0);
  expect(find("block-response-move").responseMoves).toBeGreaterThan(0);
  expect(find("block-response-move").powerUsage.S_E_FS).toBeGreaterThan(0);
  expect(find("mass-poison-armor").poisonPackets).toBeGreaterThan(0);
  expect(find("mass-poison-armor").initialPoisonArmorUnits).toBe(10);
}, 120_000);

it("counts draws separately, reports rates by sample and does not call missing card opportunities weak cards", () => {
  expect(metrics.summarize).toBeTypeOf("function");
  const games: MatchMetrics[] = [
    { winner: "GOOD", reason: "LETHAL", turns: 4 },
    { winner: "EVIL", reason: "LETHAL", turns: 8 },
    { winner: null, reason: "TURN_LIMIT", turns: 20 },
  ].map((outcome) => ({
    ...outcome,
    winner: outcome.winner as "GOOD" | "EVIL" | null,
    matchup: "fixture",
    scenario: "baseline",
    heroes: { GOOD: "H_G_BV", EVIL: "H_E_FX" },
    fault: null,
    cardUsage: { GC01: 1 },
    cardDraws: { GC01: 2 },
    legalCardOpportunities: { GC01: 3 },
    powerUsage: {},
    locations: [],
    phaseActions: { GOOD_PLAY: 1 },
    actionKinds: { PLAY_UNIT: 1 },
    blocks: { GOOD: 1, EVIL: 0 },
    blocksBeforeTurn6: 1,
    unusedPowers: { GOOD: 0, EVIL: 1 },
    fatigueDamage: 0,
    poisonPackets: 0,
    responseMoves: 0,
    illegalAccepted: 0,
    illegalProbes: 3,
    rejectedBotActions: 0,
    privateLeaks: 0,
    projectionChecks: 2,
  }));
  const result = metrics.summarize(games);
  expect(result.outcomes).toEqual({ GOOD: 1, EVIL: 1, DRAW: 1, FAULT: 0 });
  expect(result.faction.GOOD).toMatchObject({
    wins: 1,
    losses: 1,
    draws: 1,
    sampleSize: 3,
    winRate: 1 / 3,
  });
  expect(result.turnLimitRate).toBe(1 / 3);
  expect(result.beforeTurn5Rate).toBe(1 / 3);
  expect(result.meanTurns).toBeCloseTo(32 / 3);
  expect(result.cardUsage.GC01).toBe(3);
  expect(result.cardDraws.GC01).toBe(6);
  expect(result.legalCardOpportunities.GC01).toBe(9);
  expect(result.faction.GOOD.wilson95[0]).toBeLessThan(1 / 3);
  expect(result.faction.GOOD.wilson95[1]).toBeGreaterThan(1 / 3);
});

it("detects injected private fields/events and reports deterministic runner exhaustion as a fault", async () => {
  expect(runner.auditProjection).toBeTypeOf("function");
  const { createMatchWithEvents, createRandomStreams, projectPlayerView } =
    await import("../../../packages/game-engine/src/index.js");
  const { matchConfig, seed } =
    await import("../../../tests/fixtures/match-fixture.js");
  const setup = createMatchWithEvents(matchConfig(), createRandomStreams(seed));
  const state = setup.nextState;
  const clean = projectPlayerView(state, "GOOD");
  expect(runner.auditProjection(state, "GOOD", clean, [])).toBe(0);
  expect(
    runner.auditProjection(
      state,
      "GOOD",
      { ...clean, random: state.random },
      [],
    ),
  ).toBeGreaterThan(0);
  expect(
    runner.auditProjection(state, "GOOD", clean, [
      setup.events.find(
        (e) => e.kind === "CardDrawn" && e.ownerSide === "EVIL",
      )!,
    ]),
  ).toBeGreaterThan(0);
  const fault = runner.simulateMatch(
    { ...runner.coreMatrix[0]!, maxSteps: 1 },
    seeds.regressionSeeds[0]!,
  );
  expect(fault.fault).toBe("STEP_LIMIT");
  expect(fault.winner).toBe(null);
});

it("audits the real 900-game baseline and 400-game stress artifacts without rerunning their workloads", async () => {
  const { readFileSync } = await import("node:fs");
  const { createHash } = await import("node:crypto");
  const { canonicalJson } =
    await import("../../../packages/game-engine/src/index.js");
  const artifacts = [
    [
      "core-v1-2e49b453a7ff87701841bbc212018a9607ed1d9af7ade56ddb078e6709d9515a.json",
      900,
      9,
    ],
    [
      "stress-55e946eaad26f31290756750cc8e4af78865512754c8b8981a445952fba2e72f.json",
      400,
      4,
    ],
  ] as const;
  for (const [file, count, matchups] of artifacts) {
    const report: runner.BalanceReport = JSON.parse(
      readFileSync(
        new URL(
          `../../../docs/implementation/balance/core-v1/${file}`,
          import.meta.url,
        ),
        "utf8",
      ),
    );
    expect(report.matches).toHaveLength(count);
    expect(report.matchupCount).toBe(matchups);
    expect(new Set(report.inputs.seeds).size).toBe(100);
    expect(report.inputs.seeds.slice(0, 20)).toEqual(seeds.regressionSeeds);
    expect(report.faultCount).toBe(0);
    expect(report.metrics).toEqual(metrics.summarize(report.matches));
    expect(report.inputHash).toBe(
      createHash("sha256").update(canonicalJson(report.inputs)).digest("hex"),
    );
    expect(
      new Set(report.matches.map((m) => `${m.matchup}:${m.seed}`)).size,
    ).toBe(count);
    for (const match of report.matches) {
      expect(match.fault).toBe(null);
      expect(match.finalHash).toMatch(/^[a-f0-9]{64}$/);
      expect(
        match.illegalAccepted + match.privateLeaks + match.rejectedBotActions,
      ).toBe(0);
    }
  }
});
