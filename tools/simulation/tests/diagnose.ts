/** Offline causal probes. Replays a bounded subset; never merges these metrics into baseline. */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  advanceProbeToBoundary,
  hashDiagnosticFiles,
} from "./diagnostic-guards.js";
import {
  matchConfig as fixtureMatchConfig,
  seed as fixtureSeed,
} from "../../../tests/fixtures/match-fixture.js";
import { coreCatalog } from "../../../packages/game-content/src/index.js";
import { chooseBotAction } from "../../../packages/bot/src/index.js";
import { evaluateAction } from "../../../packages/bot/src/evaluate.js";
import {
  createMatchWithEvents,
  createRandomStreams,
  projectPlayerView,
  projectEvents,
  advanceAutomatic,
  applyAction,
  canonicalJson,
  hashState,
} from "../../../packages/game-engine/src/index.js";
import type {
  MatchConfig,
  MatchState,
} from "../../../packages/game-engine/src/index.js";
import type {
  PlayerAction,
  Side,
  VisibleEvent,
} from "../../../packages/contracts/src/index.js";
import { currentVersions, type BalanceReport } from "../run.js";
import {
  ready,
  card,
  unit,
} from "../../../packages/game-engine/tests/helpers.js";
const baseline: BalanceReport = JSON.parse(
  readFileSync(process.argv[2]!, "utf8"),
);
if (
  canonicalJson(currentVersions()) !== canonicalJson(baseline.inputs.versions)
)
  throw new Error("Diagnostic source version differs from baseline");
const matrixIndices = [0, 5, 7],
  seedIndices = [0, 1, 2];
const traces = [];
for (const matrixIndex of matrixIndices)
  for (const seedIndex of seedIndices) {
    const config = baseline.inputs.matrix[matrixIndex]!,
      seed = baseline.inputs.seeds[seedIndex]!;
    const original = baseline.matches.find(
      (m) =>
        m.matchup === `${config.goodHero}/${config.evilHero}/baseline` &&
        m.seed === seed,
    )!;
    const hex = createHash("sha256")
      .update(canonicalJson({ config, seed }))
      .digest("hex");
    const gameConfig: MatchConfig = {
      matchId: `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`,
      mode: "SKIRMISH",
      humanSide: "GOOD",
      difficulty: "NORMAL",
      versions: {
        rules: baseline.inputs.versions.rules,
        content: baseline.inputs.versions.content,
        locations: baseline.inputs.versions.locations,
        bot: baseline.inputs.versions.bot,
      },
      decks: structuredClone(baseline.inputs.decks[matrixIndex]!),
    };
    const setup = createMatchWithEvents(
      gameConfig,
      createRandomStreams(Buffer.from(seed, "hex")),
    );
    let state = setup.nextState;
    if (hashState(state) !== original.initialHash)
      throw new Error("Diagnostic initial identity differs from baseline");
    const memory: Record<Side, VisibleEvent[]> = {
      GOOD: projectEvents(setup.events, "GOOD"),
      EVIL: projectEvents(setup.events, "EVIL"),
    };
    const random = {
      GOOD: state.random.states["bot:easy"],
      EVIL: state.random.states["bot:easy"],
    };
    const phases: {
      turn: number;
      phase: string;
      side: Side;
      entryEnergy: number;
      spent: number;
      exitEnergy: number | null;
      decisions: number;
      legalCardIds: string[];
      positiveTricksBlockedByDeploy: string[];
      positivePowersBlockedByDeploy: string[];
    }[] = [];
    let current: (typeof phases)[number] | null = null;
    for (let step = 0; state.lifecycle === "ACTIVE"; step++) {
      if (step > 3000) throw new Error("Diagnostic step bound");
      if (
        !state.blockResponse &&
        ["COMBAT", "TURN_START", "TURN_END"].includes(state.phase)
      ) {
        const t = advanceAutomatic(state, { maxRoots: 8 });
        state = t.nextState;
        for (const side of ["GOOD", "EVIL"] as const)
          memory[side].push(...projectEvents(t.events, side));
        continue;
      }
      const actor =
        state.blockResponse?.side ??
        (state.phase === "MULLIGAN"
          ? state.players.EVIL.mulliganCommitted
            ? "GOOD"
            : "EVIL"
          : state.activeSide!);
      const view = projectPlayerView(state, actor);
      if (
        !current ||
        current.turn !== state.turn ||
        current.phase !== state.phase ||
        current.side !== actor
      ) {
        current = {
          turn: state.turn,
          phase: state.phase,
          side: actor,
          entryEnergy: state.players[actor].energy.current,
          spent: 0,
          exitEnergy: null,
          decisions: 0,
          legalCardIds: [],
          positiveTricksBlockedByDeploy: [],
          positivePowersBlockedByDeploy: [],
        };
        phases.push(current);
        if (state.phase === "EVIL_TRICKS") {
          // Counterfactual own budget only, using the currently visible board and own cards.
          const ownBudget = structuredClone(state);
          ownBudget.players.EVIL.energy.current =
            ownBudget.players.EVIL.energy.max;
          const fv = projectPlayerView(ownBudget, "EVIL");
          const actual = new Set(view.legalActions.map(canonicalJson));
          for (const a of fv.legalActions)
            if (
              !actual.has(canonicalJson(a)) &&
              ["PLAY_TRICK", "USE_POWER"].includes(a.kind) &&
              evaluateAction(fv, a).score > 0
            ) {
              const id =
                "cardInstanceId" in a
                  ? fv.self.hand.find((c) => c.instanceId === a.cardInstanceId)!
                      .definitionId
                  : "powerInstanceId" in a
                    ? fv.self.reserve.find(
                        (c) => c.instanceId === a.powerInstanceId,
                      )!.definitionId
                    : "";
              const list =
                a.kind === "PLAY_TRICK"
                  ? current.positiveTricksBlockedByDeploy
                  : current.positivePowersBlockedByDeploy;
              if (!list.includes(id)) list.push(id);
            }
        }
      }
      current.decisions++;
      for (const a of view.legalActions)
        if ("cardInstanceId" in a) {
          const id = view.self.hand.find(
            (c) => c.instanceId === a.cardInstanceId,
          )!.definitionId;
          if (!current.legalCardIds.includes(id)) current.legalCardIds.push(id);
        }
      const decision = chooseBotAction(view, view.legalActions, {
        difficulty: "NORMAL",
        randomState: random[actor],
        observationMemory: memory[actor],
      });
      const t = applyAction(state, { actor, action: decision.action });
      if (t.kind === "error") throw new Error(t.code);
      current.spent += t.events.reduce(
        (total, e) =>
          total +
          (e.kind === "CardPlayed" || e.kind === "PowerUsed"
            ? e.payload.energySpent
            : 0),
        0,
      );
      if (decision.action.kind === "PASS_PHASE")
        current.exitEnergy = t.nextState.players[actor].energy.current;
      state = t.nextState;
      random[actor] = decision.nextBotRandomState;
      for (const side of ["GOOD", "EVIL"] as const)
        memory[side].push(...projectEvents(t.events, side));
    }
    if (hashState(state) !== original.finalHash)
      throw new Error("Diagnostic choices differ from baseline");
    traces.push({
      matchup: original.matchup,
      seed,
      finalHash: original.finalHash,
      phases,
    });
  }

