import { createHash } from "node:crypto";
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, relative, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { coreCatalog } from "../../packages/game-content/src/index.js";
import { chooseBotAction } from "../../packages/bot/src/index.js";
import { validateWire } from "../../packages/contracts/src/index.js";
import type {
  CardId,
  HeroId,
  PlayerView,
  Side,
  Versions,
  VisibleEvent,
  PowerId,
  PlayerAction,
} from "../../packages/contracts/src/index.js";
import {
  createMatchWithEvents,
  createRandomStreams,
  advanceAutomatic,
  applyAction,
  projectPlayerView,
  projectEvents,
  canonicalJson,
  hashState,
  algorithmVersion,
} from "../../packages/game-engine/src/index.js";
import type {
  GameEvent,
  MatchState,
  MatchConfig,
  LaneId,
  UnitState,
} from "../../packages/game-engine/src/index.js";
import { increment, summarize } from "./metrics.js";
import type { MatchMetrics } from "./metrics.js";
import { seedList, regressionSeeds } from "./seed-list.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const sides = ["EVIL", "GOOD"] as const;
const gameVersions: Versions = {
  rules: "rules_v1",
  content: "core_v1",
  locations: "locations_v1",
  bot: "bot_v1",
};
const digest = (value: unknown) =>
  createHash("sha256").update(canonicalJson(value)).digest("hex");
function sourceHash(directory: string): string {
  const paths: string[] = [];
  const visit = (path: string) => {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name, "en"),
    )) {
      const full = join(path, entry.name);
      if (entry.isDirectory() && entry.name !== "tests") visit(full);
      else if (entry.isFile() && /\.(ts|js|json)$/.test(entry.name))
        paths.push(full);
    }
  };
  visit(join(root, directory));
  return digest(
    paths.map((path) => [relative(root, path), readFileSync(path, "utf8")]),
  );
}
export function currentVersions() {
  return {
    ...gameVersions,
    rng: algorithmVersion,
    node: process.version,
    contentHash: digest(coreCatalog),
    engineHash: sourceHash("packages/game-engine/src"),
    botHash: sourceHash("packages/bot/src"),
    contractsHash: digest([
      sourceHash("packages/contracts/src"),
      sourceHash("packages/contracts/schema"),
    ]),
    runnerHash: sourceHash("tools/simulation"),
    lockfileHash: createHash("sha256")
      .update(readFileSync(join(root, "pnpm-lock.yaml")))
      .digest("hex"),
  };
}
export type RunVersions = ReturnType<typeof currentVersions>;
export type Scenario =
  | "baseline"
  | "full-board"
  | "late-draw"
  | "block-response-move"
  | "mass-poison-armor";
