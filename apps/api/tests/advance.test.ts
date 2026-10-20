import { it, expect } from "vitest";
import {
  commandTransition,
  engineScheduler,
  needsAdvance,
} from "../src/matches/commands.js";
import { combatState } from "../../../packages/game-engine/tests/fixtures/combat-pierce-volcano.js";
import { ready } from "../../../packages/game-engine/tests/helpers.js";
it("bounds complete automatic journal operations to eight or 250ms and carries durable guard unchanged", () => {
  const state = combatState();
  const batch = commandTransition(
    state,
    { kind: "ADVANCE" },
    12,
    9,
    engineScheduler,
    () => 0,
  );
  expect(batch.journal).toHaveLength(8);
  expect(batch.journal.map((j) => j.stepSeq)).toEqual([
    13, 14, 15, 16, 17, 18, 19, 20,
  ]);
  expect(batch.botIntentsThisTurn).toBe(9);
  expect(batch.transition.nextState.continuation?.laneId).toBe(3);
  let cpu = 0;
  const bounded = commandTransition(
    state,
    { kind: "ADVANCE" },
    12,
    9,
    engineScheduler,
    () => {
      const elapsed = cpu;
      cpu += 80;
      return elapsed;
    },
  );
  expect(bounded.journal).toHaveLength(4);
  expect(state.continuation?.laneId).toBe(1);
});
it("stops advancement at human input even if an injected scheduler advertises work", () => {
  const state = ready();
  state.phase = "GOOD_PLAY";
  state.activeSide = "GOOD";
  const scheduler = { canAdvance: () => true, step: engineScheduler.step };
  expect(needsAdvance(state, 7, scheduler)).toBe(false);
});

