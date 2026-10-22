/** Bounded, reproducible new-catalog smoke benchmark; not a human balance claim. */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { elementsCatalog } from "../../packages/game-content/src/index.js";
import { chooseBotAction } from "../../packages/bot/src/index.js";
import {
  createMatch,
  createRandomStreams,
  advanceAutomatic,
  applyAction,
  projectPlayerView,
  projectEvents,
  canonicalJson,
  hashState,
} from "../../packages/game-engine/src/index.js";
import type { Side, VisibleEvent } from "../../packages/contracts/src/index.js";
import type {
  MatchConfig,
  GameEvent,
} from "../../packages/game-engine/src/index.js";
const good = elementsCatalog.heroes.filter((h) => h.faction === "GOOD"),
  evil = elementsCatalog.heroes.filter((h) => h.faction === "EVIL");
const results = [];
for (let ordinal = 0; ordinal < 100; ordinal++) {
  const g = good[ordinal % 10]!,
    e = evil[(Math.floor(ordinal / 10) + ordinal) % 10]!;
  const seed = createHash("sha256")
    .update(`oathfront-elements-benchmark-v1:${ordinal}`)
    .digest();
  const deckFor = (hero: typeof g) => {
    const p = elementsCatalog.presets.find((p) => p.heroId === hero.id)!;
    return {
      name: p.name,
      heroId: p.heroId,
      entries: p.entries,
      contentVersion: p.contentVersion,
    };
  };
  const decks: MatchConfig["decks"] = { GOOD: deckFor(g), EVIL: deckFor(e) };
  let state = createMatch(
    {
      matchId: `01234567-1234-4123-8123-${String(ordinal).padStart(12, "0")}`,
      humanSide: "GOOD",
      mode: "SKIRMISH",
      difficulty: "NORMAL",
      versions: {
        rules: "rules_v1",
        content: "elements_v1",
        locations: "locations_v1",
        bot: "bot_v1",
      },
      decks,
    },
    createRandomStreams(seed),
  );
  const random = {
      GOOD: state.random.states["bot:easy"],
      EVIL: state.random.states["bot:easy"],
    },
    memory: Record<Side, VisibleEvent[]> = { GOOD: [], EVIL: [] };
  let steps = 0,
    fault: string | null = null;
  const collect = (events: GameEvent[]) => {
    for (const side of ["GOOD", "EVIL"] as const)
      memory[side] = [...memory[side], ...projectEvents(events, side)].slice(
        -80,
      );
  };
  try {
    while (state.lifecycle === "ACTIVE" && steps++ < 3000) {
      if (
        !state.blockResponse &&
        ["TURN_START", "TURN_END", "COMBAT"].includes(state.phase)
      ) {
        const r = advanceAutomatic(state, { maxRoots: 8 });
        state = r.nextState;
        collect(r.events);
        continue;
      }
      const actor: Side =
        state.blockResponse?.side ??
        (state.phase === "MULLIGAN"
          ? state.players.EVIL.mulliganCommitted
            ? "GOOD"
            : "EVIL"
          : (state.activeSide ?? "EVIL"));
      const view = projectPlayerView(state, actor),
        decision = chooseBotAction(view, view.legalActions, {
          difficulty: "NORMAL",
          randomState: random[actor],
          observationMemory: memory[actor],
        });
      if (
        !view.legalActions.some(
          (a) => canonicalJson(a) === canonicalJson(decision.action),
        )
      )
        throw Error("BOT_NONLEGAL");
      const r = applyAction(state, { actor, action: decision.action });
      if (r.kind !== "transition") throw Error(`ACTION_REJECTED:${r.code}`);
      random[actor] = decision.nextBotRandomState;
      state = r.nextState;
      collect(r.events);
    }
    if (state.lifecycle === "ACTIVE") fault = "STEP_LIMIT";
  } catch (error) {
    fault = error instanceof Error ? error.message : String(error);
  }
  results.push({
    ordinal,
    good: g.id,
    evil: e.id,
    seed: seed.toString("hex"),
    turns: state.turn,
    steps,
    outcome: state.outcome,
    fault,
    finalHash: hashState(state),
  });
  if ((ordinal + 1) % 10 === 0)
    process.stdout.write(
      `${ordinal + 1}/100 finished; faults=${results.filter((r) => r.fault).length}\n`,
    );
}
const report = {
  catalog: "elements_v1",
  catalogHash: createHash("sha256")
    .update(canonicalJson(elementsCatalog))
    .digest("hex"),
  count: results.length,
  faults: results.filter((r) => r.fault).length,
  results,
};
const output = process.argv[2];
if (!output) throw Error("Pass an explicit report file");
writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
if (report.faults) process.exitCode = 1;