export interface SimulationConfig {
  goodHero: HeroId;
  evilHero: HeroId;
  scenario: Scenario;
  maxSteps?: number;
  versions?: Versions;
}
export interface SimulationResult extends MatchMetrics {
  seed: string;
  finalHash: string;
  initialHash: string;
  initialBoardUnits: number;
  initialPoisonArmorUnits: number;
}
const goodHeroes = coreCatalog.heroes.filter((h) => h.faction === "GOOD");
const evilHeroes = coreCatalog.heroes.filter((h) => h.faction === "EVIL");
export const coreMatrix: SimulationConfig[] = goodHeroes.flatMap((g) =>
  evilHeroes.map((e) => ({
    goodHero: g.id,
    evilHero: e.id,
    scenario: "baseline",
  })),
);
export const stressMatrix: SimulationConfig[] = (
  [
    "full-board",
    "late-draw",
    "block-response-move",
    "mass-poison-armor",
  ] as const
).map((scenario) => ({ goodHero: "H_G_VP", evilHero: "H_E_FS", scenario }));
function matchConfig(config: SimulationConfig, seed: string): MatchConfig {
  const deck = (id: HeroId, side: Side) => {
    const preset = coreCatalog.presets.find((p) => p.heroId === id);
    if (
      !preset ||
      !coreCatalog.heroes.some((h) => h.id === id && h.faction === side)
    )
      throw new RangeError("Invalid matchup hero");
    return {
      name: preset.name,
      heroId: id,
      contentVersion: preset.contentVersion,
      entries: structuredClone(preset.entries),
    };
  };
  const hex = digest({ config, seed });
  return {
    matchId: `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`,
    mode: "SKIRMISH",
    humanSide: "GOOD",
    difficulty: "NORMAL",
    versions: { ...gameVersions },
    decks: {
      GOOD: deck(config.goodHero, "GOOD"),
      EVIL: deck(config.evilHero, "EVIL"),
    },
  };
}
/** Local fixture construction only; no runtime content/rule mutation. */
function fixtureUnit(
  state: MatchState,
  id: CardId,
  side: Side,
  laneId: LaneId,
): UnitState {
  const def = coreCatalog.cards.find((c) => c.id === id);
  if (!def?.printed) throw new Error("Fixture requires unit");
  const stats = { ...def.printed, maxHp: def.printed.hp };
  const player = state.players[side];
  const card = [...player.hand, ...player.deck].find(
    (c) => c.definitionId === id,
  );
  if (!card) throw new Error("Missing stress fixture card");
  player.hand = player.hand.filter((c) => c.instanceId !== card.instanceId);
  player.deck = player.deck.filter((c) => c.instanceId !== card.instanceId);
  const u: UnitState = {
    instanceId: card.instanceId,
    definitionId: id,
    owner: side,
    laneId,
    isToken: false,
    creationSeq: ++state.creationSeq,
    printed: { ...stats },
    current: { ...stats },
    statuses: {
      shield: def.keywords.includes("SHIELD"),
      armor: def.keywords.includes("ARMOR") ? 1 : 0,
      poisoned: false,
      stunned: false,
      exhausted: false,
      pierce: def.keywords.includes("PIERCE"),
    },
    modifiers: [],
    lastRegularAttackTurn: null,
  };
  state.board[laneId - 1]![side === "GOOD" ? "good" : "evil"] = u;
  return u;
}
function fixturePower(
  state: MatchState,
  side: Side,
  definitionId: PowerId,
): string {
  const existing = state.players[side].reserve.find(
    (p) => p.definitionId === definitionId,
  );
  if (existing) return existing.instanceId;
  const instanceId = (++state.instanceSeq).toString(16).padStart(32, "0");
  state.players[side].reserve.push({ instanceId, definitionId, normalCost: 1 });
  if (!state.players[side].receivedPowerIds.includes(definitionId))
    state.players[side].receivedPowerIds.push(definitionId);
  state.players[side].block.used =
    state.players[side].receivedPowerIds.length - 1;
  return instanceId;
}
function injectStress(state: MatchState, scenario: Scenario): void {
  state.turn = scenario === "late-draw" ? 15 : 5;
  for (const lane of state.board) lane.location = { state: "NORMAL" };
  for (const side of sides)
    state.players[side].energy = {
      current: Math.min(10, state.turn),
      max: Math.min(10, state.turn),
    };
  if (scenario === "late-draw") {
    for (const side of sides) {
      state.players[side].deck = [];
      state.players[side].fatigueCounter = 0;
    }
    return;
  }
  if (scenario === "block-response-move") {
    state.phase = "COMBAT";
    state.activeSide = null;
    fixtureUnit(state, "GC02", "GOOD", 5);
    fixtureUnit(state, "EC01", "EVIL", 4);
    const good = fixturePower(state, "GOOD", "P_P1"),
      evil = fixturePower(state, "EVIL", "S_E_FS");
    state.continuation = {
      laneId: 1,
      stage: "BLOCK_RESPONSES",
      pendingResponders: [
        { side: "GOOD", powerInstanceId: good },
        { side: "EVIL", powerInstanceId: evil },
      ],
    };
    state.blockResponse = { side: "GOOD", laneId: 1, powerInstanceId: good };
    return;
  }
  for (const lane of state.board)
    for (const side of sides) {
      const ids: CardId[] =
        side === "GOOD"
          ? ["GC01", "GC02", "GC03", "V01", "V02"]
          : ["EC01", "EC02", "EC03", "F01", "F02"];
      const u = fixtureUnit(state, ids[lane.laneId - 1]!, side, lane.laneId);
      if (scenario === "mass-poison-armor") {
        u.statuses.poisoned = true;
        u.statuses.armor = 1;
      }
    }
}
/** Counts contract violations in the exact bot input/projection, not raw trusted logs. */
export function auditProjection(
  state: MatchState,
  side: Side,
  view: unknown,
  events: readonly unknown[],
): number {
  let violations = validateWire("PlayerView", view) ? 0 : 1;
  if (view && typeof view === "object") {
    const v = view as PlayerView;
    if (v.self?.side !== side) violations++;
    for (const lane of v.board ?? [])
      if (lane.location.state === "HIDDEN" && "definitionId" in lane.location)
        violations++;
    if (canonicalJson(v.versions) !== canonicalJson(state.versions))
      violations++;
  }
  for (const event of events) {
    if (!validateWire("VisibleEvent", event)) {
      violations++;
      continue;
    }
    const e = event as VisibleEvent;
    if (e.visibility === "OWNER" && e.ownerSide !== side) violations++;
  }
  return violations;
}
function validateConfig(config: SimulationConfig, seed: string) {
  if (!/^[a-f0-9]{64}$/.test(seed)) throw new RangeError("Invalid seed");
  if (
    ![
      "baseline",
      "full-board",
      "late-draw",
      "block-response-move",
      "mass-poison-armor",
    ].includes(config.scenario)
  )
    throw new RangeError("Invalid scenario");
  if (
    config.versions &&
    canonicalJson(config.versions) !== canonicalJson(gameVersions)
  )
    throw new RangeError("Mixed match versions");
  if (
    config.maxSteps !== undefined &&
    (!Number.isSafeInteger(config.maxSteps) ||
      config.maxSteps < 1 ||
      config.maxSteps > 10_000)
  )
    throw new RangeError("Invalid step budget");
}
export function simulateMatch(
  config: SimulationConfig,
  seed: string,
): SimulationResult {
  validateConfig(config, seed);
  const setup = createMatchWithEvents(
    matchConfig(config, seed),
    createRandomStreams(Buffer.from(seed, "hex")),
  );
  let state = setup.nextState;
  const r: SimulationResult = {
    matchup: `${config.goodHero}/${config.evilHero}/${config.scenario}`,
    scenario: config.scenario,
    heroes: { GOOD: config.goodHero, EVIL: config.evilHero },
    seed,
    initialHash: hashState(state),
    finalHash: "",
    winner: null,
    reason: null,
    turns: 0,
    fault: null,
    cardUsage: {},
    cardDraws: {},
    legalCardOpportunities: {},
    powerUsage: {},
    locations: [],
    phaseActions: {},
    actionKinds: {},
    blocks: { GOOD: 0, EVIL: 0 },
    blocksBeforeTurn6: 0,
    unusedPowers: { GOOD: 0, EVIL: 0 },
    fatigueDamage: 0,
    poisonPackets: 0,
    responseMoves: 0,
    illegalAccepted: 0,
    illegalProbes: 0,
    rejectedBotActions: 0,
    privateLeaks: 0,
    projectionChecks: 0,
    initialBoardUnits: 0,
    initialPoisonArmorUnits: 0,
  };
  const memory: Record<Side, VisibleEvent[]> = { GOOD: [], EVIL: [] };
  const botRandom = {
    GOOD: state.random.states["bot:easy"],
    EVIL: state.random.states["bot:easy"],
  };
  let fixtureApplied = config.scenario === "baseline",
    lastTurn = 0;
  const intents: Record<Side, number> = { GOOD: 0, EVIL: 0 };
  const collect = (events: GameEvent[], before: MatchState) => {
    for (const side of sides) {
      const projected = projectEvents(events, side);
      // Exact schema + audience check is performed before any event enters observation memory.
      r.privateLeaks += projected.filter(
        (e) =>
          !validateWire("VisibleEvent", e) ||
          (e.visibility === "OWNER" && e.ownerSide !== side),
      ).length;
      memory[side].push(...projected);
    }
    let eventTurn = before.turn;
    const occupied = new Map(
      before.board.flatMap((lane) =>
        [lane.good, lane.evil]
          .filter((u): u is UnitState => !!u)
          .map((u) => [u.instanceId, u.laneId]),
      ),
    );
    for (const e of events)
      switch (e.kind) {
        case "TurnStarted":
          eventTurn = e.payload.turn;
          break;
        case "UnitCreated":
          occupied.set(
            e.payload.unit.instanceId,
            e.payload.unit.laneId as LaneId,
          );
          break;
        case "UnitDestroyed":
          occupied.delete(e.payload.instanceId);
          break;
        case "CardPlayed":
          increment(r.cardUsage, e.payload.definitionId);
          break;
        case "CardDrawn":
          increment(r.cardDraws, e.payload.card.definitionId);
          break;
        case "PowerUsed":
          increment(r.powerUsage, e.payload.definitionId);
          break;
        case "BlockOccurred":
          r.blocks[e.payload.side]++;
          if (eventTurn < 6 && e.payload.blocksUsed === 3)
            r.blocksBeforeTurn6++;
          break;
        case "UnitMoved":
          occupied.set(e.payload.instanceId, e.payload.toLane as LaneId);
          if (before.blockResponse) r.responseMoves++;
          break;
        case "LocationRevealed": {
          r.locations.push({
            id: e.payload.definitionId,
            lane: e.payload.laneId,
            turn: eventTurn,
            preRevealUnits: [...occupied.values()].filter(
              (lane) => lane === e.payload.laneId,
            ).length,
          });
          break;
        }
        case "DamageBatchResolved":
          for (const packet of e.payload.packets) {
            if (packet.damageType === "FATIGUE")
              r.fatigueDamage += packet.finalDamage;
            if (packet.damageType === "POISON") r.poisonPackets++;
          }
          break;
      }
  };
  collect(setup.events, state);
  // Deliberate rejected probes at setup: phase, unavailable card, and unavailable power/target.
  const probes: PlayerAction[] = [
    { kind: "PASS_PHASE" },
    { kind: "PLAY_UNIT", cardInstanceId: "f".repeat(32), laneId: 1 },
    {
      kind: "USE_POWER",
      powerInstanceId: "f".repeat(32),
      target: { kind: "HERO", side: "EVIL" },
    },
  ];
  for (const action of probes) {
    r.illegalProbes++;
    if (applyAction(state, { actor: "GOOD", action }).kind !== "error")
      r.illegalAccepted++;
  }
  try {
    for (let step = 0; state.lifecycle === "ACTIVE"; step++) {
      if (step >= (config.maxSteps ?? 3000)) {
        r.fault = "STEP_LIMIT";
        break;
      }
      if (
        !fixtureApplied &&
        state.turn === 1 &&
        state.phase === "EVIL_DEPLOY"
      ) {
        injectStress(state, config.scenario);
        fixtureApplied = true;
        r.initialHash = hashState(state);
        r.initialBoardUnits = state.board.reduce(
          (n, l) => n + Number(!!l.good) + Number(!!l.evil),
          0,
        );
        r.initialPoisonArmorUnits = state.board
          .flatMap((l) => [l.good, l.evil])
          .filter((u) => u?.statuses.poisoned && u.statuses.armor > 0).length;
      }
      if (lastTurn !== state.turn) {
        intents.GOOD = 0;
        intents.EVIL = 0;
        lastTurn = state.turn;
      }
      const before = state;
      if (
        !state.blockResponse &&
        ["TURN_START", "TURN_END", "COMBAT"].includes(state.phase)
      ) {
        const advanced = advanceAutomatic(state, { maxRoots: 8 });
        state = advanced.nextState;
        collect(advanced.events, before);
        continue;
      }
      const actor: Side =
        state.blockResponse?.side ??
        (state.phase === "MULLIGAN"
          ? state.players.EVIL.mulliganCommitted
            ? "GOOD"
            : "EVIL"
          : (state.activeSide ?? "EVIL"));
      if (++intents[actor] > 64) {
        r.fault = `BOT_GUARD_${actor}`;
        break;
      }
      const view = projectPlayerView(state, actor);
      r.projectionChecks++;
      r.privateLeaks += auditProjection(state, actor, view, []);
      const legal = view.legalActions;
      for (const id of new Set(
        legal.flatMap((a) =>
          "cardInstanceId" in a
            ? [
                view.self.hand.find((c) => c.instanceId === a.cardInstanceId)
                  ?.definitionId,
              ].filter((id): id is CardId => !!id)
            : [],
        ),
      ))
        increment(r.legalCardOpportunities, id);
      const decision = chooseBotAction(view, legal, {
        difficulty: "NORMAL",
        randomState: botRandom[actor],
        observationMemory: memory[actor],
      });
      if (
        !legal.some((a) => canonicalJson(a) === canonicalJson(decision.action))
      ) {
        r.rejectedBotActions++;
        r.fault = "BOT_SELECTED_NONLEGAL";
        break;
      }
      const applied = applyAction(state, { actor, action: decision.action });
      if (applied.kind === "error") {
        r.rejectedBotActions++;
        r.fault = `LEGAL_ACTION_REJECTED_${applied.code}`;
        break;
      }
      botRandom[actor] = decision.nextBotRandomState;
      increment(r.phaseActions, state.phase);
      increment(r.actionKinds, decision.action.kind);
      state = applied.nextState;
      collect(applied.events, before);
    }
  } catch (error) {
    r.fault =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : "UNKNOWN_EXCEPTION";
  }
  if (state.lifecycle === "FAULTED") r.fault ??= "ENGINE_FAULTED";
  if (!state.outcome && !r.fault) r.fault = "MISSING_OUTCOME";
  r.winner = state.outcome?.winner ?? null;
  r.reason = state.outcome?.reason ?? null;
  r.turns = state.turn;
  r.finalHash = hashState(state);
  r.unusedPowers = {
    GOOD: state.players.GOOD.reserve.length,
    EVIL: state.players.EVIL.reserve.length,
  };
  return r;
}
export function runMatrix(
  matrix: readonly SimulationConfig[],
  seeds: readonly string[],
  versions: RunVersions,
) {
  if (canonicalJson(versions) !== canonicalJson(currentVersions()))
    throw new RangeError("Unsupported source/version identity");
  if (!matrix.length || !seeds.length || new Set(seeds).size !== seeds.length)
    throw new RangeError("Empty or duplicate seed list");
  if (
    new Set(matrix.map((c) => `${c.goodHero}/${c.evilHero}/${c.scenario}`))
      .size !== matrix.length
  )
    throw new RangeError("Duplicate matchup");
  if (
    new Set(
      matrix.map((c) => (c.scenario === "baseline" ? "baseline" : "stress")),
    ).size > 1
  )
    throw new RangeError("Cannot mix baseline and stress matchups");
  for (const config of matrix)
    for (const seed of seeds) validateConfig(config, seed);
  const decks = matrix.map((c) => matchConfig(c, seeds[0]!).decks);
  const inputs = structuredClone({
    matrix,
    seeds,
    versions,
    decks,
    seedNamespace: "oathfront-balance-core-v1-seed-NNNN",
    agents: { GOOD: "NORMAL_BOT", EVIL: "NORMAL_BOT" },
  });
  const matches = matrix.flatMap((c) =>
    seeds.map((seed) => simulateMatch(c, seed)),
  );
  return {
    schemaVersion: "balance_v1",
    inputHash: digest(inputs),
    inputs,
    matchupCount: matrix.length,
    matches,
    faultCount: matches.filter((m) => m.fault).length,
    metrics: summarize(matches),
  };
}
export type BalanceReport = ReturnType<typeof runMatrix>;
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { values } = parseArgs({
    options: {
      matrix: { type: "string", default: "core-v1" },
      "seeds-per-matchup": { type: "string", default: "100" },
      out: { type: "string" },
    },
  });
  if (values.matrix !== "core-v1" && values.matrix !== "stress")
    throw new RangeError("Matrix must be core-v1 or stress");
  const matrix = values.matrix === "core-v1" ? coreMatrix : stressMatrix;
  const report = runMatrix(
    matrix,
    seedList(Number(values["seeds-per-matchup"])),
    currentVersions(),
  );
  const directory = resolve(
    values.out ?? join(root, "docs/implementation/balance/core-v1"),
  );
  mkdirSync(directory, { recursive: true });
  const output = join(directory, `${values.matrix}-${report.inputHash}.json`);
  // Immutable outputs: same input may replay, never silently overwrite differing evidence.
  try {
    writeFileSync(output, JSON.stringify(report, null, 2) + "\n", {
      flag: "wx",
    });
  } catch (error) {
    if (
      !(error instanceof Error && "code" in error && error.code === "EEXIST") ||
      readFileSync(output, "utf8") !== JSON.stringify(report, null, 2) + "\n"
    )
      throw error;
  }
  console.log(
    JSON.stringify(
      {
        output,
        inputHash: report.inputHash,
        versions: report.inputs.versions,
        matches: report.matches.length,
        matchupCount: report.matchupCount,
        faultCount: report.faultCount,
        metrics: report.metrics,
        regressionSeedsCovered: regressionSeeds.filter((seed) =>
          report.inputs.seeds.includes(seed),
        ).length,
      },
      null,
      2,
    ),
  );
  if (
    report.faultCount ||
    report.metrics.illegalAccepted ||
    report.metrics.rejectedBotActions ||
    report.metrics.privateLeaks
  )
    process.exitCode = 1;
}
