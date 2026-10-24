import { Vector2 } from "three";
import {
  Authoring,
  clippedVoronoi,
  colorize,
  flag,
  random,
  sweep,
  type Point,
} from "./geometry.js";

export interface CourtyardStyle {
  seed: number;
  /** Half-extent of the continuous paving; must cover the playable rect ±6.4/±3.8. */
  halfX: number;
  halfZ: number;
  baseColor: string;
  stoneColors: string[];
  fractureColor: string;
  /** Optional flush inlay strips drawn a hair above the plane (theme detailing). */
  inlays?: {
    kind: "line" | "ring";
    x: number;
    z: number;
    length?: number;
    radius?: number;
    color: string;
    role?: "trim-brass" | "emissive" | "stone-dark";
  }[];
}

/**
 * Continuous supported card plane at y≈0.36 plus irregular flag paving.
 * Joints expose the base slab at 0.324, still inside the validator tolerance.
 */
export function buildArenaCourtyard(model: Authoring, style: CourtyardStyle): void {
  const { seed, halfX, halfZ, baseColor, stoneColors, fractureColor, inlays } =
    style;
  model.add(
    "courtyard",
    "stone-pale",
    flag(
      [
        [-(halfX + 0.04), -(halfZ + 0.04)],
        [halfX + 0.04, -(halfZ + 0.04)],
        [halfX + 0.04, halfZ + 0.04],
        [-(halfX + 0.04), halfZ + 0.04],
      ],
      0.324,
      0.2,
      0.012,
    ),
    baseColor,
  );
  const rng = random(seed),
    seeds: Vector2[] = [];
  const rows: number[] = [];
  for (let z = -(halfZ - 0.25); z <= halfZ - 0.25; z += 1.45) rows.push(z);
  for (let row = 0; row < rows.length; row += 1) {
    let x = -halfX + rng() * 0.55;
    while (x < halfX) {
      seeds.push(new Vector2(x, rows[row]! + (rng() - 0.5) * 0.7));
      x += 0.95 + rng() * 1.49;
    }
  }
  for (const [x, z] of [
    [-(halfX - 0.4), -(halfZ - 1.1)],
    [halfX - 0.9, halfZ - 0.5],
    [-(halfX - 1.3), halfZ - 1.4],
    [halfX - 0.4, -1.9],
    [-(halfX - 4.3), -(halfZ - 0.5)],
  ])
    seeds.push(new Vector2(x, z));
  for (const polygon of clippedVoronoi(seeds, [-halfX, -halfZ, halfX, halfZ])) {
    if (!polygon.length) continue;
    const cx = polygon.reduce((n, p) => n + p[0], 0) / polygon.length,
      cz = polygon.reduce((n, p) => n + p[1], 0) / polygon.length;
    const inset = polygon.map(([x, z]): [number, number] => {
      const d = Math.hypot(x - cx, z - cz) || 1;
      return [x + ((cx - x) * 0.012) / d, z + ((cz - z) * 0.012) / d];
    });
    const geometry = flag(inset, 0.358 + rng() * 0.002, 0.319, 0.012);
    colorize(
      geometry,
      stoneColors[Math.floor(rng() * stoneColors.length)]!,
      0.055,
    );
    model.add("courtyard", "stone-pale", geometry);
  }
  const fractures: Point[][] = [
    [
      [-(halfX - 0.4), 0.3605, -3.1],
      [-(halfX - 0.9), 0.3605, -2.92],
      [-(halfX - 1.05), 0.3605, -2.51],
      [-(halfX - 1.3), 0.3605, -2.36],
    ],
    [
      [halfX - 2.4, 0.3605, halfZ - 0.6],
      [halfX - 2.7, 0.3605, halfZ - 1.04],
      [halfX - 2.6, 0.3605, halfZ - 1.33],
    ],
    [
      [-2.8, 0.3605, -(halfZ - 0.2)],
      [-2.43, 0.3605, -(halfZ - 0.54)],
      [-2.56, 0.3605, -(halfZ - 0.87)],
    ],
    [
      [halfX - 0.4, 0.3605, 1.0],
      [halfX - 0.87, 0.3605, 1.11],
      [halfX - 1.13, 0.3605, 0.83],
    ],
  ];
  for (const fracture of fractures)
    model.add(
      "courtyard",
      "stone-dark",
      sweep(fracture, [0.004, 0.003, 0.001], 10, 3),
      fractureColor,
    );
  for (const inlay of inlays ?? []) {
    if (inlay.kind === "line") {
      const length = inlay.length ?? 1.6;
      model.add(
        "courtyard",
        inlay.role ?? "trim-brass",
        flag(
          [
            [inlay.x - length / 2, inlay.z - 0.035],
            [inlay.x + length / 2, inlay.z - 0.035],
            [inlay.x + length / 2, inlay.z + 0.035],
            [inlay.x - length / 2, inlay.z + 0.035],
          ],
          0.3615,
          0.352,
          0.004,
          1.2,
        ),
        inlay.color,
      );
    } else {
      const radius = inlay.radius ?? 0.42;
      const pts: Point[] = Array.from({ length: 25 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return [
          inlay.x + Math.cos(a) * radius,
          0.3615,
          inlay.z + Math.sin(a) * radius,
        ];
      });
      model.add(
        "courtyard",
        inlay.role ?? "trim-brass",
        sweep(pts, [0.02, 0.02], 48, 4),
        inlay.color,
      );
    }
  }
}
