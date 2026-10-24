import { Box3, Matrix4 } from "three";
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

export const cinderFoundryParameters = {
  version: "cinder-authored-1",
  seed: 511026,
  theme:
    "Iron foundry: dark masonry blast walls, twin lava channels, corner furnace stacks, overhead iron piping, a broken crucible gantry and slag berms.",
  playable: { min: [-6.4, 0.36, -3.8], max: [6.4, 0.36, 3.8] },
};

export const cinderFoundryPalette: RolePalette = {
  "stone-pale": { color: "#ffffff", roughness: 0.72, metalness: 0.35 },
  "stone-dark": { color: "#ffffff", roughness: 0.8, metalness: 0.4 },
  "trim-brass": { color: "#ffffff", roughness: 0.4, metalness: 0.8 },
  metal: { color: "#ffffff", roughness: 0.55, metalness: 0.85 },
  emissive: {
    color: "#ffffff",
    roughness: 0.4,
    metalness: 0.1,
    emissive: "#ff570c",
    emissiveIntensity: 1.7,
  },
};

/** Texture-free runtime material specs; albedo lives in baked vertex colours. */
export const cinderFoundryMaterials = {
  "stone-pale": { roughness: 0.72, metalness: 0.35 },
  "stone-dark": { roughness: 0.8, metalness: 0.4 },
  "trim-brass": { roughness: 0.4, metalness: 0.8 },
  metal: { roughness: 0.55, metalness: 0.85 },
  emissive: { emissiveIntensity: 1.7, roughness: 0.4 },
};

const iron = ["#8a8590", "#95909c", "#a08b84", "#8f8a96"],
  ironDark = ["#32303a", "#2a2833", "#37343f"];

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
  variation = 0.08,
  bevel = 0.05,
  yaw = 0,
): void {
  const polygon: Polygon = [
    [cx - w / 2, cz - d / 2],
    [cx + w / 2, cz - d / 2],
    [cx + w / 2, cz + d / 2],
    [cx - w / 2, cz + d / 2],
  ];
  const transform = yaw
    ? new Matrix4()
        .makeTranslation(cx, 0, cz)
        .multiply(new Matrix4().makeRotationY(yaw))
        .multiply(new Matrix4().makeTranslation(-cx, 0, -cz))
    : undefined;
  model.add(
    landmark,
    role,
    flag(
      polygon.map(([x, z]) => [x, z] as [number, number]),
      cy + h / 2,
      cy - h / 2,
      bevel,
    ),
    color,
    variation,
    transform,
  );
}

function furnaceStack(
  model: Authoring,
  x: number,
  z: number,
  height: number,
  facing: number,
  quality: Quality,
): void {
  const high = quality === "high";
  // Plinth sits fully beyond the playable rect (z-extent outside ±3.8).
  box(model, "furnace-towers", "stone-dark", x, 0.35, z, 1.7, 0.5, 1.95, "#2a2833", 0.1, 0.09);
  const courses = high ? 7 : 5;
  for (let i = 0; i < courses; i += 1) {
    const t = i / (courses - 1),
      w = 1.45 - t * 0.5,
      d = 1.7 - t * 0.55,
      y0 = 0.6 + (height - 0.6) * (i / courses),
      y1 = 0.6 + (height - 0.6) * ((i + 1) / courses);
    box(
      model,
      "furnace-towers",
      i % 2 ? "stone-pale" : "stone-dark",
      x,
      (y0 + y1) / 2,
      z,
      w,
      y1 - y0,
      d,
      i % 2 ? iron[i % iron.length]! : ironDark[i % ironDark.length]!,
      0.09,
      0.05,
    );
  }
  // Glowing tap-mouth on the courtyard-facing side.
  const mx = x + facing * 0.72;
  box(model, "furnace-towers", "emissive", mx, 0.95, z, 0.06, 0.9, 0.72, "#ff8c3a", 0, 0.01);
  // Bronze lintel and side braces around the mouth.
  box(model, "furnace-towers", "trim-brass", mx + facing * 0.02, 1.45, z, 0.12, 0.16, 0.86, "#cb6e35", 0.05, 0.02);
  for (const dz of [-0.44, 0.44])
    box(model, "furnace-towers", "trim-brass", mx, 0.95, z + dz, 0.1, 0.94, 0.1, "#c2652e", 0.04, 0.02);
  // Chimney cap and exhaust plume.
  box(model, "furnace-towers", "stone-dark", x, height + 0.2, z, 0.95, 0.32, 1.05, "#26232c", 0.08, 0.05);
  model.add(
    "furnace-towers",
    "emissive",
    sweep(
      [
        [x, height + 0.36, z],
        [x + 0.07, height + 0.9, z - 0.05],
        [x - 0.06, height + 1.45, z + 0.04],
        [x + 0.03, height + 1.9, z],
      ],
      [0.19, 0.13, 0.07, 0.01],
      high ? 22 : 12,
      7,
    ),
    "#ff9a4a",
    0,
  );
  // Iron ladder rungs up the outer face.
  const lx = x - facing * 0.74;
  for (let i = 0; i < (high ? 7 : 4); i += 1)
    box(model, "furnace-towers", "metal", lx, 0.85 + i * 0.42, z, 0.09, 0.05, 0.42, "#4a5560", 0.03, 0.01);
}

