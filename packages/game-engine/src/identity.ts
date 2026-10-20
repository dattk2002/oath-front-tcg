import { createHmac } from "node:crypto";
import type { MatchState } from "./model.js";

export function deriveInstanceId(identityKey: string, ordinal: number): string {
  if (
    !/^[a-f0-9]{64}$/.test(identityKey) ||
    !Number.isSafeInteger(ordinal) ||
    ordinal < 0
  )
    throw new RangeError("Invalid instance identity input");
  return createHmac("sha256", Buffer.from(identityKey, "hex"))
    .update(`instance:${ordinal}`, "utf8")
    .digest("hex")
    .slice(0, 32);
}
/** Allocate only on a draft state after an action has passed validation. */
export function allocateInstanceId(state: MatchState): string {
  return deriveInstanceId(state.random.identityKey, state.instanceSeq++);
}