function utilityProbe(id: "B06" | "X06" | "P06" | "S06" | "S07") {
  const s = ready(),
    side: Side = id.startsWith("B") || id.startsWith("P") ? "GOOD" : "EVIL";
  s.phase = side === "GOOD" ? "GOOD_PLAY" : "EVIL_TRICKS";
  s.activeSide = side;
  for (const p of Object.values(s.players)) p.hand = [];
  const own = unit(s, side === "GOOD" ? "GC01" : "EC01", side, 1),
    enemy = unit(
      s,
      side === "GOOD" ? "EC01" : "GC01",
      side === "GOOD" ? "EVIL" : "GOOD",
      id === "B06" ? 1 : 2,
    );
  if (id === "X06") enemy.current.hp = 1;
  if (["P06", "S06", "S07"].includes(id))
    s.players[side].hp = enemy.current.attack;
  const instanceId = card(s, id, side);
  const action: PlayerAction =
    id === "B06"
      ? {
          kind: "PLAY_TRICK",
          cardInstanceId: instanceId,
          target: { kind: "UNIT", instanceId: own.instanceId },
        }
      : id === "X06"
        ? {
            kind: "PLAY_TRICK",
            cardInstanceId: instanceId,
            target: { kind: "UNIT", instanceId: enemy.instanceId },
          }
        : {
            kind: "PLAY_TRICK",
            cardInstanceId: instanceId,
            target: {
              kind: "UNIT_AND_LANE",
              instanceId: id === "S07" ? enemy.instanceId : own.instanceId,
              laneId: id === "S07" ? 1 : 2,
            },
          };
  const v = projectPlayerView(s, side),
    evaluation = evaluateAction(v, action);
  if (!evaluation.preview.legal) throw new Error("Illegal utility diagnostic");
  const runCombat = (initial: MatchState) => {
    let st = structuredClone(initial);
    st.phase = "COMBAT";
    st.activeSide = null;
    st.continuation = {
      laneId: 1,
      stage: "BEFORE_PAIR",
      pendingResponders: [],
    };
    for (const p of Object.values(st.players))
      p.block = { charge: 0, used: 3, active: false };
    st = advanceProbeToBoundary(st);
    return {
      lifecycle: st.lifecycle,
      outcome: st.outcome,
      hp: { GOOD: st.players.GOOD.hp, EVIL: st.players.EVIL.hp },
      units: st.board
        .flatMap((l) => [l.good, l.evil])
        .filter((u) => !!u)
        .map((u) => ({
          owner: u!.owner,
          hp: u!.current.hp,
          lane: u!.laneId,
          poisoned: u!.statuses.poisoned,
        })),
    };
  };
  const applied = applyAction(s, { actor: side, action });
  if (applied.kind === "error") throw new Error(applied.code);
  return {
    id,
    side,
    score: evaluation.score,
    heuristic: evaluation.heuristic,
    preview: {
      deltaBoardValue: evaluation.preview.deltaBoardValue,
      netCardsGained: evaluation.preview.netCardsGained,
      energySpent: evaluation.preview.energySpent,
      ownHeroDamage: evaluation.preview.ownHeroDamage,
      enemyHeroDamage: evaluation.preview.enemyHeroDamage,
    },
    knownCombatWithout: runCombat(s),
    knownCombatWith: runCombat(applied.nextState),
  };
}
const phaseSummary: Record<
  string,
  {
    phases: number;
    entryEnergy: number;
    spent: number;
    exitEnergy: number;
    zeroEnergyEntries: number;
    withBlockedPositiveTrick: number;
    withBlockedPositivePower: number;
  }
