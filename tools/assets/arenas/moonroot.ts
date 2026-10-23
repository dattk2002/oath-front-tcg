import { Box3, Matrix4 } from "three";
import { faceHeight, headWidth } from "./moonroot-sculpt.js";
import { buildMoonrootPlanting } from "./moonroot-planting.js";
import {
  buildMoonrootBanks,
  buildMoonrootCourtyard,
  buildMoonrootWater,
  moonrootSpills,
} from "./moonroot-terrain.js";
import {
  Authoring,
  archStone,
  flag,
  patch,
  sweep,
  type Point,
  type Polygon,
} from "./geometry.js";

export type Quality = "high" | "low";
export const moonrootParameters = {
  version: "moonroot-authored-3",
  seed: 231023,
  coordinateSystem: "Y-up; world units; courtyard origin [0,0,0]",
  playable: { min: [-6.4, 0.36, -3.8], max: [6.4, 0.36, 3.8] },
  laneX: [-4.8, -2.4, 0, 2.4, 4.8],
  sideZ: [-2.05, 2.05],
  surfaceY: 0.36,
  courtyard: {
    min: [-7.12, 0.2, -5.3],
    max: [7.12, 0.36, 5.3],
    jointWidth: 0.027,
    bevel: 0.013,
    flags:
      "Eight irregular courses with varied spacing and selected edge splits",
  },
  face: "Single continuous anatomical relief field: closed curved lids, recessed orbits, arched brow, tapered nasal bridge/alar wings, malar planes, philtrum, separated lips and broadened jaw. Low-frequency asymmetry is geometry; albedo is not displacement. Embedded in three irregular shrine courses with finer flowing carving.",
  arch: {
    center: [-8.43, 0, -2.4],
    yaw: 0.32,
    innerRadius: 1.07,
    outerRadius: 1.46,
    springY: 1.57,
    depth: 0.68,
    voussoirs: 13,
  },
  roots:
    "Authored branching Catmull–Rom paths, elliptical tapered sections, longitudinal carved furrows and buttress flares.",
  spillways: moonrootSpills,
  planting:
    "Seeded irregular fern beds with three height/spread forms and smaller folded evergreen leaves. Forty shallow curved groundcover cutouts use an independently authored 512px ivy/moss map outside the playable rectangle; they replace the small modeled ivy scatter. Roots, banks, ferns and stone retain actual silhouette and depth.",
  uv: "Ordinary UV0: world-projected stone; longitudinal bark; full 0..1 padded fern frond; channel-local water.",
};

const pale = "#c4ccc6",
  paleLight = "#d0d6d1";

function transformed(
  x: number,
  y: number,
  z: number,
  yaw = 0,
  tilt = 0,
): Matrix4 {
  return new Matrix4()
    .makeTranslation(x, y, z)
    .multiply(new Matrix4().makeRotationY(yaw))
    .multiply(new Matrix4().makeRotationX(tilt));
}

