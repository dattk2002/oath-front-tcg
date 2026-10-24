import { Box3, Matrix4 } from "three";
import {
  Authoring,
  archStone,
  flag,
  patch,
  random,
  sweep,
  type Point,
  type Polygon,
  type RolePalette,
} from "./geometry.js";
import { buildArenaCourtyard } from "./courtyard-base.js";
import type { Quality } from "./moonroot.js";

export const astralParameters = {
  version: "astral-authored-1",
  seed: 919047,
  theme:
    "Broken celestial causeway: slate paving with star-chart inlays, shattered edge architecture, armillary instruments and a fractured star portal.",
  playable: { min: [-6.4, 0.36, -3.8], max: [6.4, 0.36, 3.8] },
};

export const astralPalette: RolePalette = {
  "stone-pale": { color: "#ffffff", roughness: 0.8, metalness: 0.12 },
  "stone-dark": { color: "#ffffff", roughness: 0.86, metalness: 0.14 },
  "trim-brass": { color: "#ffffff", roughness: 0.4, metalness: 0.72 },
  metal: { color: "#ffffff", roughness: 0.5, metalness: 0.7 },
  emissive: {
    color: "#ffffff",
    roughness: 0.34,
    metalness: 0.1,
    emissive: "#7a5cff",
    emissiveIntensity: 1.5,
  },
};

export const astralMaterials = {
  "stone-pale": { roughness: 0.8, metalness: 0.12 },
  "stone-dark": { roughness: 0.86, metalness: 0.14 },
  "trim-brass": { roughness: 0.4, metalness: 0.72 },
  metal: { roughness: 0.5, metalness: 0.7 },
  emissive: { emissiveIntensity: 1.5, roughness: 0.34 },
};

const slate = ["#6f688a", "#7a7494", "#665f80"],
  voidStone = ["#2a2940", "#232236", "#302f48"],
  starlight = "#b99aff";

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
    flag(polygon, cy + h / 2, cy - h / 2, bevel),
    color,
    variation,
    transform,
  );
}

/** Tilted armillary ring; center placed so every vertex keeps |x|≥6.6. */
function ring(
  model: Authoring,
  cx: number,
  cy: number,
  cz: number,
  radius: number,
  tiltX: number,
  tiltZ: number,
  color: string,
  quality: Quality,
): void {
  const high = quality === "high",
    steps = high ? 33 : 18;
  const pts: Point[] = Array.from({ length: steps }, (_, i) => {
    const a = (i / (steps - 1)) * Math.PI * 2;
    const x = Math.cos(a) * radius,
      z0 = Math.sin(a) * radius;
    const y2 = -z0 * Math.sin(tiltX),
      z2 = z0 * Math.cos(tiltX);
    const x3 = x * Math.cos(tiltZ) - y2 * Math.sin(tiltZ),
      y3 = x * Math.sin(tiltZ) + y2 * Math.cos(tiltZ);
    return [cx + x3, cy + y3, cz + z2];
  });
  model.add(
    "orbital-instruments",
    "trim-brass",
    sweep(pts, [0.05, 0.05], high ? 48 : 24, 5),
    color,
    0.03,
  );
}

