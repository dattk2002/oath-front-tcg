import {
  Authoring,
  colorize,
  mound,
  patch,
  random,
  sweep,
  type Point,
} from "./geometry.js";
import type { Quality } from "./moonroot.js";

// Deliberate discontinuous beds: open spillways, exposed root bridges and shaded pockets separate them.
const beds: [number, number, number, number, number][] = [
  [-8.6, -6.7, 1.15, 1.34, 0],
  [-6.3, -5.9, 0.85, 0.88, 1],
  [-4.2, -6.4, 1.0, 0.86, 2],
  [-0.9, -6.6, 0.7, 0.69, 1],
  [3.0, -6.2, 1.06, 0.97, 2],
  [6.7, -6.4, 1.0, 1.04, 0],
  [-9.9, -3.8, 0.92, 1.13, 0],
  [-7.1, -4.5, 0.58, 0.72, 2],
  [-9.9, -0.75, 0.98, 1.24, 1],
  [-7.2, 0.15, 0.55, 0.64, 2],
  [-7.25, 2.9, 0.72, 1.02, 1],
  [-9.7, 3.9, 0.85, 0.89, 2],
  [9.8, -6.2, 0.94, 1.2, 1],
  [10.0, -3.65, 0.8, 0.91, 2],
  [7.3, -2.1, 0.55, 0.69, 2],
  [9.8, -0.9, 0.88, 1.3, 0],
  [7.25, 2.2, 0.67, 1.14, 1],
  [9.95, 3.6, 0.96, 0.87, 2],
  [-8.1, 6.1, 1.1, 1.22, 1],
  [-5.2, 6.4, 0.92, 0.84, 2],
  [-1.4, 6.6, 0.8, 0.66, 1],
  [2.7, 6.0, 0.88, 0.9, 2],
  [6.3, 6.6, 1.04, 1.0, 0],
  [9.7, 6.0, 1.04, 1.27, 1],
];

function keepOutside(geometry: ReturnType<typeof patch>, side: number): void {
  const p = geometry.getAttribute("position");
  for (let i = 0; i < p.count; i += 1)
    if (Math.abs(p.getX(i)) < 6.52 && Math.abs(p.getZ(i)) < 3.94)
      p.setX(i, Math.sign(side) * 6.52);
  geometry.computeVertexNormals();
}

