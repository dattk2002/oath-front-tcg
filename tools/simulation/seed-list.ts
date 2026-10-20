import { createHash } from "node:crypto";

/** Offline seeds only. This namespace must remain immutable for regression replay. */
export function seedList(count: number): string[] {
  if (!Number.isSafeInteger(count) || count < 1 || count > 10_000)
    throw new RangeError("Seed count must be 1..10000");
  return Array.from({ length: count }, (_, index) =>
    createHash("sha256")
      .update(
        `oathfront-balance-core-v1-seed-${index.toString().padStart(4, "0")}`,
      )
      .digest("hex"),
  );
}
export const regressionSeeds = Object.freeze(seedList(20));