export function buildCinderFoundry(quality: Quality) {
  const model = new Authoring("cinder-foundry", cinderFoundryPalette);
  const high = quality === "high",
    rng = random(cinderFoundryParameters.seed);

  buildArenaCourtyard(model, {
    seed: cinderFoundryParameters.seed,
    halfX: 7.05,
    halfZ: 5.15,
    baseColor: "#3a3742",
    stoneColors: ["#4a4652", "#524d5a", "#443f4c", "#565060", "#4e4956"],
    fractureColor: "#ff6a20",
    inlays: [
      {
        kind: "line",
        x: 0,
        z: 0,
        length: 11.6,
        color: "#6a5240",
        role: "stone-dark",
      },
    ],
  });

  // Perimeter blast masonry: stepped ramparts beyond the playable rect.
  for (const side of [-1, 1]) {
    for (let row = 0; row < 2; row += 1) {
      let z = -7.6;
      while (z < 7.8) {
        const length = 0.9 + rng() * 1.5,
          height = 0.55 + row * 0.32 + rng() * 0.22,
          x = side * (7.4 + row * 0.62 + (rng() - 0.5) * 0.16);
        box(
          model,
          "boundary-masonry",
          row ? "stone-dark" : "stone-pale",
          x,
          0.3 + height / 2,
          z + length / 2,
          0.7 + rng() * 0.28,
          height,
          length,
          row ? ironDark[Math.floor(rng() * 3)]! : iron[Math.floor(rng() * 4)]!,
          0.12,
          0.05,
        );
        z += length + 0.06 + rng() * 0.14;
      }
    }
    // End walls with crenellations.
    for (const end of [-1, 1]) {
      let x = -7.4;
      while (x < 7.5) {
        const width = 0.85 + rng() * 1.4,
          height = 0.6 + rng() * 0.3;
        box(
          model,
          "boundary-masonry",
          "stone-pale",
          x + width / 2,
          0.3 + height / 2,
          end * (5.5 + (rng() - 0.5) * 0.2),
          width,
          height,
          0.75,
          iron[Math.floor(rng() * 4)]!,
          0.11,
          0.05,
        );
        if (rng() > 0.4)
          box(
            model,
            "boundary-masonry",
            "stone-dark",
            x + width / 2,
            0.3 + height + 0.22,
            end * 5.5,
            width * 0.45,
            0.44,
            0.5,
            ironDark[Math.floor(rng() * 3)]!,
            0.1,
            0.04,
          );
        x += width + 0.05 + rng() * 0.12;
      }
    }
  }

  // Twin lava channels along both flanks (all vertices beyond |x|≥6.45).
  for (const side of [-1, 1]) {
    const x = side * 6.8;
    // Trough walls.
    for (const inner of [true, false]) {
      const wx = side * (inner ? 6.6 : 7.0);
      model.add(
        "lava-channels",
        "stone-dark",
        patch(2, high ? 42 : 22, (u, v) => {
          const z = -7.8 + v * 15.6;
          return [
            wx + (u - 0.5) * 0.3,
            0.5 + Math.sin(z * 1.7 + u) * 0.05 + (inner ? 0.14 : 0),
            z,
          ];
        }),
        "#32303a",
        0.1,
      );
    }
    // Molten lava surface.
    model.add(
      "lava-channels",
      "emissive",
      patch(high ? 6 : 4, high ? 44 : 24, (u, v) => {
        const z = -7.8 + v * 15.6;
        return [
          x + (u - 0.5) * 0.34,
          0.44 + Math.sin(z * 5.5 + u * 4) * 0.014,
          z,
        ];
      }),
      "#ff7a28",
      0.14,
    );
    // Iron grate cross-bars.
    for (let z = -7.4; z < 7.7; z += 0.5)
      box(model, "lava-channels", "metal", x, 0.62, z, 0.44, 0.07, 0.11, "#4a5560", 0.04, 0.015);
    // Bronze spill lips with outer glow cascades.
    for (const z of [-4.6, -1.2, 2.4, 5.4]) {
      box(model, "lava-channels", "trim-brass", side * 6.8, 0.72, z, 0.5, 0.14, 0.5, "#cb6e35", 0.06, 0.03);
      model.add(
        "lava-channels",
        "emissive",
        patch(3, 5, (u, v) => [
          side * (7.0 + u * 0.06),
          0.68 - v * 0.3,
          z - 0.2 + u * 0.4,
        ]),
        "#ff8c3a",
        0.1,
      );
    }
  }

  // Four furnace stacks at the corners (z beyond ±3.82 so inner faces stay legal).
  for (const side of [-1, 1]) {
    furnaceStack(model, side * 7, -4.9, 3.5, -side, quality);
    furnaceStack(model, side * 7, 4.9, 2.5, -side, quality);
  }

  // Overhead iron piping with bronze collars along both flanks.
  for (const side of [-1, 1]) {
    const x = side * 7.05;
    model.add(
      "iron-piping",
      "metal",
      sweep(
        [
          [x, 0.4, 6.2],
          [x - side * 0.12, 1.5, 3.6],
          [x + side * 0.1, 1.5, -0.4],
          [x - side * 0.08, 0.5, -3.2],
          [x, 0.4, -6.2],
        ],
        [0.17, 0.16, 0.16, 0.16, 0.17],
        high ? 60 : 30,
        8,
        1,
        0.05,
        2,
      ),
      "#4a5560",
      0.06,
    );
    for (const z of [-4.4, -2, 0.4, 2.8, 5.2])
      model.add(
        "iron-piping",
        "trim-brass",
        sweep(
          [
            [x, 1.5, z - 0.08],
            [x, 1.56, z],
            [x, 1.5, z + 0.08],
          ],
          [0.24, 0.26, 0.24],
          8,
          8,
        ),
        "#cb6e35",
        0.04,
      );
  }

  // Slag / clinker berms hugging the outer walls.
  for (const side of [-1, 1])
    for (const end of [-1, 1])
      for (let i = 0; i < (high ? 7 : 4); i += 1) {
        const x = side * (8.2 + rng() * 1.4),
          z = end * (4.2 + rng() * 2.4);
        model.add(
          "slag-berms",
          "stone-dark",
          patch(high ? 8 : 5, high ? 8 : 5, (u, v) => {
            const r = Math.hypot(u - 0.5, v - 0.5) * 2;
            return [
              x + (u - 0.5) * (1.4 + rng() * 0.6),
              0.28 + Math.max(0, 0.42 * (1 - r)) + rng() * 0.02,
              z + (v - 0.5) * (1.2 + rng() * 0.5),
            ];
          }),
          rng() > 0.5 ? "#32303a" : "#3d3a45",
          0.16,
        );
      }

  // Broken crucible gantry spanning the north edge (safe: all |z|≥3.8).
  const gz = -5.7;
  for (const x of [-8.2, 8.2]) {
    box(model, "crucible-gantry", "stone-dark", x, 1.4, gz, 0.9, 2.8, 0.9, "#2a2833", 0.1, 0.06);
    box(model, "crucible-gantry", "trim-brass", x, 2.75, gz, 1.05, 0.22, 1.05, "#cb6e35", 0.05, 0.03);
  }
  for (const zOff of [-0.32, 0.32])
    model.add(
      "crucible-gantry",
      "metal",
      sweep(
        [
          [-8.2, 2.9, gz + zOff],
          [-4, 3.15, gz + zOff],
          [0, 3.05, gz + zOff],
          [4, 3.2, gz + zOff],
          [8.2, 2.9, gz + zOff],
        ],
        [0.14, 0.13, 0.13, 0.13, 0.14],
        high ? 54 : 26,
        6,
      ),
      "#4a5560",
      0.05,
    );
  // Suspended crucible with a lava pour.
  box(model, "crucible-gantry", "metal", -1.4, 2.35, gz, 0.85, 0.7, 0.85, "#3d4750", 0.07, 0.05, 0.2);
  model.add(
    "crucible-gantry",
    "emissive",
    patch(4, 6, (u, v) => [
      -1.4 + (u - 0.5) * 0.4,
      2.0 - v * 2.4,
      gz + (Math.sin(v * 6) * 0.05) + (u - 0.5) * 0.1,
    ]),
    "#ff7a28",
    0.1,
  );
  model.add(
    "crucible-gantry",
    "emissive",
    sweep(
      [
        [-1.4, 2.0, gz],
        [-1.42, 1.2, gz + 0.03],
        [-1.38, 0.5, gz],
      ],
      [0.16, 0.11, 0.05],
      high ? 18 : 10,
      6,
    ),
    "#ff8c3a",
    0,
  );
  box(model, "crucible-gantry", "emissive", -1.4, 0.42, gz, 0.7, 0.06, 0.7, "#ff6a20", 0.12, 0.01);

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
      const box3 = new Box3().setFromObject(group);
      return {
        name: group.name,
        bounds: { min: box3.min.toArray(), max: box3.max.toArray() },
      };
    }),
  };
}
