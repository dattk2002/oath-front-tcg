import { Box3 } from "three";
import {
  Authoring,
  flag,
  patch,
  random,
  sweep,
  type Polygon,
  type RolePalette,
} from "./geometry.js";
import { buildArenaCourtyard } from "./courtyard-base.js";
import type { Quality } from "./moonroot.js";

export const glasswaterParameters = {
  version: "glasswater-authored-1",
  seed: 733019,
  theme:
    "Pale waterside sanctum: marble terraces, a flanking colonnade, reflecting basins and clustered crystal spires.",
  playable: { min: [-6.4, 0.36, -3.8], max: [6.4, 0.36, 3.8] },
};

export const glasswaterPalette: RolePalette = {
  "stone-pale": { color: "#ffffff", roughness: 0.88, metalness: 0.05 },
  "stone-dark": { color: "#ffffff", roughness: 0.82, metalness: 0.1 },
  "trim-brass": { color: "#ffffff", roughness: 0.36, metalness: 0.75 },
  water: {
    color: "#ffffff",
    roughness: 0.14,
    metalness: 0.42,
    opacity: 0.85,
  },
  crystal: { color: "#ffffff", roughness: 0.24, metalness: 0.14 },
  emissive: {
    color: "#ffffff",
    roughness: 0.32,
    metalness: 0.1,
    emissive: "#22b8d8",
    emissiveIntensity: 1.4,
  },
};

export const glasswaterMaterials = {
  "stone-pale": { roughness: 0.88, metalness: 0.05 },
  "stone-dark": { roughness: 0.82, metalness: 0.1 },
  "trim-brass": { roughness: 0.36, metalness: 0.75 },
  water: { roughness: 0.14, metalness: 0.42, opacity: 0.85, transparent: true },
  crystal: { roughness: 0.24, metalness: 0.14 },
  emissive: { emissiveIntensity: 1.4, roughness: 0.32 },
};

const pale = ["#c2d2d4", "#cdd9da", "#bacace", "#c8d6d6"],
  teal = "#8fd4d0",
  crystalColors = ["#8fe6f5", "#a6eefb", "#7bdcef"];

function box(
  model: Authoring,
  landmark: string,
  role: Parameters<Authoring["add"]>[1],
  cx: number,
  cy: number,
  cz: number,
  w: number,
  h: number,
  d: number,
  color: string,
  variation = 0.07,
  bevel = 0.05,
): void {
  const polygon: Polygon = [
    [cx - w / 2, cz - d / 2],
    [cx + w / 2, cz - d / 2],
    [cx + w / 2, cz + d / 2],
    [cx - w / 2, cz + d / 2],
  ];
  model.add(
    landmark,
    role,
    flag(polygon, cy + h / 2, cy - h / 2, bevel),
    color,
    variation,
  );
}

function column(
  model: Authoring,
  x: number,
  z: number,
  height: number,
  quality: Quality,
): void {
  const high = quality === "high";
  box(model, "colonnade", "stone-dark", x, 0.35, z, 0.98, 0.26, 0.98, "#5d7688", 0.06, 0.06);
  box(model, "colonnade", "trim-brass", x, 0.53, z, 0.8, 0.12, 0.8, "#d3b676", 0.04, 0.03);
  model.add(
    "colonnade",
    "stone-pale",
    sweep(
      [
        [x, 0.59, z],
        [x, 0.59 + height * 0.5, z],
        [x, 0.59 + height, z],
      ],
      [0.3, 0.26, 0.24],
      high ? 22 : 12,
      high ? 16 : 10,
    ),
    "#c2d2d4",
    0.04,
  );
  for (const y of [0.66, height + 0.5])
    box(model, "colonnade", "trim-brass", x, y, z, 0.52, 0.12, 0.52, "#c9ab6c", 0.04, 0.02);
  box(model, "colonnade", "stone-pale", x, height + 0.64, z, 0.86, 0.2, 0.86, "#cdd9da", 0.05, 0.04);
}

function spire(
  model: Authoring,
  x: number,
  z: number,
  height: number,
  tilt: number,
  role: "crystal" | "emissive",
  color: string,
  quality: Quality,
): void {
  const high = quality === "high";
  model.add(
    "crystal-spires",
    role,
    sweep(
      [
        [x, 0.34, z],
        [x + tilt * 0.3, 0.34 + height * 0.5, z + tilt * 0.22],
        [x + tilt * 0.62, 0.34 + height, z + tilt * 0.44],
      ],
      [0.17, 0.115, 0.008],
      high ? 16 : 9,
      5,
    ),
    color,
    0.05,
  );
}

