import { describe, expect, it } from "vitest";
import { createMatch, createMatchWithEvents } from "../src/setup.js";
import { createRandomStreams, nextInt } from "../src/rng.js";
import { validateWire } from "@oathfront/contracts";
import { matchConfig, seed } from "../../../tests/fixtures/match-fixture.js";

describe("R01/R03 setup", () => {
  it("starts in mulligan with four ordinary cards and no power, energy or revealed location", () => {
    const state = createMatch(matchConfig(), createRandomStreams(seed));
    expect(state).toMatchObject({
      turn: 0,
      phase: "MULLIGAN",
      players: {
        GOOD: {
          hp: 20,
          maxHp: 20,
          hand: expect.any(Array),
          deck: expect.any(Array),
          reserve: [],
          energy: { current: 0, max: 0 },
          mulliganCommitted: false,
        },
        EVIL: { hp: 20, maxHp: 20, reserve: [] },
      },
    });
  });
});

it("reproduces setup while keeping every instance opaque, distinct and present in a serializable initial snapshot", () => {
  const config = matchConfig();
  const random = createRandomStreams(seed);
  const before = structuredClone(random);
  const state = createMatch(config, random);
  expect(state).toEqual(createMatch(config, createRandomStreams(seed)));
  expect(random).toEqual(before);
  expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  const instances = Object.values(state.players).flatMap((p) => [
    ...p.hand,
    ...p.deck,
  ]);
  expect(instances).toHaveLength(60);
  expect(new Set(instances.map((c) => c.instanceId)).size).toBe(60);
  expect(instances.every((c) => /^[a-f0-9]{32}$/.test(c.instanceId))).toBe(
    true,
  );
  expect(state.players.GOOD.hand).toHaveLength(4);
  expect(state.players.EVIL.deck).toHaveLength(26);
  config.decks.GOOD.entries.pop();
  expect(state.deckSnapshots.GOOD.entries).toHaveLength(15);
  expect(state).not.toHaveProperty("events");
});

it("rejects invalid deck/version/faction configuration before consuming streams", () => {
  const random = createRandomStreams(seed);
  const before = structuredClone(random);
  const config = matchConfig();
  config.decks.GOOD.entries.pop();
  expect(() => createMatch(config, random)).toThrow();
  const unsupported = matchConfig();
  unsupported.versions.rules = "rules_v2";
  expect(() => createMatch(unsupported, random)).toThrow();
  const wrongSide = matchConfig();
  wrongSide.decks.EVIL = wrongSide.decks.GOOD;
  expect(() => createMatch(wrongSide, random)).toThrow();
  expect(random).toEqual(before);
});

it("bot random consumption cannot alter deck order, locations or identity allocation", () => {
  const a = createRandomStreams(seed),
    b = createRandomStreams(seed);
  for (let i = 0; i < 50; i++)
    b.states["bot:easy"] = nextInt(b.states["bot:easy"], 13).state;
  const left = createMatch(matchConfig(), a),
    right = createMatch(matchConfig(), b);
  expect(left.players).toEqual(right.players);
  expect(left.board).toEqual(right.board);
});

it("returns validated setup events outside the initial state with stable root and event IDs", () => {
  const result = createMatchWithEvents(
    matchConfig(),
    createRandomStreams(seed),
  );
  expect(result.events[0]).toMatchObject({
    kind: "MatchStarted",
    sequence: 1,
    rootId: `${result.nextState.matchId}:1`,
    eventId: `${result.nextState.matchId}:1`,
  });
  expect(result.events.filter((e) => e.kind === "CardDrawn")).toHaveLength(8);
  expect(
    result.events.filter((e) => e.kind === "HandCountChanged"),
  ).toHaveLength(2);
  expect(result.events.every((e) => validateWire("VisibleEvent", e))).toBe(
    true,
  );
  expect(
    result.events.every(
      (e) => !JSON.stringify(e).includes(result.nextState.random.identityKey),
    ),
  ).toBe(true);
  expect(result.nextState.eventSeq).toBe(result.events.length);
  expect(result.nextState).toEqual(
    createMatch(matchConfig(), createRandomStreams(seed)),
  );
});

it("rejects extra fields in pinned versions instead of emitting a nonconforming public setup event", () => {
  const config = matchConfig();
  Object.assign(config.versions, { hiddenSeed: "forbidden" });
  expect(() =>
    createMatchWithEvents(config, createRandomStreams(seed)),
  ).toThrow();
});
