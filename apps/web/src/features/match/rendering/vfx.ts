import type { Graphics } from "pixi.js";
import type { PlayerView, VisibleEvent } from "@oathfront/contracts";
import definitions from "../../../../../../assets/source/effect-families.json" with { type: "json" };
export type EffectFamily =
  "kinetic" | "shield" | "growth" | "prism" | "ember" | "ink" | "veil";
// Mirrors --fx-* in tokens.css; immutable content only selects the family.
export const effectPalette: Record<EffectFamily, number> = {
  kinetic: 0xffe34d,
  shield: 0x80e3e0,
  growth: 0xb6ee92,
  prism: 0xb2d9ff,
  ember: 0xff957b,
  ink: 0xd2b6ff,
  veil: 0xf0efe8,
};
function definitionFamily(id: string): EffectFamily {
  const families: Record<string, string> = definitions;
  const family = families[id];
  switch (family) {
    case "kinetic":
    case "shield":
    case "growth":
    case "prism":
    case "ember":
    case "ink":
    case "veil":
      return family;
    default:
      return "kinetic";
  }
}
export function effectFamily(
  event: VisibleEvent,
  view: PlayerView | null,
): EffectFamily {
  if (event.kind === "CardPlayed" || event.kind === "PowerUsed")
    return definitionFamily(event.payload.definitionId);
  if (event.kind === "UnitCreated")
    return definitionFamily(event.payload.unit.definitionId);
  if (event.kind === "HeroHealed" || event.kind === "StatsChanged")
    return "growth";
  if (event.kind === "BlockOccurred") return "shield";
  if (event.kind === "LocationRevealed") return "prism";
  if (event.kind === "StatusChanged") return "ink";
  if (event.kind === "UnitMoved") return "veil";
  if (event.kind === "DamageBatchResolved") {
    if (
      event.payload.packets.some(
        (p) => p.shieldConsumed || p.mitigatedDamage > 0,
      )
    )
      return "shield";
    const source = event.payload.packets[0]?.source;
    if (source?.kind === "UNIT") {
      const unit = view?.board
        .flatMap((lane) => [lane.good, lane.evil])
        .find((unit) => unit?.instanceId === source.instanceId);
      if (unit) return definitionFamily(unit.definitionId);
    }
  }
  return "kinetic";
}
/** Bounded deterministic silhouettes; one cue drives every stroke, with no particles/ticker. */
export function drawEffect(
  graphics: Graphics,
  family: EffectFamily,
  x: number,
  y: number,
  progress: number,
  alpha: number,
  reduced: boolean,
  extent = 44,
) {
  const size = Math.max(20, Math.min(56, extent));
  const r =
    size * (reduced ? 0.85 : 0.65 + 0.35 * Math.sin((Math.PI * progress) / 2));
  const color = effectPalette[family];
  const stroke = { color, width: reduced ? 2 : 3, alpha };
  const path = (points: number[], fill = false) => {
    graphics.poly(points.map((v, i) => (i % 2 ? y : x) + v * r));
    if (fill) graphics.fill({ color, alpha: alpha * 0.3 });
    graphics.stroke(stroke);
  };
  const line = (a: number, b: number, c: number, d: number) =>
    graphics
      .moveTo(x + a * r, y + b * r)
      .lineTo(x + c * r, y + d * r)
      .stroke(stroke);
  if (family === "kinetic") {
    path([-1, 0.25, 0.85, -0.8, 0.3, 0.05, 1, 0.1, -0.7, 0.65], true);
    line(-1.2, -0.45, -0.25, -0.65);
    line(-1.1, 0.85, -0.35, 0.72);
    line(0.8, 0.4, 1.15, 0.25);
  } else if (family === "shield") {
    path(
      [0, -1, 0.85, -0.55, 0.65, 0.55, 0, 1, -0.65, 0.55, -0.85, -0.55],
      true,
    );
    path([0, -0.72, 0.59, -0.4, 0.45, 0.39, 0, 0.72, -0.45, 0.39, -0.59, -0.4]);
    line(0, -0.72, 0, 0.72);
    line(-1.1, -0.3, -1.18, 0.2);
    line(1.1, -0.3, 1.18, 0.2);
  } else if (family === "growth") {
    for (const side of [-1, 1]) {
      graphics
        .moveTo(x, y + r * 0.65)
        .quadraticCurveTo(
          x + side * r * 1.15,
          y + r * 0.2,
          x + side * r * 0.75,
          y - r * 0.65,
        )
        .quadraticCurveTo(x, y - r * 0.35, x, y + r * 0.65)
        .stroke(stroke);
    }
    path([0, -1.1, 0.2, -0.82, 0, -0.55, -0.2, -0.82], true);
    line(0, 0.8, 0, -0.4);
  } else if (family === "prism") {
    path([-0.5, -0.9, 0.25, -0.65, -0.1, 0.5], true);
    path([0.4, -0.4, 1, 0.2, 0.35, 0.7], true);
    path([-0.95, 0.15, -0.4, 0.35, -0.65, 0.95]);
    line(-1.1, -0.7, -0.65, -0.3);
    line(0.45, -0.85, 1.15, -0.2);
    line(-0.2, 0.7, 0.25, 1.05);
  } else if (family === "ember") {
    path(
      [-0.65, 0.7, -0.35, -0.5, -0.12, -0.1, 0.2, -1.1, 0.75, 0.4, 0.2, 0.85],
      true,
    );
    path([-0.1, 0.6, 0.15, 0, 0.35, 0.5]);
    path([-1, -0.1, -0.9, -0.6, -0.72, -0.2], true);
    path([0.8, -0.55, 0.95, -1, 1.05, -0.4], true);
  } else if (family === "ink") {
    // Open polygon segments deliberately break the seal.
    line(-0.8, -0.35, -0.3, -0.85);
    line(-0.3, -0.85, 0.45, -0.7);
    line(0.8, -0.3, 0.75, 0.4);
    line(0.75, 0.4, 0.15, 0.85);
    line(-0.15, 0.85, -0.75, 0.45);
    line(-0.75, 0.45, -0.8, 0.05);
    path([0, -0.5, 0.4, 0, 0, 0.5, -0.4, 0]);
    line(-1.1, -0.8, -0.55, -0.3);
    line(0.4, 0.3, 1.15, 0.9);
  } else {
    for (const offset of [-0.3, 0.35]) {
      graphics
        .moveTo(x - r, y + r * (0.3 + offset))
        .quadraticCurveTo(
          x + r * 0.1,
          y - r * (1 - offset),
          x + r,
          y + r * offset,
        )
        .quadraticCurveTo(
          x + r * 0.1,
          y - r * (0.5 - offset),
          x - r,
          y + r * (0.3 + offset),
        )
        .fill({ color, alpha: alpha * 0.25 })
        .stroke(stroke);
    }
  }
}

export function drawCardTrace(
  graphics: Graphics,
  x: number,
  y: number,
  alpha: number,
  color: number,
  extent = 28,
) {
  const w = Math.min(32, extent),
    h = w * 1.4;
  graphics
    .poly([
      x - w,
      y - h,
      x + w * 0.65,
      y - h,
      x + w,
      y - h * 0.7,
      x + w,
      y + h,
      x - w,
      y + h,
    ])
    .fill({ color: 0x101218, alpha: alpha * 0.8 })
    .stroke({ color, width: 3, alpha });
  graphics
    .moveTo(x - w * 0.65, y + h * 0.5)
    .lineTo(x + w * 0.65, y - h * 0.5)
    .stroke({ color, width: 2, alpha });
}
