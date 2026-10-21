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

it("reduced effects retain a fixed local footprint throughout the cue", async () => {
  const { Graphics } = await import("pixi.js");
  const { drawEffect } = await import("../src/features/match/rendering/vfx");
  for (const family of Object.keys(
    effectPalette,
  ) as (keyof typeof effectPalette)[]) {
    const graphic = new Graphics();
    drawEffect(graphic, family, 100, 100, 0, 1, true, 44);
    const start = graphic.getBounds();
    graphic.clear();
    drawEffect(graphic, family, 100, 100, 0.95, 1, true, 44);
    const end = graphic.getBounds();
    expect([end.x, end.y, end.width, end.height]).toEqual([
      start.x,
      start.y,
      start.width,
      start.height,
    ]);
    expect(end.width).toBeLessThan(112);
    expect(end.height).toBeLessThan(112);
    graphic.destroy();
  }
});
