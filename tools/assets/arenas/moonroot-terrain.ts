import { Vector2 } from "three";
import {
  Authoring,
  clippedVoronoi,
  colorize,
  flag,
  patch,
  random,
  sweep,
  type Point,
  type Polygon,
} from "./geometry.js";
import type { Quality } from "./moonroot.js";

export const moonrootSpills = {
  west: [-5.65, 1.3, 6.15],
  east: [-6.05, -0.05, 5.35],
};
export function channelBounds(side: number, z: number): [number, number] {
  const phase = side < 0 ? 0.7 : 2.1;
  const inner =
    7.56 +
    0.19 * Math.sin(z * 0.72 + phase) +
    0.085 * Math.sin(z * 1.84 - phase);
  const outer =
    9.27 + 0.3 * Math.sin(z * 0.48 + phase + 1) + 0.14 * Math.sin(z * 1.34);
  return side < 0 ? [-outer, -inner] : [inner, outer];
}
export function channelLevels(side: number): number[] {
  return side < 0 ? [0.63, 0.31, 0.04, -0.2] : [0.72, 0.4, 0.11, -0.16];
}
export function channelHeight(side: number, z: number): number {
  const spills = side < 0 ? moonrootSpills.west : moonrootSpills.east;
  return channelLevels(side)[spills.filter((at) => z > at).length]!;
}

export function buildMoonrootCourtyard(model: Authoring): void {
  const bounds: [number, number, number, number] = [-7.12, -5.3, 7.12, 5.3];
  model.add(
    "courtyard",
    "stone-pale",
    flag(
      [
        [-7.16, -5.34],
        [7.16, -5.34],
        [7.16, 5.34],
        [-7.16, 5.34],
      ],
      0.324,
      0.2,
      0.012,
    ),
    "#afb9a6",
  );
  const rng = random(231023),
    seeds: Vector2[] = [];
  const rows = [-5.05, -3.96, -2.49, -0.83, 0.72, 2.36, 3.86, 5.09];
  for (let row = 0; row < rows.length; row += 1) {
    let x = -7.08 + rng() * 0.55;
    while (x < 7.16) {
      seeds.push(new Vector2(x, rows[row]! + (rng() - 0.5) * 0.72));
      x += 0.95 + rng() * 1.49;
    }
  }
  for (const [x, z] of [
    [-6.7, -4.2],
    [5.8, 4.8],
    [-5.8, 3.7],
    [6.7, -2.0],
    [-2.8, -4.8],
  ])
    seeds.push(new Vector2(x, z));
  for (const polygon of clippedVoronoi(seeds, bounds)) {
    const cx = polygon.reduce((n, p) => n + p[0], 0) / polygon.length,
      cz = polygon.reduce((n, p) => n + p[1], 0) / polygon.length;
    const inset = polygon.map(([x, z]): [number, number] => {
      const d = Math.hypot(x - cx, z - cz);
      return [x + ((cx - x) * 0.012) / d, z + ((cz - z) * 0.012) / d];
    });
    const geometry = flag(inset, 0.358 + rng() * 0.002, 0.319, 0.012);
    colorize(
      geometry,
      ["#c4ccc6", "#d0d4cd", "#c6cec9", "#bec9c2", "#c9cfca"][
        Math.floor(rng() * 5)
      ]!,
      0.055,
    );
    const position = geometry.getAttribute("position"),
      color = geometry.getAttribute("color");
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i),
        z = position.getZ(i);
      const stain =
        0.075 * Math.exp(-((x + 5.8) ** 2 / 3.2 + (z + 3.8) ** 2 / 2.8)) +
        0.065 * Math.exp(-((x - 5.9) ** 2 / 2.7 + (z - 3.1) ** 2 / 3.8)) +
        0.04 * Math.exp(-((x + 1.8) ** 2 / 4.2 + (z - 4.9) ** 2 / 1.2));
      color.setXYZ(
        i,
        color.getX(i) * (1 - stain),
        color.getY(i) * (1 - stain * 0.65),
        color.getZ(i) * (1 - stain * 0.9),
      );
    }
    model.add("courtyard", "stone-pale", geometry);
  }
  const fractures: Point[][] = [
    [
      [-6.8, 0.3605, -3.1],
      [-6.3, 0.3605, -2.92],
      [-6.18, 0.3605, -2.51],
      [-5.91, 0.3605, -2.36],
    ],
    [
      [4.7, 0.3605, 4.7],
      [4.39, 0.3605, 4.26],
      [4.52, 0.3605, 3.97],
    ],
    [
      [-2.8, 0.3605, -5.1],
      [-2.43, 0.3605, -4.76],
      [-2.56, 0.3605, -4.43],
    ],
    [
      [6.7, 0.3605, 1.0],
      [6.23, 0.3605, 1.11],
      [5.97, 0.3605, 0.83],
    ],
  ];
  for (const fracture of fractures)
    model.add(
      "courtyard",
      "stone-dark",
      sweep(fracture, [0.004, 0.003, 0.001], 10, 3),
      "#9eada1",
    );
}

