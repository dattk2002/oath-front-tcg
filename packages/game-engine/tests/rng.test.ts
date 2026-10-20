import { expect, it } from "vitest";
import {
  createRandomStreams,
  nextInt,
  nextUint32,
  shuffle,
} from "../src/rng.js";
import { deriveInstanceId } from "../src/identity.js";
import { seed } from "../../../tests/fixtures/match-fixture.js";

it("pins HMAC UTF-8 scope derivation and little-endian words independently of stream consumption", () => {
  const random = createRandomStreams(seed);
  expect(random).toMatchObject({
    algorithmVersion: "hmac-sha256-xoshiro128ss-v1",
    states: {
      location: [1712074955, 2067687882, 276211551, 1555578551],
      "deck:evil": [1111199303, 884834306, 2810136053, 2348748189],
      "deck:good": [3756404738, 223192688, 4024099859, 3901097621],
      "power:evil": [331136399, 3618803810, 3203827855, 2867019660],
      "power:good": [1973010063, 3659279554, 4140512375, 171179949],
      "bot:easy": [2224007171, 3331645701, 3355696955, 3628513220],
    },
  });
  expect(deriveInstanceId(random.identityKey, 0)).toBe(
    "68385509ce1d75b2f7c1c332b5384c09",
  );
  expect(deriveInstanceId(random.identityKey, 1)).not.toBe(
    deriveInstanceId(random.identityKey, 0),
  );
});
it("pins xoshiro128** outputs including uint32 wraparound and leaves the input unchanged", () => {
  const initial = [1, 2, 3, 4] as const;
  let state: readonly [number, number, number, number] = initial;
  const values = [];
  for (let i = 0; i < 6; i++) {
    const draw = nextUint32(state);
    values.push(draw.value);
    state = draw.state;
  }
  expect(values).toEqual([11520, 0, 5927040, 70819200, 2031721883, 1637235492]);
  expect(initial).toEqual([1, 2, 3, 4]);
});
it("rejects high uint32 draws instead of applying biased modulo", () => {
  // First output 4294962679 is outside floor(2^32 / (2^31+1)) * (2^31+1).
  const state = [1, 0xffffffff, 3, 4] as const;
  const result = nextInt(state, 2147483649);
  expect(result.value).toBe(869654097);
  expect(result.state).toEqual([523976503, 2502902160, 2486152636, 4007495437]);
});
it("validates seed and integer bounds without silently accepting invalid entropy", () => {
  expect(() => createRandomStreams(new Uint8Array(31))).toThrow();
  for (const n of [0, -1, 1.5, 4294967297, NaN])
    expect(() => nextInt([1, 2, 3, 4], n)).toThrow();
});
it("uses descending Fisher-Yates without mutating inputs", () => {
  const input = ["a", "b", "c", "d"];
  expect(shuffle(input, [1, 2, 3, 4]).value).toEqual(["b", "c", "d", "a"]);
  expect(input).toEqual(["a", "b", "c", "d"]);
});