import { botScheduler } from "../src/matches/advance.js";
import {
  replayJournal,
  hashState,
  projectEvents,
} from "@oathfront/game-engine";
it("default bot scheduler makes one legal decision, journals Easy RNG, and never advances paused state", () => {
  const state = ready();
  state.difficulty = "EASY";
  const first = botScheduler.step(state, 1, 0)!;
  expect(first.entry.origin).toBe("BOT");
  expect(first.botIntentsThisTurn).toBe(1);
  expect(hashState(state)).toBe(first.entry.preStateHash);
  const replayed = replayJournal(state, [first.entry]);
  expect(replayed).toMatchObject({
    ok: true,
    finalState: first.transition.nextState,
    botIntentsThisTurn: 1,
  });
  if (!replayed.ok) throw Error(replayed.reason);
  const decide = (s: typeof state) => {
    const v = projectPlayerView(s, "EVIL");
    return chooseBotAction(v, v.legalActions, {
      difficulty: "EASY",
      randomState: s.random.states["bot:easy"],
      observationMemory: [],
    });
  };
  expect(decide(replayed.finalState)).toEqual(
    decide(first.transition.nextState),
  );
  for (const scope of [
    "location",
    "deck:evil",
    "deck:good",
    "power:evil",
    "power:good",
  ] as const)
    expect(first.transition.nextState.random.states[scope]).toEqual(
      state.random.states[scope],
    );
  const paused = structuredClone(state);
  paused.lifecycle = "PAUSED";
  expect(botScheduler.canAdvance(paused, 0)).toBe(false);
  expect(botScheduler.step(paused, 1, 0)).toBeNull();
});
it("faults before a 65th bot intent, rejects early forged fault and hides the diagnostic", () => {
  const state = ready();
  const result = botScheduler.step(state, 1, 64)!;
  expect(result.entry).toMatchObject({
    origin: "AUTO",
    action: { kind: "BOT_GUARD_FAULT", turn: 5, botIntents: 64 },
  });
  expect(result.transition.nextState.lifecycle).toBe("FAULTED");
  expect(result.transition.nextState.outcome).toBeNull();
  expect(result.transition.events.some((e) => e.visibility === "SERVER")).toBe(
    true,
  );
  expect(
    projectEvents(result.transition.events, "GOOD").map((e) => e.kind),
  ).toEqual(["LifecycleChanged"]);
  expect(replayJournal(state, [result.entry], 64)).toMatchObject({
    ok: true,
    botIntentsThisTurn: 64,
  });
  expect(replayJournal(state, [result.entry], 63)).toMatchObject({
    ok: false,
    reason: "AUTOMATIC_OPERATION",
  });
});
it("64th pass may reach human input without fault, human controls preserve count and next global turn resets it", () => {
  const state = ready();
  state.players.EVIL.hand = [];
  const last = botScheduler.step(state, 1, 63)!;
  expect(last.transition.nextState.phase).toBe("GOOD_PLAY");
  expect(last.botIntentsThisTurn).toBe(64);
  expect(needsAdvance(last.transition.nextState, 64, botScheduler)).toBe(false);
  const pause = commandTransition(
    last.transition.nextState,
    { kind: "PAUSE" },
    1,
    64,
    botScheduler,
  );
  expect(pause.botIntentsThisTurn).toBe(64);
  const start = ready();
  start.phase = "TURN_START";
  start.activeSide = null;
  const nextTurn = botScheduler.step(start, 1, 64)!;
  expect(nextTurn.transition.nextState.turn).toBe(6);
  expect(nextTurn.botIntentsThisTurn).toBe(0);
});
import {
  createMatch,
  createRandomStreams,
  projectPlayerView,
} from "@oathfront/game-engine";
import { chooseBotAction } from "@oathfront/bot";
import { matchConfig, seed } from "../../../tests/fixtures/match-fixture.js";
it("Easy complete game hash, RNG, journal and per-turn guard are independent of one/eight batch cuts and checkpoint restarts", () => {
  function play(one: boolean) {
    const initial = createMatch(
      { ...matchConfig(), difficulty: "EASY" },
      createRandomStreams(seed),
    );
    let state = initial,
      guard = 0,
      seq = 0;
    const journal: import("@oathfront/game-engine").JournalEntry[] = [];
    for (
      let attempts = 0;
      attempts < 1000 && state.lifecycle === "ACTIVE";
      attempts++
    ) {
      const view = projectPlayerView(state, state.humanSide);
      const action = needsAdvance(state, guard, botScheduler)
        ? { kind: "ADVANCE" as const }
        : chooseBotAction(view, view.legalActions, {
            difficulty: "NORMAL",
            randomState: [1, 2, 3, 4],
            observationMemory: [],
          }).action;
      let clock = 0;
      const batch = commandTransition(
        state,
        action,
        seq,
        guard,
        botScheduler,
        () => (one ? clock++ * 251 : 0),
      );
      const entries = batch.journal.length ? batch.journal : [batch.entry];
      journal.push(...entries);
      seq += entries.length;
      state = structuredClone(batch.transition.nextState);
      guard = batch.botIntentsThisTurn;
    }
    expect(state.lifecycle).toBe("COMPLETED");
    expect(replayJournal(initial, journal)).toMatchObject({
      ok: true,
      finalState: state,
      botIntentsThisTurn: guard,
    });
    return { hash: hashState(state), random: state.random, guard, journal };
  }
  expect(play(true)).toEqual(play(false));
});
it("count64 guard fault is identical across one/eight batches including a serialized checkpoint restart", () => {
  const state = ready();
  state.players.EVIL.hand = [];
  state.players.EVIL.hand.push({
    definitionId: "EC01",
    instanceId: "f".repeat(32),
  });
  const full = commandTransition(
    state,
    { kind: "ADVANCE" },
    0,
    63,
    botScheduler,
    () => 0,
  );
  let cpu = 0;
  const first = commandTransition(
    state,
    { kind: "ADVANCE" },
    0,
    63,
    botScheduler,
    () => cpu++ * 251,
  );
  expect(first.journal).toHaveLength(1);
  expect(first.botIntentsThisTurn).toBe(64);
  expect(first.transition.nextState.lifecycle).toBe("ACTIVE");
  const checkpoint = JSON.parse(JSON.stringify(first.transition.nextState));
  const second = commandTransition(
    checkpoint,
    { kind: "ADVANCE" },
    1,
    64,
    botScheduler,
    () => 0,
  );
  expect(full.journal).toEqual([...first.journal, ...second.journal]);
  expect(hashState(full.transition.nextState)).toBe(
    hashState(second.transition.nextState),
  );
  expect(replayJournal(state, full.journal, 63)).toMatchObject({
    ok: true,
    botIntentsThisTurn: 64,
    finalState: full.transition.nextState,
  });
  expect(full.transition.nextState.lifecycle).toBe("FAULTED");
});