export function buildMoonrootBanks(model: Authoring, quality: Quality): void {
  const high = quality === "high",
    rng = random(418310);
  for (const side of [-1, 1]) {
    model.add(
      "boundary-masonry",
      "stone-dark",
      patch(high ? 34 : 22, 8, (u, v) => {
        const x = side * (u - 0.5) * 14.5,
          z = side * (5.18 + v * 3.59);
        return [
          x,
          0.19 +
            Math.sin(u * 25 + v * 4.2) * 0.1 +
            Math.sin(v * Math.PI) * 0.26,
          z,
        ];
      }),
      "#52684f",
      0.19,
    );
    for (let row = 0; row < 2; row += 1) {
      let x = -7.3 - rng() * 0.5;
      while (x < 7.3) {
        const width = 0.88 + rng() * 1.9,
          depth = 0.46 + rng() * 0.45,
          z = side * (5.47 + row * 0.59 + (rng() - 0.5) * 0.2);
        const polygon: Polygon = [
          [x, z - depth / 2],
          [x + width * 0.89, z - depth / 2 - 0.05],
          [x + width, z - depth * 0.1],
          [x + width * 0.94, z + depth / 2],
          [x + 0.11, z + depth / 2 + 0.04],
        ];
        model.add(
          "boundary-masonry",
          "stone-pale",
          flag(
            polygon,
            0.4 + row * 0.12 + rng() * 0.11,
            0.12,
            0.055 + rng() * 0.04,
          ),
          rng() > 0.55 ? "#b4c0b2" : "#c7cec4",
          0.13,
        );
        x += width + 0.04 + rng() * 0.13;
      }
    }
    for (const outer of [false, true])
      model.add(
        "boundary-masonry",
        "stone-dark",
        patch(5, high ? 50 : 31, (u, v) => {
          const z = -8.5 + v * 17,
            [left, right] = channelBounds(side, z);
          const edge = side < 0 ? (outer ? left : right) : outer ? right : left;
          const far = side * (outer ? 11.0 : 7.03),
            min = Math.min(edge, far),
            max = Math.max(edge, far);
          const x = min + u * (max - min),
            edgeWeight = 1 - Math.abs(x - edge) / (max - min);
          const height = Math.max(0.39, channelHeight(side, z) + 0.2);
          return [
            x,
            0.26 +
              (height - 0.26) * edgeWeight +
              Math.sin(z * 2.2 + u * 1.2) * 0.075,
            z,
          ];
        }),
        outer ? "#4a6350" : "#6b7b5b",
        0.19,
      );
    let z = -7.9;
    while (z < 8.1) {
      const length = 0.76 + rng() * 1.39,
        [left, right] = channelBounds(side, z),
        edge = side < 0 ? right : left;
      const center = edge - side * 0.13,
        width = 0.34 + rng() * 0.31,
        height = Math.max(0.43, channelHeight(side, z) + 0.17) + rng() * 0.07;
      const poly: Polygon = [
        [center - width / 2, z],
        [center + width * 0.45, z - 0.06],
        [center + width * 0.58, z + length * 0.57],
        [center + width * 0.35, z + length],
        [center - width * 0.51, z + length - 0.07],
        [center - width * 0.61, z + length * 0.45],
      ];
      model.add(
        "boundary-masonry",
        "stone-pale",
        flag(poly, height, channelHeight(side, z) - 0.15, 0.055),
        rng() > 0.5 ? "#a9b8a4" : "#bbc5b5",
        0.15,
      );
      z += length + 0.08 + rng() * 0.16;
    }
  }
}

