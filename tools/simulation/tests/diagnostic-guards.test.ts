import { expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ready, unit } from "../../../packages/game-engine/tests/helpers.js";
import * as guards from "./diagnostic-guards.js";
function combat() {
  const state = ready();
  state.phase = "COMBAT";
  state.activeSide = null;
  state.continuation = {
    laneId: 1,
    stage: "BEFORE_PAIR",
    pendingResponders: [],
  };
  for (const player of Object.values(state.players))
    player.block = { charge: 0, used: 3, active: false };
  return state;
}
it("rejects a combat probe that exhausts its root budget before the turn boundary", () => {
  expect(guards.advanceProbeToBoundary).toBeTypeOf("function");
  expect(() => guards.advanceProbeToBoundary(combat(), 1)).toThrow(
    /exhausted/i,
  );
});
it("rejects a faulted combat state rather than returning it as a valid differential", () => {
  expect(guards.advanceProbeToBoundary).toBeTypeOf("function");
  const state = combat();
  state.lifecycle = "FAULTED";
  expect(() => guards.advanceProbeToBoundary(state)).toThrow(/faulted/i);
});
it("accepts the real engine turn boundary and expected hero-defeat terminal outcome", () => {
  expect(guards.advanceProbeToBoundary).toBeTypeOf("function");
  const boundary = guards.advanceProbeToBoundary(combat());
  expect(boundary.lifecycle).toBe("ACTIVE");
  expect(boundary.phase).toBe("TURN_START");
  const lethal = combat();
  lethal.players.GOOD.hp = 1;
  unit(lethal, "EC01", "EVIL", 1);
  const terminal = guards.advanceProbeToBoundary(lethal);
  expect(terminal.lifecycle).toBe("COMPLETED");
  expect(terminal.outcome).toMatchObject({
    winner: "EVIL",
    reason: "HERO_DEFEATED",
  });
});
it("rejects a lifecycle exit that is neither the intended boundary nor expected terminal", () => {
  expect(guards.advanceProbeToBoundary).toBeTypeOf("function");
  const state = combat();
  state.lifecycle = "PAUSED";
  expect(() => guards.advanceProbeToBoundary(state)).toThrow(/boundary/i);
});
it("dependency identity changes when an imported helper or transitive fixture changes", () => {
  expect(guards.hashDiagnosticFiles).toBeTypeOf("function");
  const directory = mkdtempSync(
    join(tmpdir(), "oathfront-diagnostic-identity-"),
  );
  try {
    writeFileSync(join(directory, "helper.ts"), "helper v1");
    writeFileSync(join(directory, "fixture.ts"), "fixture v1");
    const before = guards.hashDiagnosticFiles(directory, [
      "helper.ts",
      "fixture.ts",
    ]);
    expect(before.files.map((f: { path: string }) => f.path)).toEqual([
      "fixture.ts",
      "helper.ts",
    ]);
    writeFileSync(join(directory, "helper.ts"), "helper v2");
    const helperChanged = guards.hashDiagnosticFiles(directory, [
      "helper.ts",
      "fixture.ts",
    ]);
    expect(helperChanged.sha256).not.toBe(before.sha256);
    writeFileSync(join(directory, "fixture.ts"), "fixture v2");
    const fixtureChanged = guards.hashDiagnosticFiles(directory, [
      "helper.ts",
      "fixture.ts",
    ]);
    expect(fixtureChanged.sha256).not.toBe(helperChanged.sha256);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
