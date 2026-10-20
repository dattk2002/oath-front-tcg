import type { Graphics } from "pixi.js";
import type { PlayerView, VisibleEvent } from "@oathfront/contracts";
import definitions from "../../../../../../assets/source/effect-families.json" with { type: "json" };
export type EffectFamily =
  "kinetic" | "shield" | "growth" | "prism" | "ember" | "ink" | "veil";
export const effectPalette: Record<EffectFamily, number> = {
  kinetic: 0xf4cb76,
  shield: 0x76d9c4,
  growth: 0x9cdb8b,
  prism: 0x9ddcf4,
  ember: 0xffb078,
  ink: 0xbd9fea,
  veil: 0xb8c8d4,
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
/** Seven reusable code-native families share the existing GSAP presentation clock. */
export function drawEffect(
  graphics: Graphics,
  family: EffectFamily,
  x: number,
  y: number,
  progress: number,
  alpha: number,
  reduced: boolean,
) {
  const r = reduced ? 14 : 12 + progress * 22;
  const stroke = { color: effectPalette[family], width: 3, alpha };
  if (family === "shield")
    graphics
      .poly([
        x,
        y - r,
        x + r,
        y - r * 0.5,
        x + r * 0.7,
        y + r * 0.6,
        x,
        y + r,
        x - r * 0.7,
        y + r * 0.6,
        x - r,
        y - r * 0.5,
        x,
        y - r,
      ])
      .stroke(stroke);
  else if (family === "growth")
    graphics
      .ellipse(x - r * 0.3, y, r * 0.45, r)
      .stroke(stroke)
      .ellipse(x + r * 0.3, y - r * 0.2, r * 0.45, r * 0.8)
      .stroke(stroke);
  else if (family === "prism")
    graphics
      .poly([x, y - r, x + r, y, x, y + r, x - r, y, x, y - r])
      .stroke(stroke)
      .moveTo(x, y - r)
      .lineTo(x, y + r)
      .stroke(stroke);
  else if (family === "ember")
    graphics
      .poly([
        x,
        y - r,
        x + r * 0.8,
        y + r * 0.7,
        x - r * 0.8,
        y + r * 0.7,
        x,
        y - r,
      ])
      .stroke(stroke)
      .circle(x, y + r * 0.2, r * 0.25)
      .fill({ color: effectPalette.ember, alpha });
  else if (family === "ink")
    graphics
      .circle(x, y, r * 0.6)
      .stroke(stroke)
      .circle(x - r, y - r * 0.5, r * 0.18)
      .fill({ color: effectPalette.ink, alpha })
      .circle(x + r * 0.7, y - r * 0.8, r * 0.23)
      .fill({ color: effectPalette.ink, alpha });
  else if (family === "veil")
    graphics
      .ellipse(x, y - r * 0.3, r, r * 0.35)
      .stroke(stroke)
      .ellipse(x, y + r * 0.4, r * 0.8, r * 0.3)
      .stroke(stroke);
  else
    graphics
      .moveTo(x - r, y)
      .lineTo(x + r, y)
      .moveTo(x, y - r)
      .lineTo(x, y + r)
      .moveTo(x - r * 0.6, y - r * 0.6)
      .lineTo(x + r * 0.6, y + r * 0.6)
      .stroke(stroke);
}
