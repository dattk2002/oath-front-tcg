import { expect, it } from "vitest";
import {
  effectFamily,
  effectPalette,
} from "../src/features/match/rendering/vfx";
import type { VisibleEvent } from "@oathfront/contracts";
it("maps public definition cues into seven reusable distinct effect families", () => {
  const families = [
    "kinetic",
    "shield",
    "growth",
    "prism",
    "ember",
    "ink",
    "veil",
  ];
  const definitions = [
    "GC05",
    "P_B1",
    "S_G_BV",
    "P_P2",
    "S_E_FX",
    "P_X1",
    "P_S1",
  ];
  expect(
    definitions.map((definitionId) =>
      effectFamily(
        { kind: "PowerUsed", payload: { definitionId } } as VisibleEvent,
        null,
      ),
    ),
  ).toEqual(families);
  expect(new Set(Object.values(effectPalette)).size).toBe(7);
  expect(
    effectFamily(
      {
        kind: "PowerUsed",
        payload: { definitionId: "S_E_XS" },
      } as VisibleEvent,
      null,
    ),
  ).toBe("ember");
});