function arch(model: Authoring, quality: Quality): void {
  const transform = transformed(-8.43, 0, -2.4, 0.32);
  for (const sign of [-1, 1]) {
    for (let row = 0; row < 4; row += 1) {
      const x = sign * 1.265,
        y = 0.16 + row * 0.35;
      model.add(
        "arch-west",
        "stone-pale",
        flag(
          [
            [x - 0.225, -0.34],
            [x + 0.225, -0.34],
            [x + 0.225, 0.34],
            [x - 0.225, 0.34],
          ],
          y + 0.34,
          y,
          0.035,
        ),
        row % 2 ? pale : paleLight,
        0.06,
        transform,
      );
    }
    model.add(
      "arch-west",
      "stone-pale",
      flag(
        [
          [sign * 1.265 - 0.32, -0.44],
          [sign * 1.265 + 0.32, -0.44],
          [sign * 1.265 + 0.32, 0.44],
          [sign * 1.265 - 0.32, 0.44],
        ],
        0.22,
        0.02,
        0.07,
      ),
      "#aebba7",
      0.07,
      transform,
    );
    model.add(
      "arch-west",
      "stone-pale",
      flag(
        [
          [sign * 1.265 - 0.31, -0.4],
          [sign * 1.265 + 0.31, -0.4],
          [sign * 1.265 + 0.31, 0.4],
          [sign * 1.265 - 0.31, 0.4],
        ],
        1.59,
        1.42,
        0.035,
      ),
      paleLight,
      0.03,
      transform,
    );
  }
  for (let i = 0; i < 13; i += 1) {
    const step = Math.PI / 13,
      start = i * step + 0.007,
      end = (i + 1) * step - 0.007;
    model.add(
      "arch-west",
      "stone-pale",
      archStone(
        1.07,
        i === 6 ? 1.54 : 1.46,
        start,
        end,
        1.57,
        i === 6 ? 0.79 : 0.68,
        quality === "high" ? 7 : 4,
      ),
      i % 3 === 0 ? paleLight : pale,
      0.055,
      transform,
    );
    const angle = (start + end) / 2;
    const x = Math.cos(angle) * 1.272,
      y = 1.57 + Math.sin(angle) * 1.272;
    const rune: Point[] = [
      [x - Math.sin(angle) * 0.065, y + Math.cos(angle) * 0.065, 0.36],
      [x + Math.cos(angle) * 0.055, y + Math.sin(angle) * 0.055, 0.36],
      [x + Math.sin(angle) * 0.065, y - Math.cos(angle) * 0.065, 0.36],
    ];
    model.add(
      "arch-west",
      "emissive",
      sweep(rune, [0.012, 0.017, 0.012], 6, 4),
      "#a6c9b4",
      0,
      transform,
    );
  }
  for (const r of [1.105, 1.435]) {
    const arc: Point[] = Array.from({ length: 18 }, (_, i) => [
      Math.cos((i / 17) * Math.PI) * r,
      1.57 + Math.sin((i / 17) * Math.PI) * r,
      0.356,
    ]);
    model.add(
      "arch-west",
      "trim-brass",
      sweep(arc, [0.019, 0.019], quality === "high" ? 60 : 28, 5),
      "#d3cdad",
      0,
      transform,
    );
  }
  // Worn stepped sill surrounds, but never closes, the portal's water opening.
  for (const sign of [-1, 1]) {
    model.add(
      "arch-west",
      "stone-dark",
      flag(
        [
          [sign * 1.21 - 0.32, -0.65],
          [sign * 1.21 + 0.32, -0.65],
          [sign * 1.21 + 0.32, 0.88],
          [sign * 1.21 - 0.32, 0.88],
        ],
        0.23,
        -0.08,
        0.06,
      ),
      "#84927b",
      0.06,
      transform,
    );
  }
}

function statue(model: Authoring, quality: Quality): void {
  const transform = transformed(8.62, 1.75, -3.2, -0.53, -0.28);
  const columns = quality === "high" ? 116 : 66,
    rows = quality === "high" ? 140 : 80;
  // Crown-to-chin outline, integrated into a broad leaf-carved stone backing.
  model.add(
    "statue-east",
    "stone-pale",
    patch(
      columns,
      rows,
      (u, v) => {
        const y = 1.37 - v * 2.63 + 0.1 * v ** 14 * (2 * u - 1) ** 2;
        const x = (u - 0.5) * headWidth(y) * 2.28;
        return [x, y, faceHeight(x, y)];
      },
      (u, v) => [u * 0.7 + 0.15, 1 - v],
    ),
    "#c2ccc4",
    0.035,
    transform,
  );
  const wallCourses: Polygon[] = [
    [
      [-1.55, -1.55],
      [1.63, -1.51],
      [1.72, -0.79],
      [1.37, -0.6],
      [-1.49, -0.62],
    ],
    [
      [-1.47, -0.57],
      [1.61, -0.58],
      [1.67, 0.43],
      [1.4, 0.6],
      [-1.57, 0.55],
    ],
    [
      [-1.54, 0.59],
      [1.36, 0.64],
      [1.49, 1.14],
      [0.97, 1.66],
      [0.34, 1.63],
      [-0.17, 1.72],
      [-0.73, 1.46],
      [-1.49, 1.3],
    ],
  ];
  for (let row = 0; row < wallCourses.length; row += 1) {
    const wall = flag(
      wallCourses[row]!.map(([x, y]) => [x, -y]),
      0.035,
      -0.44,
      0.055,
    ).applyMatrix4(new Matrix4().makeRotationX(Math.PI / 2));
    model.add(
      "statue-east",
      "stone-pale",
      wall,
      ["#9ba99d", "#a6b1a6", "#abb7ab"][row]!,
      0.12,
      transform,
    );
  }
  // Shallow, varied flowing cuts belong to the stone wall and do not form a separate thick hair border.
  for (const side of [-1, 1]) {
    const count = side < 0 ? 5 : 4;
    for (let strand = 0; strand < count; strand += 1) {
      const off = strand * 0.07,
        asym = side < 0 ? 0.1 : -0.08;
      const path: Point[] = [
        [side * (0.2 + off * 1.9), 1.42 - off * 0.3, 0.18],
        [side * (0.76 + off), 1.02 + asym, 0.23],
        [side * (0.92 + off * 0.8), 0.45 + asym, 0.19],
        [side * (0.94 + off * 0.9), -0.18 - off, 0.17],
        [side * (0.72 + off), -0.84 - off * 0.6, 0.15],
        [side * (0.37 + off * 0.7), -1.16 - off * 0.35, 0.08],
      ];
      const carving = sweep(
        path,
        [0.028, 0.044, 0.041, 0.035, 0.025, 0.005],
        quality === "high" ? 35 : 20,
        quality === "high" ? 7 : 5,
      );
      const positions = carving.getAttribute("position");
      for (let i = 0; i < positions.count; i += 1)
        positions.setZ(i, 0.16 + (positions.getZ(i) - 0.16) * 0.58);
      carving.computeVertexNormals();
      model.add(
        "statue-east",
        "stone-pale",
        carving,
        strand % 2 ? "#b4c1b3" : "#c2cabc",
        0.05,
        transform,
      );
    }
    for (let leaf = 0; leaf < 3; leaf += 1) {
      const x = side * (1.05 + leaf * 0.07),
        y = 0.18 + leaf * 0.38;
      model.add(
        "statue-east",
        "stone-pale",
        patch(2, 8, (u, v) => {
          const t = 1 - v,
            width = 0.012 + Math.sin(t * Math.PI) * 0.19;
          return [
            x + side * t * 0.12 + (u - 0.5) * width,
            y + t * 0.35,
            0.12 +
              Math.sin(t * Math.PI) * 0.055 +
              (1 - Math.abs(u - 0.5) * 2) * 0.018,
          ];
        }),
        "#a9b8a6",
        0.04,
        transform,
      );
    }
  }
  // Filled crescent inlay follows the relief, with tapered tips rather than an open circular line.
  model.add(
    "statue-east",
    "trim-brass",
    patch(2, 30, (u, v) => {
      const t = 0.012 + v * 0.976,
        outer = 1.156 + t * 3.971,
        inner = 1.533 + t * 3.217;
      const ox = Math.cos(outer) * 0.19,
        oy = 0.97 + Math.sin(outer) * 0.19;
      const ix = 0.07 + Math.cos(inner) * 0.174,
        iy = 0.97 + Math.sin(inner) * 0.174;
      const x = ox * (1 - u) + ix * u,
        y = oy * (1 - u) + iy * u;
      return [x, y, faceHeight(x, y) + 0.012];
    }),
    "#d0c99d",
    0,
    transform,
  );
  // A broken shrine base links the carving to the channel wall and its large roots.
  model.add(
    "statue-east",
    "stone-pale",
    flag(
      [
        [7.43, -3.8],
        [9.67, -4.02],
        [9.9, -2.54],
        [7.55, -2.23],
      ],
      0.51,
      -0.12,
      0.14,
    ),
    "#a9b7a0",
    0.09,
  );
}