export function buildMoonrootWater(model: Authoring, quality: Quality): void {
  const high = quality === "high";
  for (const side of [-1, 1]) {
    const spills = side < 0 ? moonrootSpills.west : moonrootSpills.east,
      levels = channelLevels(side);
    model.add(
      "water-channels",
      "stone-dark",
      patch(5, high ? 48 : 26, (u, v) => {
        const z = -8.3 + v * 16.6,
          [left, right] = channelBounds(side, z);
        return [
          left + u * (right - left),
          channelHeight(side, z) - 0.25 + Math.abs(u - 0.5) * 0.1,
          z,
        ];
      }),
      "#3d665a",
      0.15,
    );
    for (let segment = 0; segment < 4; segment += 1) {
      const start = segment === 0 ? -8.3 : spills[segment - 1]! + 0.29,
        end = segment === 3 ? 8.3 : spills[segment]!;
      model.add(
        "water-channels",
        "water",
        patch(
          high ? 9 : 5,
          high ? 16 : 9,
          (u, v) => {
            const z =
                start +
                (end - start) * v +
                (segment < 3
                  ? Math.sin(u * 8.8 + segment * 1.6) * 0.075 * v
                  : 0),
              [left, right] = channelBounds(side, z);
            return [
              left + 0.035 + u * (right - left - 0.07),
              levels[segment]! + Math.sin(z * 7 + u * 6) * 0.004,
              z,
            ];
          },
          (u, v) => [u, v * Math.max(1, (end - start) / 2)],
        ),
        "#b4d5ca",
      );
    }
    for (let spill = 0; spill < 3; spill += 1) {
      const z = spills[spill]!,
        [left, right] = channelBounds(side, z),
        width = right - left,
        upper = levels[spill]!,
        lower = levels[spill + 1]!;
      const notch = (u: number) => Math.sin(u * 8.8 + spill * 1.6) * 0.075;
      const lip: Polygon = [
        [left - 0.08, z - 0.45],
        [right + 0.06, z - 0.35],
        [right + 0.02, z + 0.13],
        [left + width * 0.64, z + 0.035],
        [left + width * 0.41, z + 0.18],
        [left - 0.05, z + 0.08],
      ];
      model.add(
        "water-channels",
        "stone-pale",
        flag(lip, upper - 0.025, lower - 0.16, 0.04),
        "#a9b9a5",
        0.16,
      );
      for (const [begin, end] of [
        [0.04, 0.27],
        [0.43, 0.61],
        [0.78, 0.95],
      ]) {
        model.add(
          "water-channels",
          "water",
          patch(high ? 6 : 4, 6, (u, v) => {
            const at = begin! + (end! - begin!) * u,
              x = left + at * width;
            return [
              x,
              upper + (lower - upper) * v,
              z + notch(at) + 0.02 + Math.sin((v * Math.PI) / 2) * 0.29,
            ];
          }),
          "#c0ddd4",
        );
      }
      for (const [at, spread, offset] of [
        [0.0, 0.21, -0.04],
        [0.35, 0.15, 0.04],
        [0.69, 0.15, -0.03],
        [0.96, 0.2, 0.02],
      ]) {
        const x = left + at! * width,
          w = spread! * width;
        model.add(
          "water-channels",
          "stone-pale",
          flag(
            [
              [x - w / 2, z - 0.45 + offset!],
              [x + w / 2, z - 0.39],
              [x + w * 0.55, z + 0.12],
              [x - w * 0.48, z + 0.2 + offset!],
            ],
            upper + 0.025 + at! * 0.025,
            lower - 0.16,
            0.045,
          ),
          "#a3b49e",
          0.14,
        );
      }
    }
  }
}
