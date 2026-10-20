import { expect, it } from "vitest";
import { coreCatalog } from "@oathfront/game-content";
import { createMatch } from "../src/setup.js";
import { createRandomStreams } from "../src/rng.js";
import {
  enumerateLocationTriples,
  getActiveLocation,
  revealLocations,
} from "../src/locations.js";
import { matchConfig, seed } from "../../../tests/fixtures/match-fixture.js";
it("enumerates every lexicographic valid subset once before the uniform subset draw", () => {
  const triples = enumerateLocationTriples(coreCatalog.locations);
  expect(triples).toHaveLength(55); // C(8,3) - C(3 adverse,3) = 55.
  expect(new Set(triples.map((triple) => triple.join(","))).size).toBe(55);
  expect(triples[0]).toEqual(["ancient_forest", "desert", "frozen_lake"]);
  expect(triples).not.toContainEqual(["desert", "frozen_lake", "volcano"]);
  expect(
    enumerateLocationTriples([...coreCatalog.locations].reverse()),
  ).toEqual(triples);
});
it("assigns distinct valid hidden locations to lanes1/3/5 while lanes2/4 stay normal", () => {
  for (let i = 0; i < 100; i++) {
    const varied = Uint8Array.from(seed);
    varied[0] = i;
    const state = createMatch(matchConfig(), createRandomStreams(varied));
    expect(state.board.map((lane) => lane.laneId)).toEqual([1, 2, 3, 4, 5]);
    expect(
      state.board
        .filter((l) => l.location.state === "NORMAL")
        .map((l) => l.laneId),
    ).toEqual([2, 4]);
    const special = state.board.flatMap((l) =>
      l.location.state === "NORMAL" ? [] : [l.location],
    );
    expect(new Set(special.map((l) => l.definitionId)).size).toBe(3);
    expect(
      special.some((l) =>
        coreCatalog.locations.some(
          (d) =>
            d.id === l.definitionId && ["BUFF", "NEUTRAL"].includes(d.group),
        ),
      ),
    ).toBe(true);
    expect(special.every((l) => l.state === "HIDDEN")).toBe(true);
    expect(
      state.board.every((l) => getActiveLocation(state, l.laneId) === null),
    ).toBe(true);
  }
});
it("reveals each lane at its scheduled turn exactly once without altering RNG or unit state", () => {
  let state = createMatch(matchConfig(), createRandomStreams(seed));
  state.board[2]!.good = {
    instanceId: "synthetic-existing-unit",
    definitionId: "GC01",
    owner: "GOOD",
    laneId: 3,
    isToken: false,
    printed: { attack: 2, hp: 2, maxHp: 2 },
    current: { attack: 2, hp: 2, maxHp: 2 },
    statuses: {
      armor: 0,
      shield: false,
      stunned: false,
      exhausted: false,
      poisoned: false,
      pierce: false,
    },
    modifiers: [],
    lastRegularAttackTurn: null,
    creationSeq: 1,
  };
  const before = structuredClone(state);
  for (const [turn, expected] of [
    [1, [1]],
    [2, []],
    [3, [3]],
    [4, []],
    [5, [5]],
    [6, []],
  ] as const) {
    const result = revealLocations(state, turn);
    expect(
      result.events.map((e) =>
        e.kind === "LocationRevealed" ? e.payload.laneId : null,
      ),
    ).toEqual(expected);
    state = result.nextState;
    expect(state.random).toEqual(before.random);
    expect(state.board[2]!.good).toEqual(before.board[2]!.good);
    for (const lane of state.board)
      expect(getActiveLocation(state, lane.laneId) !== null).toBe(
        [1, 3, 5].includes(lane.laneId) && lane.laneId <= turn,
      );
  }
  expect(before.board.every((l) => l.location.state !== "ACTIVE")).toBe(true);
  expect(revealLocations(state, 5).events).toEqual([]);
});

it("pins uniform subset selection then descending shuffle against the independent seeded vector", () => {
  const state = createMatch(matchConfig(), createRandomStreams(seed));
  expect(
    state.board.flatMap((l) =>
      l.location.state === "NORMAL" ? [] : [l.location.definitionId],
    ),
  ).toEqual(["healing_spring", "ancient_forest", "quiet_meadow"]);
  expect(state.random.states.location).toEqual([
    3232365399, 4207751818, 1939755254, 3831242230,
  ]);
});