export function buildMoonrootPlanting(
  model: Authoring,
  quality: Quality,
): void {
  const high = quality === "high",
    rng = random(815302);
  for (let bedIndex = 0; bedIndex < beds.length; bedIndex += 1) {
    const [bx, bz, radius, scale, form] = beds[bedIndex]!;
    const density = high ? (form === 2 ? 5 : 8) : form === 2 ? 3 : 5;
    const lean = rng() * Math.PI * 2;
    for (let plant = 0; plant < density; plant += 1) {
      const a = rng() * Math.PI * 2,
        r = Math.sqrt(rng()) * radius;
      let x = bx + Math.cos(a) * r;
      const z = bz + Math.sin(a) * r * 0.72;
      if (Math.abs(x) < 6.85 && Math.abs(z) < 4.15) x = Math.sign(bx) * 6.85;
      const size = scale * (0.57 + rng() * 0.78),
        angle0 = lean + (rng() - 0.5) * 1.3;
      const count = (high ? 4 : 3) + Math.floor(rng() * 3);
      for (let leaf = 0; leaf < count; leaf += 1) {
        const angle = angle0 + (rng() - 0.5) * (form === 0 ? 2.4 : 5.3);
        const length = size * (0.76 + rng() * 0.5),
          upright = form === 0 ? 0.88 : form === 1 ? 0.5 : 0.24;
        const spread = form === 0 ? 0.63 : form === 1 ? 1.1 : 1.28;
        const dx = Math.sin(angle),
          dz = Math.cos(angle),
          sx = Math.cos(angle),
          sz = -Math.sin(angle);
        const mesh = patch(
          2,
          high ? 8 : 5,
          (u, v) => {
            const across =
              (u - 0.5) *
              length *
              (0.64 + rngWidth(bedIndex, plant, leaf) * 0.26);
            const along = length * spread * (0.18 * v + 0.82 * v * v);
            return [
              x + dx * along + sx * across,
              0.34 +
                Math.sin(v * (form === 0 ? 1.5 : 2.35)) * length * upright -
                Math.abs(u - 0.5) * 0.09,
              z + dz * along + sz * across,
            ];
          },
          (u, v) => [u, 1 - v],
        );
        keepOutside(mesh, bx);
        model.add(
          "fern-banks",
          "foliage",
          mesh,
          ["#597e74", "#728d7c", "#5e7e72", "#89976d"][bedIndex % 4]!,
        );
      }
    }
    // Low evergreen creepers use modeled folded leaves and veins, independent of the fern image.
    const creepers = high ? (form === 2 ? 5 : 3) : form === 2 ? 3 : 2;
    for (let plant = 0; plant < creepers; plant += 1) {
      const angle = rng() * Math.PI * 2,
        r = rng() * radius;
      let x = bx + Math.cos(angle) * r;
      const z = bz + Math.sin(angle) * r;
      if (Math.abs(x) < 6.85 && Math.abs(z) < 4.15) x = Math.sign(bx) * 6.85;
      const count = high ? 8 : 5,
        baseAngle = rng() * Math.PI * 2;
      for (let leaf = 0; leaf < count; leaf += 1) {
        const a = baseAngle + leaf * 2.41,
          length = (0.25 + rng() * 0.29) * (form === 2 ? 1.12 : 0.9);
        const dx = Math.sin(a),
          dz = Math.cos(a),
          sx = Math.cos(a),
          sz = -Math.sin(a);
        const leafX = x + Math.sin(leaf * 1.33) * 0.23,
          leafZ = z + Math.cos(leaf * 1.33) * 0.23;
        const rise = 0.1 + rng() * 0.24;
        const geometry = patch(high ? 4 : 2, high ? 5 : 4, (u, v) => {
          const t = v,
            width =
              0.012 +
              Math.sin(t * Math.PI) ** (form === 2 ? 0.68 : 0.9) *
                length *
                0.55 *
                (1 + 0.035 * Math.sin(t * 14 * Math.PI));
          const across = (u - 0.5) * width;
          return [
            leafX + dx * t * length + sx * across,
            0.35 +
              t * rise +
              Math.sin(t * Math.PI) *
                (0.035 + 0.095 * (1 - Math.abs(u - 0.5) * 2)),
            leafZ + dz * t * length + sz * across,
          ];
        });
        keepOutside(geometry, bx);
        colorize(
          geometry,
          ["#254a3b", "#33583f", "#455e3d", "#203f34"][bedIndex % 4]!,
          0.18,
          leaf,
        );
        const uv = geometry.getAttribute("uv"),
          colors = geometry.getAttribute("color");
        for (let vertex = 0; vertex < uv.count; vertex += 1) {
          const u = uv.getX(vertex),
            v = uv.getY(vertex),
            shade =
              0.78 +
              0.18 * Math.sin(v * Math.PI) +
              0.13 * Math.exp(-Math.abs(u - 0.5) / 0.11);
          colors.setXYZ(
            vertex,
            colors.getX(vertex) * shade,
            colors.getY(vertex) * shade,
            colors.getZ(vertex) * shade,
          );
        }
        model.add(
          "fern-banks",
          "foliage",
          geometry,
          "#ffffff",
          0,
          undefined,
          "solid-leaf",
        );
        if (high && leaf % 2 === 0) {
          const vein: Point[] = [
            [leafX, 0.36, leafZ],
            [
              leafX + dx * length * 0.48,
              0.482 + rise * 0.48,
              leafZ + dz * length * 0.48,
            ],
            [
              leafX + dx * length * 0.92,
              0.388 + rise * 0.92,
              leafZ + dz * length * 0.92,
            ],
          ];
          const rib = sweep(vein, [0.006, 0.007, 0.002], 5, 3);
          keepOutside(rib, bx);
          model.add(
            "fern-banks",
            "foliage",
            rib,
            "#718461",
            0,
            undefined,
            "solid-leaf",
          );
        }
      }
    }
    if (bedIndex % 2 === 0) {
      const x =
        Math.abs(bx) < 6.9 && Math.abs(bz) < 4.2 ? Math.sign(bx) * 7.0 : bx;
      model.add(
        "fern-banks",
        "stone-dark",
        mound(x, bz, Math.min(0.67, radius * 0.6), bedIndex, high ? 16 : 12),
        ["#465f4c", "#647551", "#546c53"][bedIndex % 3]!,
        0.13,
      );
    }
  }
  // Curved cutouts add small-leaf and moss coverage while the existing roots,
  // banks, ferns and stone retain the environment's actual silhouette and depth.
  const groundcoverSites: [number, number][] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 10; i += 1) {
      groundcoverSites.push([-6.8 + i * 1.5, side * (6.22 + rng() * 1.05)]);
      groundcoverSites.push([side * (10.35 + rng() * 0.28), -7.3 + i * 1.6]);
    }
  }
  for (let site = 0; site < groundcoverSites.length; site += 1) {
    const [x, z] = groundcoverSites[site]!,
      width = 2.2 + rng() * 0.85,
      depth = 1.8 + rng() * 0.8,
      angle = rng() * Math.PI * 2,
      base = 0.48 + rng() * 0.16;
    const geometry = patch(
      high ? 4 : 3,
      high ? 4 : 3,
      (u, v) => {
        const localX = (u - 0.5) * width,
          localZ = (v - 0.5) * depth;
        return [
          x + Math.cos(angle) * localX - Math.sin(angle) * localZ,
          base + Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 0.24,
          z + Math.sin(angle) * localX + Math.cos(angle) * localZ,
        ];
      },
      (u, v) => [u, 1 - v],
    );
    keepOutside(geometry, x);
    model.add(
      "fern-banks",
      "groundcover",
      geometry,
      ["#97ac95", "#b0b99c", "#879f8b"][site % 3]!,
      0.06,
    );
  }
}

function rngWidth(bed: number, plant: number, leaf: number): number {
  return 0.5 + 0.5 * Math.sin(bed * 2.13 + plant * 3.31 + leaf * 1.41);
}
