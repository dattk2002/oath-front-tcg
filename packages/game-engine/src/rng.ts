import { createHmac } from "node:crypto";

export const algorithmVersion = "hmac-sha256-xoshiro128ss-v1" as const;
export const randomScopes = [
  "location",
  "deck:evil",
  "deck:good",
  "power:evil",
  "power:good",
  "bot:easy",
] as const;
export type RandomScope = (typeof randomScopes)[number];
export type RandomState = readonly [number, number, number, number];
export interface RandomStreams {
  algorithmVersion: typeof algorithmVersion;
  /** Private seed-derived identity secret; never project into a view or event. */
  identityKey: string;
  states: Record<RandomScope, RandomState>;
}
export interface RandomResult<T> {
  value: T;
  state: RandomState;
}

export function createRandomStreams(seed: Uint8Array): RandomStreams {
  if (seed.length !== 32)
    throw new RangeError("A match seed must contain 32 bytes");
  const derive = (scope: string) =>
    createHmac("sha256", seed).update(scope, "utf8").digest();
  const stateFor = (scope: RandomScope): RandomState => {
    const bytes = derive(scope);
    const state: [number, number, number, number] = [
      bytes.readUInt32LE(0),
      bytes.readUInt32LE(4),
      bytes.readUInt32LE(8),
      bytes.readUInt32LE(12),
    ];
    if (state.every((word) => word === 0)) state[3] = 1;
    return state;
  };
  return {
    algorithmVersion,
    identityKey: derive("identity").toString("hex"),
    states: {
      location: stateFor("location"),
      "deck:evil": stateFor("deck:evil"),
      "deck:good": stateFor("deck:good"),
      "power:evil": stateFor("power:evil"),
      "power:good": stateFor("power:good"),
      "bot:easy": stateFor("bot:easy"),
    },
  };
}
const rotl = (word: number, bits: number) =>
  ((word << bits) | (word >>> (32 - bits))) >>> 0;
export function nextUint32(state: RandomState): RandomResult<number> {
  let [a, b, c, d] = state;
  const value = Math.imul(rotl(Math.imul(b, 5), 7), 9) >>> 0;
  const t = b << 9;
  c ^= a;
  d ^= b;
  b ^= c;
  a ^= d;
  c ^= t;
  d = rotl(d, 11);
  return { value, state: [a >>> 0, b >>> 0, c >>> 0, d >>> 0] };
}
export function nextInt(state: RandomState, n: number): RandomResult<number> {
  if (!Number.isSafeInteger(n) || n < 1 || n > 0x100000000)
    throw new RangeError("Invalid random bound");
  const limit = Math.floor(0x100000000 / n) * n;
  let draw: RandomResult<number>;
  do {
    draw = nextUint32(state);
    state = draw.state;
  } while (draw.value >= limit);
  return { value: draw.value % n, state };
}
export function shuffle<T>(
  input: readonly T[],
  state: RandomState,
): RandomResult<T[]> {
  const value = [...input];
  for (let i = value.length - 1; i > 0; i--) {
    const draw = nextInt(state, i + 1);
    state = draw.state;
    [value[i], value[draw.value]] = [value[draw.value]!, value[i]!];
  }
  return { value, state };
}
