import { it, expect } from "vitest";
import * as engine from "../src/index.js";
import { matchConfig, seed } from "../../../tests/fixtures/match-fixture.js";
import { ready, next } from "./helpers.js";
it("hash is canonical over key ordering, sensitive to private state, and rejects invalid numbers", () => {
  const s = ready();
  expect(engine.hashState(s)).toBe(
    engine.hashState(
      Object.fromEntries(Object.entries(s).reverse()) as typeof s,
    ),
  );
  const b = structuredClone(s);
  b.eventSeq++;
  expect(engine.hashState(b)).not.toBe(engine.hashState(s));
  b.players.GOOD.hp = NaN;
  expect(() => engine.hashState(b)).toThrow();
});
it("replays ordered human/BOT/AUTO rows with recorded RNG then checks event bounds and hashes", () => {
  const s = ready();
  const entries: engine.JournalEntry[] = [];
  let current = s;
  const events: engine.GameEvent[] = [];
  for (const actor of ["EVIL", "GOOD", "EVIL"] as const) {
    const result = engine.applyAction(current, {
      actor,
      action: { kind: "PASS_PHASE" },
    });
    if (result.kind !== "transition") throw Error(result.code);
    const rng =
      actor === "EVIL"
        ? engine.nextUint32(current.random.states["bot:easy"]).state
        : null;
    const after = structuredClone(result.nextState);
    if (rng) after.random.states["bot:easy"] = rng;
    entries.push({
      stepSeq: entries.length + 1,
      ...(rng
        ? { origin: "BOT" as const, nextBotRandomState: rng }
        : { origin: "HUMAN" as const, nextBotRandomState: null }),
      action: { actor, action: { kind: "PASS_PHASE" } },
      preStateHash: engine.hashState(current),
      postStateHash: engine.hashState(after),
      firstEventSeq: result.events[0]?.sequence ?? null,
      lastEventSeq: result.events.at(-1)?.sequence ?? null,
    });
    current = after;
    events.push(...result.events);
  }
  const operation = engine.describeAutomaticOperation(current);
  const auto = engine.advanceAutomatic(current, { maxRoots: 1 });
  entries.push({
    stepSeq: 4,
    origin: "AUTO",
    action: operation!,
    nextBotRandomState: null,
    preStateHash: engine.hashState(current),
    postStateHash: engine.hashState(auto.nextState),
    firstEventSeq: auto.events[0]?.sequence ?? null,
    lastEventSeq: auto.events.at(-1)?.sequence ?? null,
  });
  current = auto.nextState;
  events.push(...auto.events);
  const replay = engine.replayJournal(s, entries);
  expect(replay).toMatchObject({ ok: true, finalState: current, events });
  expect(s).toEqual(ready());
  const broken = structuredClone(entries);
  broken[1]!.postStateHash = "bad";
  expect(engine.replayJournal(s, broken)).toMatchObject({
    ok: false,
    stepSeq: 2,
    reason: "POST_HASH",
  });
  const shuffled = [entries[1]!, entries[0]!];
  expect(engine.replayJournal(s, shuffled)).toMatchObject({
    ok: false,
    stepSeq: 2,
    reason: "STEP_SEQUENCE",
  });
  expect(
    next(
      engine.applyAction(ready(), {
        actor: "EVIL",
        action: { kind: "PASS_PHASE" },
      }),
    ).phase,
  ).toBe("GOOD_PLAY");
});
it("replays a complete seeded 20-turn game with pause/resume and each persisted automatic root, never calling a bot policy", () => {
  const initial = engine.createMatch(
    matchConfig(),
    engine.createRandomStreams(seed),
  );
  let current = initial;
  const entries: engine.JournalEntry[] = [],
    allEvents: engine.GameEvent[] = [];
  let paused = false;
  for (let guard = 0; guard < 1000 && current.lifecycle === "ACTIVE"; guard++) {
    const preStateHash = engine.hashState(current);
    const operation = engine.describeAutomaticOperation(current);
    const actor =
      current.phase === "MULLIGAN"
        ? current.players.GOOD.mulliganCommitted
          ? "EVIL"
          : "GOOD"
        : current.activeSide!;
    const intent: engine.EngineAction = {
      actor,
      action:
        current.phase === "MULLIGAN"
          ? { kind: "MULLIGAN", cardInstanceIds: [] }
          : { kind: "PASS_PHASE" },
    };
    const r = operation
      ? engine.advanceAutomatic(current, { maxRoots: 1 })
      : engine.applyAction(current, intent);
    if (r.kind !== "transition") throw Error(r.code);
    const nextState = r.nextState;
    const base = {
      stepSeq: entries.length + 1,
      preStateHash,
      postStateHash: "",
      firstEventSeq: r.events[0]?.sequence ?? null,
      lastEventSeq: r.events.at(-1)?.sequence ?? null,
    };
    if (operation) {
      base.postStateHash = engine.hashState(nextState);
      entries.push({
        ...base,
        origin: "AUTO",
        action: operation,
        nextBotRandomState: null,
      });
    } else if (actor !== current.humanSide) {
      const rng = engine.nextUint32(current.random.states["bot:easy"]).state;
      nextState.random.states["bot:easy"] = rng;
      base.postStateHash = engine.hashState(nextState);
      entries.push({
        ...base,
        origin: "BOT",
        action: intent,
        nextBotRandomState: rng,
      });
    } else {
      base.postStateHash = engine.hashState(nextState);
      entries.push({
        ...base,
        origin: "HUMAN",
        action: intent,
        nextBotRandomState: null,
      });
    }
    current = nextState;
    allEvents.push(...r.events);
    if (current.phase === "COMBAT" && !paused) {
      paused = true;
      for (const kind of ["PAUSE", "RESUME"] as const) {
        const before = engine.hashState(current),
          action = { actor: current.humanSide, action: { kind } };
        const c = engine.applyAction(current, action);
        if (c.kind !== "transition") throw Error(c.code);
        entries.push({
          stepSeq: entries.length + 1,
          origin: "HUMAN",
          action,
          nextBotRandomState: null,
          preStateHash: before,
          postStateHash: engine.hashState(c.nextState),
          firstEventSeq: c.events[0]?.sequence ?? null,
          lastEventSeq: c.events.at(-1)?.sequence ?? null,
        });
        current = c.nextState;
        allEvents.push(...c.events);
      }
    }
  }
  expect(current.outcome?.reason).toBe("TURN_LIMIT");
  expect(entries.filter((e) => e.origin === "AUTO").length).toBeGreaterThan(
    400,
  );
  expect(engine.replayJournal(initial, entries)).toEqual({
    ok: true,
    finalState: current,
    events: allEvents,
    botIntentsThisTurn: 2,
  });
  const broken = structuredClone(entries);
  broken[0]!.firstEventSeq = 999;
  expect(engine.replayJournal(initial, broken)).toMatchObject({
    ok: false,
    stepSeq: 1,
    reason: "EVENT_BOUNDS",
  });
  const bot = broken.find((e) => e.origin === "BOT")!;
  bot.nextBotRandomState = [0, 0, 0, 0];
  broken[0]!.firstEventSeq = entries[0]!.firstEventSeq;
  expect(engine.replayJournal(initial, broken)).toMatchObject({
    ok: false,
    stepSeq: bot.stepSeq,
    reason: "BOT_RANDOM_STATE",
  });
});
it("rejects relabeling a human action as BOT so origin forgery cannot inflate the operational guard", () => {
  const state = ready();
  state.phase = "GOOD_PLAY";
  state.activeSide = "GOOD";
  const action = {
    actor: "GOOD" as const,
    action: { kind: "PASS_PHASE" as const },
  };
  const result = engine.applyAction(state, action);
  if (result.kind !== "transition") throw Error(result.code);
  const entry: engine.JournalEntry = {
    stepSeq: 1,
    origin: "BOT",
    action,
    nextBotRandomState: state.random.states["bot:easy"],
    preStateHash: engine.hashState(state),
    postStateHash: engine.hashState(result.nextState),
    firstEventSeq: result.events[0]?.sequence ?? null,
    lastEventSeq: result.events.at(-1)?.sequence ?? null,
  };
  expect(engine.replayJournal(state, [entry])).toMatchObject({
    ok: false,
    reason: "INVALID_ACTION",
  });
});
