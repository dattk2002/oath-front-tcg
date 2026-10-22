import type { CardRarity } from "@oathfront/contracts/browser";

export const rarities = {
  U: { name: "Uncommon", shape: "triangle", points: "32,5 59,55 5,55" },
  R: { name: "Rare", shape: "square", points: "10,10 54,10 54,54 10,54" },
  SR: {
    name: "Super Rare",
    shape: "pentagon",
    points: "32,4 60,25 49,58 15,58 4,25",
  },
  SL: {
    name: "Super Legendary",
    shape: "hexagon",
    points: "18,6 46,6 61,32 46,58 18,58 3,32",
  },
  E: {
    name: "Event",
    shape: "crest",
    points:
      "10,7 25,13 32,4 39,13 54,7 58,35 48,35 46,50 32,61 18,50 16,35 6,35",
  },
} as const;

/** Shared exact OathFront gem colors for SVG and physical card textures. */
export function rarityGradient(
  rarity: CardRarity,
): readonly (readonly [number, string])[] {
  if (rarity === "SL")
    return [
      [0, "#a9f1ee"],
      [0.35, "#b7a0f7"],
      [0.72, "#f4b3c7"],
      [1, "#f3eaa5"],
    ];
  const colors = { U: "#cbd5e1", R: "#f4d06f", SR: "#c5a1ff", E: "#ff9875" };
  return [
    [0, "#fff8e6"],
    [0.35, colors[rarity]],
    [0.72, colors[rarity]],
    [1, "#51445a"],
  ];
}
