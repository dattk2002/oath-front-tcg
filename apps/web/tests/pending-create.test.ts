import { it, expect } from "vitest";
import { restorePresetCreate } from "../src/features/setup/pending-create.js";
const body = {
  commandId: "20000000-0000-4000-8000-000000000001",
  mode: "SKIRMISH",
  deck: { kind: "PRESET", presetId: "D_E_FX" },
  opponentHeroId: "H_G_BP",
  difficulty: "NORMAL",
  expectedContentVersion: "core_v1",
};
it("pending create restores exact hero and request rather than showing unrelated defaults", () => {
  const restored = restorePresetCreate(
    [{ presetId: "D_E_FX", heroId: "H_E_FX" }],
    { getItem: () => JSON.stringify(body) },
    "core_v1",
  );
  expect(restored?.heroId).toBe("H_E_FX");
  expect(restored?.request).toEqual({
    commandId: "20000000-0000-4000-8000-000000000001",
    mode: "SKIRMISH",
    deck: { kind: "PRESET", presetId: "D_E_FX" },
    opponentHeroId: "H_G_BP",
    difficulty: "NORMAL",
    expectedContentVersion: "core_v1",
  });
});
it("unavailable referenced preset preserves original pending payload for recovery and never substitutes", () => {
  const restored = restorePresetCreate(
    [],
    {
      getItem: () => JSON.stringify(body),
    },
    "core_v1",
  );
  expect(restored?.heroId).toBeNull();
  expect(restored?.request).toEqual(body);
});
it("closed-schema invalid stored request is never replayed", () => {
  expect(
    restorePresetCreate(
      [],
      {
        getItem: () => JSON.stringify({ ...body, seed: "private" }),
      },
      "core_v1",
    ),
  ).toBeNull();
});

it("unavailable content version preserves the request and requires recovery", () => {
  const restored = restorePresetCreate(
    [{ presetId: "D_E_FX", heroId: "H_E_FX" }],
    { getItem: () => JSON.stringify(body) },
    "core_v2",
  );
  expect(restored?.heroId).toBeNull();
  expect(restored?.request).toEqual(body);
});