export function buildAstralCauseway(quality: Quality) {
  const model = new Authoring("astral-causeway", astralPalette);
  const high = quality === "high",
    rng = random(astralParameters.seed);

  buildArenaCourtyard(model, {
    seed: astralParameters.seed,
    halfX: 7.15,
    halfZ: 5.25,
    baseColor: "#4a4566",
    stoneColors: slate,
    fractureColor: "#3a3556",
    inlays: [
      { kind: "line", x: 0, z: 0, length: 12.4, color: "#b9a16e", role: "trim-brass" },
      ...[1, 2, 3, 4, 5].flatMap((lane) => [
        { kind: "line" as const, x: (lane - 3) * 2.4, z: 0, length: 6.2, color: "#8f86b8", role: "stone-dark" as const },
        { kind: "ring" as const, x: (lane - 3) * 2.4, z: -2.05, radius: 0.28, color: "#b99aff", role: "emissive" as const },
        { kind: "ring" as const, x: (lane - 3) * 2.4, z: 2.05, radius: 0.28, color: "#b99aff", role: "emissive" as const },
      ]),
      { kind: "ring", x: 0, z: 0, radius: 0.6, color: "#b9a16e", role: "trim-brass" },
    ],
  });

  // Shattered edge architecture: fallen drums and collapsed fragments.
  for (const side of [-1, 1]) {
    for (let i = 0; i < (high ? 9 : 5); i += 1) {
      const x = side * (6.9 + rng() * 1.6),
        z = -5 + rng() * 10,
        fallen = rng() > 0.4;
      if (fallen)
        // Toppled column drum lying on its side.
        model.add(
          "boundary-masonry",
          "stone-pale",
          sweep(
            [
              [x - 0.5, 0.5, z - 0.3],
              [x, 0.55, z],
              [x + 0.55, 0.5, z + 0.35],
            ],
            [0.3, 0.32, 0.28],
            10,
            high ? 12 : 8,
          ),
          slate[Math.floor(rng() * 3)]!,
          0.08,
        );
      else
        box(
          model,
          "boundary-masonry",
          rng() > 0.5 ? "stone-pale" : "stone-dark",
          x,
          0.35 + rng() * 0.35,
          z,
          0.7 + rng() * 0.6,
          0.5 + rng() * 0.7,
          0.7 + rng() * 0.5,
          rng() > 0.5 ? slate[Math.floor(rng() * 3)]! : voidStone[Math.floor(rng() * 3)]!,
          0.11,
          0.06,
          (rng() - 0.5) * 0.8,
        );
    }
    // Broken balustrade stubs along the long edges.
    for (let z = -3.2; z <= 3.2; z += 1.6)
      box(
        model,
        "boundary-masonry",
        "stone-dark",
        side * 6.85,
        0.5,
        z,
        0.55,
        0.4 + rng() * 0.5,
        0.5,
        voidStone[Math.floor(rng() * 3)]!,
        0.1,
        0.04,
      );
  }
  // End-wall rubble beyond the playable rect.
  for (const end of [-1, 1])
    for (let i = 0; i < (high ? 7 : 4); i += 1) {
      const x = -6 + rng() * 12;
      box(
        model,
        "boundary-masonry",
        "stone-pale",
        x,
        0.35 + rng() * 0.5,
        end * (5.4 + rng() * 1.4),
        0.8 + rng() * 0.9,
        0.5 + rng() * 0.9,
        0.7 + rng() * 0.5,
        slate[Math.floor(rng() * 3)]!,
        0.1,
        0.06,
        (rng() - 0.5) * 0.9,
      );
    }

  // Armillary instruments at the north corners (center |x|≥7.6 keeps rings legal).
  for (const side of [-1, 1]) {
    const x = side * 7.6,
      z = -4.4;
    box(model, "orbital-instruments", "stone-dark", x, 0.45, z, 1.1, 0.9, 1.1, "#2a2940", 0.08, 0.06);
    box(model, "orbital-instruments", "trim-brass", x, 0.95, z, 0.85, 0.14, 0.85, "#b9a16e", 0.04, 0.03);
    model.add(
      "orbital-instruments",
      "metal",
      sweep([[x, 1.0, z], [x, 1.9, z], [x, 2.4, z]], [0.12, 0.1, 0.09], 8, 8),
      "#8a86a8",
      0.04,
    );
    ring(model, x, 2.0, z, 0.66, 0.5, 0.3, "#b9a16e", quality);
    ring(model, x, 2.0, z, 0.5, 1.1, -0.2, "#c6ad7a", quality);
    ring(model, x, 2.0, z, 0.34, 0.2, 0.9, "#ad9663", quality);
    model.add(
      "orbital-instruments",
      "emissive",
      patch(3, 3, (u, v) => [
        x + (u - 1) * 0.28,
        2.0 + (v - 1) * 0.28,
        z + Math.sin(u * 3.1) * 0.05,
      ]),
      "#b99aff",
      0.05,
    );
  }

  // Broken column stumps along the flanks (|x|≥6.6).
  for (const side of [-1, 1])
    for (const z of [-2.6, -0.9, 0.9, 2.6]) {
      const h = 0.7 + rng() * 1.1;
      model.add(
        "shattered-plinths",
        "stone-pale",
        sweep(
          [
            [side * 7.0, 0.36, z],
            [side * 7.0, 0.36 + h * 0.6, z + 0.04],
            [side * 7.0, 0.36 + h, z - 0.03],
          ],
          [0.3, 0.27, 0.22],
          8,
          high ? 12 : 8,
        ),
        slate[Math.floor(rng() * 3)]!,
        0.07,
      );
      box(model, "shattered-plinths", "stone-dark", side * 7.0, 0.4, z, 0.72, 0.14, 0.72, "#2a2940", 0.06, 0.04);
      if (rng() > 0.5)
        box(
          model,
          "shattered-plinths",
          "trim-brass",
          side * 7.0,
          0.36 + h + 0.06,
          z,
          0.4,
          0.1,
          0.4,
          "#b9a16e",
          0.04,
          0.02,
        );
    }

  // Fractured star portal on the west edge (vertical ring at constant |x|).
  const portal = new Matrix4()
    .makeTranslation(-8.5, 1.9, 0)
    .multiply(new Matrix4().makeRotationY(Math.PI / 2));
  const segments = 12;
  for (let i = 0; i < segments; i += 1) {
    if (i === 3 || i === 8) continue;
    const step = (Math.PI * 2) / segments,
      start = i * step + 0.02,
      end = (i + 1) * step - 0.02;
    model.add(
      "star-portal",
      "stone-pale",
      archStone(1.6, i === 5 ? 2.35 : 2.1, start, end, 0, i === 5 ? 0.7 : 0.5, high ? 6 : 3),
      i % 2 ? "#6f688a" : "#7a7494",
      0.05,
      portal,
    );
    const a = (start + end) / 2;
    model.add(
      "star-portal",
      "emissive",
      sweep(
        [
          [Math.cos(a) * 1.85, Math.sin(a) * 1.85, 0.28],
          [Math.cos(a) * 1.85, Math.sin(a) * 1.85, 0.3],
        ],
        [0.03, 0.03],
        2,
        4,
      ),
      starlight,
      0,
      portal,
    );
  }
  box(model, "star-portal", "stone-dark", -8.5, 0.4, -2.3, 1.1, 0.8, 1.1, "#2a2940", 0.08, 0.06);
  box(model, "star-portal", "stone-dark", -8.5, 0.4, 2.3, 1.1, 0.8, 1.1, "#2a2940", 0.08, 0.06);

  // Scattered starlight motes in the far field (all outside the playable rect).
  const motes = high ? 40 : 18;
  for (let i = 0; i < motes; i += 1) {
    const angle = i * 2.399,
      r = 9.5 + (i % 4),
      size = 0.05 + (i % 3) * 0.02;
    box(
      model,
      "starlight-motes",
      "emissive",
      Math.cos(angle) * r,
      -0.5 + (i % 5) * 0.7,
      Math.sin(angle) * (7.5 + (i % 3)),
      size,
      size,
      size,
      starlight,
      0.1,
      0.005,
    );
  }

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
