import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  advanceAutomatic,
  canonicalJson,
  type MatchState,
} from "../../../packages/game-engine/src/index.js";

/** Dependencies outside currentVersions() must be explicitly part of diagnostic provenance. */
export function hashDiagnosticFiles(root: string, paths: readonly string[]) {
  const files = [...paths].sort().map((path) => ({
    path,
    sha256: createHash("sha256")
      .update(readFileSync(join(root, path)))
      .digest("hex"),
  }));
  return {
    files,
    sha256: createHash("sha256").update(canonicalJson(files)).digest("hex"),
  };
}

/** Utility probes may complete this combat/turn only, never silently return a partial or faulty state. */
export function advanceProbeToBoundary(
  initial: MatchState,
  maxRoots = 200,
): MatchState {
  if (!Number.isSafeInteger(maxRoots) || maxRoots < 1 || maxRoots > 200)
    throw new RangeError("Invalid combat probe root budget");
  let state = initial;
  for (
    let root = 0;
    root < maxRoots &&
    state.lifecycle === "ACTIVE" &&
    state.phase !== "TURN_START";
    root++
  )
    state = advanceAutomatic(state, { maxRoots: 1 }).nextState;
  if (state.lifecycle === "FAULTED") throw new Error("Combat probe FAULTED");
  if (
    state.lifecycle === "ACTIVE" &&
    state.phase === "TURN_START" &&
    state.outcome === null
  )
    return state;
  if (
    state.lifecycle === "COMPLETED" &&
    state.outcome?.reason === "HERO_DEFEATED"
  )
    return state;
  if (state.lifecycle === "ACTIVE")
    throw new Error("Combat probe exhausted root budget before TURN_START");
  throw new Error(
    "Combat probe did not reach the expected terminal or TURN_START boundary",
  );
}
