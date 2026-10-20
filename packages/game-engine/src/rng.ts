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
export { nextUint32, nextInt, shuffle } from "./random-algorithm.js";
