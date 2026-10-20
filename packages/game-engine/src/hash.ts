import { createHash } from "node:crypto";
import type { MatchState } from "./model.js";
/** MatchState has no operational timestamps; reject non-JSON values rather than silently hash null. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new RangeError("Non-finite state number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value))
    return "[" + value.map(canonicalJson).join(",") + "]";
  if (
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  )
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(
          (k) =>
            JSON.stringify(k) +
            ":" +
            canonicalJson((value as Record<string, unknown>)[k]),
        )
        .join(",") +
      "}"
    );
  throw new TypeError("State must be plain JSON");
}
export function hashState(state: MatchState): string {
  return createHash("sha256").update(canonicalJson(state)).digest("hex");
}
