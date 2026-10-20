import type { RandomState, RandomResult } from "./rng.js";
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