export function buildGlasswaterSanctum(quality: Quality) {
  const model = new Authoring("glasswater-sanctum", glasswaterPalette);
  const high = quality === "high",
    rng = random(glasswaterParameters.seed);

  buildArenaCourtyard(model, {
    seed: glasswaterParameters.seed,
    halfX: 7.15,
    halfZ: 5.25,
    baseColor: "#a9bcbe",
    stoneColors: pale,
    fractureColor: "#7d99a2",
    inlays: [
      { kind: "line", x: 0, z: 0, length: 12.2, color: "#d3b676", role: "trim-brass" },
      { kind: "ring", x: 0, z: 0, radius: 0.55, color: "#d3b676", role: "trim-brass" },
      ...[1, 2, 3, 4, 5].map((lane) => ({
        kind: "ring" as const,
        x: (lane - 3) * 2.4,
        z: 0,
        radius: 0.34,
        color: "#22b8d8",
        role: "emissive" as const,
      })),
    ],
  });

  // Terrace balustrades along the ends and low coping along the flanks.
  for (const end of [-1, 1]) {
    let x = -7.2;
    while (x < 7.3) {
      const width = 0.9 + rng() * 1.4,
        height = 0.42 + rng() * 0.2;
      box(
        model,
        "boundary-masonry",
        "stone-pale",
        x + width / 2,
        0.3 + height / 2,
        end * (5.55 + (rng() - 0.5) * 0.16),
        width,
        height,
        0.72,
        pale[Math.floor(rng() * 4)]!,
        0.09,
        0.05,
      );
      // Balusters.
      for (let b = 0; b < 2; b += 1)
        model.add(
          "boundary-masonry",
          "stone-pale",
          sweep(
            [
              [x + width * (0.28 + b * 0.44), 0.3 + height, end * 5.55],
              [x + width * (0.28 + b * 0.44), 0.55 + height, end * 5.55],
              [x + width * (0.28 + b * 0.44), 0.72 + height, end * 5.55],
            ],
            [0.06, 0.045, 0.06],
            6,
            8,
          ),
          "#cdd9da",
          0.04,
        );
      if (rng() > 0.5)
        box(
          model,
          "boundary-masonry",
          "trim-brass",
          x + width / 2,
          0.3 + height + 0.06,
          end * 5.55,
          width * 0.9,
          0.1,
          0.5,
          "#d3b676",
          0.04,
          0.02,
        );
      x += width + 0.05 + rng() * 0.12;
    }
  }

  // Flanking colonnade: columns at |x|≥6.5 so any z is legal.
  for (const side of [-1, 1]) {
    const x = side * 7;
    for (const z of [-3.9, -1.3, 1.3, 3.9])
      column(model, x, z, z < 0 ? 2.15 : 0.95, quality);
    // Architrave linking the tall northern columns.
    model.add(
      "colonnade",
      "stone-pale",
      sweep(
        [
          [x, 2.85, -4.4],
          [x, 2.95, -2.6],
          [x, 2.95, -0.9],
        ],
        [0.2, 0.19, 0.18],
        high ? 24 : 12,
        6,
      ),
      "#c8d6d6",
      0.04,
    );
  }

  // Reflecting basins along both flanks (|x|≥6.44).
  for (const side of [-1, 1]) {
    const x = side * 6.68;
    for (const inner of [true, false]) {
      const wx = side * (inner ? 6.55 : 6.82);
      model.add(
        "water-basins",
        "stone-pale",
        patch(2, high ? 40 : 20, (u, v) => {
          const z = -7 + v * 14;
          return [
            wx + (u - 0.5) * 0.22,
            0.5 + Math.sin(z * 1.3 + u) * 0.03 + (inner ? 0.08 : 0),
            z,
          ];
        }),
        "#b7c9cb",
        0.08,
      );
    }
    model.add(
      "water-basins",
      "water",
      patch(high ? 6 : 4, high ? 36 : 18, (u, v) => {
        const z = -7 + v * 14;
        return [
          x + (u - 0.5) * 0.26,
          0.44 + Math.sin(z * 4 + u * 3) * 0.008,
          z,
        ];
      }),
      teal,
      0.1,
    );
    for (const z of [-4.2, 0, 4.2]) {
      box(model, "water-basins", "trim-brass", side * 6.68, 0.6, z, 0.36, 0.12, 0.42, "#d3b676", 0.05, 0.02);
      model.add(
        "water-basins",
        "water",
        patch(3, 5, (u, v) => [
          side * (6.82 + u * 0.05),
          0.56 - v * 0.24,
          z - 0.16 + u * 0.32,
        ]),
        "#a8ddd8",
        0.08,
      );
    }
  }

  // Crystal spire clusters at the outer corners.
  const clusters: [number, number][] = [
    [-7.4, -4.5],
    [7.4, -4.5],
    [-7.4, 4.5],
    [7.4, 4.5],
  ];
  for (const [cx, cz] of clusters) {
    const count = high ? 6 : 4;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2,
        r = 0.3 + rng() * 0.5;
      spire(
        model,
        cx + Math.cos(a) * r,
        cz + Math.sin(a) * r,
        1.1 + rng() * 1.4,
        (rng() - 0.5) * 0.6,
        i % 3 === 0 ? "emissive" : "crystal",
        i % 3 === 0 ? "#22d8f0" : crystalColors[i % 3]!,
        quality,
      );
    }
    // Crystal base plinth.
    box(model, "crystal-spires", "stone-dark", cx, 0.4, cz, 1.5, 0.16, 1.5, "#547082", 0.07, 0.05);
  }
  // One tall central-eastern formation for silhouette depth.
  for (let i = 0; i < (high ? 4 : 3); i += 1)
    spire(
      model,
      7.9 + i * 0.24,
      -0.6 + i * 0.5,
      2.2 + i * 0.55,
      (i - 1) * 0.2,
      i === 1 ? "emissive" : "crystal",
      i === 1 ? "#22d8f0" : "#8fe6f5",
      quality,
    );

  const scene = model.finish();
  scene.userData = {
    authored: true,
    quality,
    surfaceY: 0.36,
    playableMin: [-6.4, -3.8],
    playableMax: [6.4, 3.8],
  };
  const bounds = new Box3().setFromObject(scene);
  return {
    scene,
    bounds,
    landmarks: scene.children.map((group) => {
      const b = new Box3().setFromObject(group);
      return { name: group.name, bounds: { min: b.min.toArray(), max: b.max.toArray() } };
    }),
  };
}