function roots(model: Authoring, quality: Quality): void {
  const high = quality === "high",
    sides = high ? 18 : 9,
    sections = high ? 39 : 23;
  const trees: { trunk: Point[]; roots: Point[][]; radius: number }[] = [
    {
      trunk: [
        [-8.15, 0.2, -6.25],
        [-8.48, 1.25, -6.47],
        [-8.19, 2.7, -6.72],
        [-8.55, 4.75, -6.95],
      ],
      radius: 0.66,
      roots: [
        [
          [-8.23, 0.83, -6.32],
          [-7.36, 0.43, -5.85],
          [-6.51, 0.28, -5.53],
          [-4.98, 0.33, -5.54],
          [-3.84, 0.34, -5.29],
        ],
        [
          [-8.4, 0.73, -6.38],
          [-8.09, 0.53, -5.06],
          [-7.48, 0.41, -4.05],
          [-7.19, 0.36, -2.6],
          [-7.26, 0.32, -1.13],
        ],
        [
          [-8.5, 0.8, -6.4],
          [-9.47, 0.4, -5.6],
          [-9.76, 0.3, -4.1],
          [-9.89, 0.24, -2.7],
        ],
      ],
    },
    {
      trunk: [
        [8.31, 0.21, -6.52],
        [8.02, 1.38, -6.75],
        [8.36, 2.85, -6.71],
        [8.17, 4.89, -7.17],
      ],
      radius: 0.72,
      roots: [
        [
          [8.23, 0.93, -6.61],
          [7.41, 0.5, -5.95],
          [6.38, 0.37, -5.51],
          [4.99, 0.34, -5.64],
          [3.82, 0.27, -5.31],
        ],
        [
          [8.28, 0.8, -6.56],
          [8.64, 0.5, -5.17],
          [9.18, 0.48, -4.41],
          [9.75, 0.4, -2.64],
          [9.63, 0.2, -1.42],
        ],
        [
          [8.0, 0.67, -6.68],
          [7.64, 0.54, -5.15],
          [7.37, 0.45, -3.93],
          [7.12, 0.33, -2.77],
        ],
      ],
    },
    {
      trunk: [
        [-9.55, 0.17, 5.8],
        [-10.0, 1.05, 6.4],
        [-10.48, 2.7, 6.8],
        [-10.64, 4.2, 7.1],
      ],
      radius: 0.6,
      roots: [
        [
          [-9.59, 0.73, 5.94],
          [-8.47, 0.4, 5.8],
          [-7.18, 0.36, 5.57],
          [-5.92, 0.33, 5.43],
          [-4.57, 0.29, 5.56],
        ],
        [
          [-9.6, 0.61, 5.82],
          [-9.43, 0.4, 4.53],
          [-9.72, 0.31, 3.22],
          [-9.38, 0.22, 1.99],
        ],
        [
          [-9.53, 0.63, 5.8],
          [-8.21, 0.31, 4.87],
          [-7.31, 0.31, 4.65],
          [-6.34, 0.31, 4.92],
        ],
      ],
    },
    {
      trunk: [
        [9.4, 0.16, 5.75],
        [9.88, 1.15, 6.26],
        [10.2, 2.9, 6.78],
        [10.47, 4.29, 7.0],
      ],
      radius: 0.59,
      roots: [
        [
          [9.41, 0.77, 5.81],
          [8.38, 0.48, 5.53],
          [7.29, 0.4, 5.5],
          [5.88, 0.33, 5.43],
          [4.61, 0.29, 5.16],
        ],
        [
          [9.43, 0.62, 5.79],
          [9.71, 0.35, 4.41],
          [9.43, 0.29, 3.3],
          [9.6, 0.23, 2.25],
        ],
        [
          [9.47, 0.57, 5.89],
          [8.35, 0.39, 4.58],
          [7.35, 0.35, 4.62],
          [6.43, 0.31, 4.95],
        ],
      ],
    },
  ];
  for (let ti = 0; ti < trees.length; ti += 1) {
    const tree = trees[ti]!;
    model.add(
      "root-banks",
      "bark",
      sweep(
        tree.trunk,
        [
          tree.radius * 1.35,
          tree.radius,
          tree.radius * 0.78,
          tree.radius * 0.64,
        ],
        sections,
        high ? 28 : 13,
        1,
        0.17,
        2.1,
      ),
      "#9ca48e",
      0.09,
    );
    for (let ri = 0; ri < tree.roots.length; ri += 1) {
      const points = tree.roots[ri]!;
      model.add(
        "root-banks",
        "bark",
        sweep(
          points,
          [tree.radius * 0.77, tree.radius * 0.56, 0.26, 0.115, 0.008],
          sections,
          sides,
          0.64,
          0.13,
          1.7,
        ),
        "#a6ad95",
        0.08,
      );
      const origin = points[2]!,
        destination = points[points.length - 1]!;
      const offshoot: Point[] = [
        origin,
        [
          origin[0] + (destination[0] - origin[0]) * 0.2,
          origin[1] - 0.025,
          origin[2] + (destination[2] - origin[2]) * 0.4,
        ],
        [
          destination[0] + (ti % 2 ? 0.37 : -0.37),
          0.25,
          destination[2] + (destination[2] < 0 ? -0.37 : 0.37),
        ],
      ];
      model.add(
        "root-banks",
        "bark",
        sweep(
          offshoot,
          [0.15, 0.1, 0.006],
          high ? 21 : 12,
          high ? 9 : 6,
          0.66,
          0.08,
          1.4,
        ),
        "#9eab8f",
        0.07,
      );
    }
  }
  // One old root embraces the arch crown and another runs behind the shrine.
  model.add(
    "root-banks",
    "bark",
    sweep(
      [
        [-9.75, 0.35, -4.7],
        [-9.77, 1.35, -3.25],
        [-9.55, 2.75, -2.53],
        [-8.7, 3.07, -2.65],
        [-7.84, 2.53, -2.88],
        [-7.41, 0.55, -3.8],
      ],
      [0.29, 0.23, 0.18, 0.15, 0.1, 0.025],
      high ? 68 : 35,
      sides,
      0.85,
      0.12,
      1.7,
    ),
    "#a0a98f",
    0.09,
  );
}

export function buildMoonroot(quality: Quality) {
  const model = new Authoring("moonroot-conservatory");
  buildMoonrootCourtyard(model);
  buildMoonrootBanks(model, quality);
  arch(model, quality);
  statue(model, quality);
  roots(model, quality);
  buildMoonrootWater(model, quality);
  buildMoonrootPlanting(model, quality);
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
      const box = new Box3().setFromObject(group);
      return {
        name: group.name,
        bounds: { min: box.min.toArray(), max: box.max.toArray() },
      };
    }),
  };
}