> = {};
for (const g of traces)
  for (const p of g.phases) {
    const row = (phaseSummary[p.phase] ??= {
      phases: 0,
      entryEnergy: 0,
      spent: 0,
      exitEnergy: 0,
      zeroEnergyEntries: 0,
      withBlockedPositiveTrick: 0,
      withBlockedPositivePower: 0,
    });
    row.phases++;
    row.entryEnergy += p.entryEnergy;
    row.spent += p.spent;
    row.exitEnergy += p.exitEnergy ?? 0;
    row.zeroEnergyEntries += Number(p.entryEnergy === 0);
    row.withBlockedPositiveTrick += Number(
      p.positiveTricksBlockedByDeploy.length > 0,
    );
    row.withBlockedPositivePower += Number(
      p.positivePowersBlockedByDeploy.length > 0,
    );
  }
const dependencies = hashDiagnosticFiles(
  fileURLToPath(new URL("../../../", import.meta.url)),
  [
    "tools/simulation/tests/diagnose.ts",
    "tools/simulation/tests/diagnostic-guards.ts",
    "packages/game-engine/tests/helpers.ts",
    "tests/fixtures/match-fixture.ts",
  ],
);
const diagnosticDependencies = {
  schemaVersion: "diagnostic_dependencies_v1",
  ...dependencies,
  fixtureInputsHash: createHash("sha256")
    .update(
      canonicalJson({
        config: fixtureMatchConfig(),
        seedHex: Buffer.from(fixtureSeed).toString("hex"),
      }),
    )
    .digest("hex"),
};
const report = {
  kind: "diagnostic_subset_not_baseline",
  diagnosticVersion: "diagnostic_v2",
  diagnosticDependencies,
  dependencyIdentityHash: createHash("sha256")
    .update(canonicalJson(diagnosticDependencies))
    .digest("hex"),
  baselineInputHash: baseline.inputHash,
  versions: baseline.inputs.versions,
  matrixIndices,
  seedIndices,
  sourceHash: createHash("sha256")
    .update(readFileSync(new URL(import.meta.url)))
    .digest("hex"),
  matchingFinalHashes: traces.length,
  phaseSummary,
  traces,
  utilityProbes: (["B06", "X06", "P06", "S06", "S07"] as const).map(
    utilityProbe,
  ),
  catalogVersion: coreCatalog.version,
};
writeFileSync(process.argv[3]!, JSON.stringify(report, null, 2) + "\n", {
  flag: "wx",
});
console.log(
  JSON.stringify(
    {
      matchingFinalHashes: report.matchingFinalHashes,
      phaseSummary,
      utilityProbes: report.utilityProbes,
    },
    null,
    2,
  ),
);
