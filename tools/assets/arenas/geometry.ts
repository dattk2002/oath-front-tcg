import {
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Float32BufferAttribute,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Vector2,
  Vector3,
} from "three";
import {
  mergeGeometries,
  mergeVertices,
} from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Role =
  | "stone-pale"
  | "stone-dark"
  | "trim-brass"
  | "bark"
  | "foliage"
  | "groundcover"
  | "water"
  | "emissive"
  | "metal"
  | "crystal";
export type Point = [number, number, number];
export type Polygon = [number, number][];
export const materialRoles: Record<
  Role,
  {
    color: string;
    roughness: number;
    metalness: number;
    baseColorUrl?: string;
    alphaTest?: number;
    doubleSided?: boolean;
    emissive?: string;
    emissiveIntensity?: number;
    opacity?: number;
  }
> = {
  "stone-pale": {
    color: "#ffffff",
    roughness: 0.94,
    metalness: 0,
    baseColorUrl: "/assets/arenas-v2/materials/moonroot-stone.webp",
  },
  "stone-dark": {
    color: "#ffffff",
    roughness: 1,
    metalness: 0,
    baseColorUrl: "/assets/arenas-v2/materials/moonroot-stone.webp",
  },
  "trim-brass": { color: "#b7a56b", roughness: 0.67, metalness: 0.58 },
  bark: {
    color: "#ffffff",
    roughness: 1,
    metalness: 0,
    baseColorUrl: "/assets/arenas-v2/materials/aged-bark.webp",
  },
  foliage: {
    color: "#ffffff",
    roughness: 0.91,
    metalness: 0,
    baseColorUrl: "/assets/arenas-v2/materials/fern-frond.webp",
    alphaTest: 0.38,
    doubleSided: true,
  },
  groundcover: {
    color: "#ffffff",
    roughness: 1,
    metalness: 0,
    baseColorUrl: "/assets/arenas-v2/materials/moonroot-groundcover.webp",
    alphaTest: 0.38,
    doubleSided: true,
  },
  water: {
    color: "#43aead",
    roughness: 0.28,
    metalness: 0.2,
    opacity: 0.87,
  },
  emissive: {
    color: "#a9e5d0",
    roughness: 0.58,
    metalness: 0,
    emissive: "#329a88",
    emissiveIntensity: 0.3,
  },
  metal: { color: "#586e62", roughness: 0.7, metalness: 0.6 },
  crystal: { color: "#a4d2d1", roughness: 0.34, metalness: 0.12 },
};

export function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function colorize(
  geometry: BufferGeometry,
  color: string,
  variation = 0,
  seed = 1,
): BufferGeometry {
  const base = new Color(color);
  const position = geometry.getAttribute("position");
  const colors: number[] = [];
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i),
      y = position.getY(i),
      z = position.getZ(i);
    const fade =
      1 +
      variation *
        (Math.sin(x * 2.71 + seed) * Math.sin(z * 3.17 + y * 1.32) * 0.55 +
          Math.cos(y * 5.1 + x * 0.8) * 0.25);
    colors.push(base.r * fade, base.g * fade, base.b * fade);
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return geometry;
}

export function geometryData(
  positions: number[],
  indices: number[],
  uvs: number[],
): BufferGeometry {
  const result = new BufferGeometry();
  result.setAttribute("position", new Float32BufferAttribute(positions, 3));
  result.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  result.setIndex(indices);
  result.computeVertexNormals();
  return result;
}

/** Convex flag with a shallow, separately shaded bevel; all top vertices stay coplanar. */
export function flag(
  polygon: Polygon,
  top: number,
  bottom: number,
  bevel = 0.025,
  uvScale = 2.8,
): BufferGeometry {
  const area = polygon.reduce((sum, point, index) => {
    const next = polygon[(index + 1) % polygon.length]!;
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0);
  const points = area > 0 ? polygon : [...polygon].reverse();
  const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const cz = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  const inside = points.map(([x, z]): [number, number] => {
    const distance = Math.hypot(x - cx, z - cz);
    return [
      x + ((cx - x) * bevel) / distance,
      z + ((cz - z) * bevel) / distance,
    ];
  });
  const positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  const push = (x: number, y: number, z: number) => {
    positions.push(x, y, z);
    uvs.push(x / uvScale, z / uvScale);
    return positions.length / 3 - 1;
  };
  const center = push(cx, top, cz);
  for (const [x, z] of inside) push(x, top, z);
  for (let i = 0; i < points.length; i += 1)
    indices.push(center, 1 + ((i + 1) % points.length), i + 1);
  for (let i = 0; i < points.length; i += 1) {
    const j = (i + 1) % points.length;
    const a = inside[i]!,
      b = inside[j]!,
      c = points[i]!,
      d = points[j]!;
    const offset = positions.length / 3;
    push(a[0], top, a[1]);
    push(b[0], top, b[1]);
    push(c[0], top - bevel, c[1]);
    push(d[0], top - bevel, d[1]);
    push(c[0], bottom, c[1]);
    push(d[0], bottom, d[1]);
    const horizontalAxis =
      Math.abs(d[0] - c[0]) >= Math.abs(d[1] - c[1]) ? 0 : 2;
    for (let vertex = offset; vertex < offset + 6; vertex += 1) {
      uvs[vertex * 2] = positions[vertex * 3 + horizontalAxis]! / uvScale;
      uvs[vertex * 2 + 1] = positions[vertex * 3 + 1]! / uvScale;
    }
    indices.push(
      offset,
      offset + 1,
      offset + 2,
      offset + 1,
      offset + 3,
      offset + 2,
      offset + 2,
      offset + 3,
      offset + 4,
      offset + 3,
      offset + 5,
      offset + 4,
    );
  }
  return geometryData(positions, indices, uvs);
}

/** Low organic moss volume, buried at its irregular edge so no flat rectangular patch is exposed. */
export function mound(
  x: number,
  z: number,
  radius: number,
  phase: number,
  sides = 16,
): BufferGeometry {
  const positions = [x, 0.56, z],
    uvs = [x / 2, z / 2],
    indices: number[] = [];
  for (let ring = 1; ring <= 4; ring += 1) {
    const t = ring / 4;
    for (let i = 0; i < sides; i += 1) {
      const a = (i / sides) * Math.PI * 2;
      const r =
        radius *
        t *
        (1 + 0.14 * Math.sin(a * 3 + phase) + 0.07 * Math.cos(a * 7 - phase));
      const px = x + Math.cos(a) * r,
        pz = z + Math.sin(a) * r;
      positions.push(
        px,
        0.29 + 0.27 * (1 - t * t) + Math.sin(a * 5 + phase) * 0.016 * t,
        pz,
      );
      uvs.push(px / 2, pz / 2);
      const a0 = 1 + (ring - 1) * sides + i,
        a1 = 1 + (ring - 1) * sides + ((i + 1) % sides);
      if (ring === 1) indices.push(0, a1, a0);
      else {
        const b0 = a0 - sides,
          b1 = a1 - sides;
        indices.push(b0, b1, a0, b1, a1, a0);
      }
    }
  }
  return geometryData(positions, indices, uvs);
}

export function clippedVoronoi(
  seeds: Vector2[],
  bounds: [number, number, number, number],
): Polygon[] {
  return seeds.map((point, index) => {
    let cell: Polygon = [
      [bounds[0], bounds[1]],
      [bounds[2], bounds[1]],
      [bounds[2], bounds[3]],
      [bounds[0], bounds[3]],
    ];
    for (let other = 0; other < seeds.length && cell.length; other += 1) {
      if (index === other) continue;
      const neighbor = seeds[other]!;
      const nx = neighbor.x - point.x,
        nz = neighbor.y - point.y;
      const limit = (neighbor.lengthSq() - point.lengthSq()) / 2;
      const next: Polygon = [];
      for (let edge = 0; edge < cell.length; edge += 1) {
        const a = cell[edge]!,
          b = cell[(edge + 1) % cell.length]!;
        const da = a[0] * nx + a[1] * nz - limit,
          db = b[0] * nx + b[1] * nz - limit;
        if (da <= 0) next.push(a);
        if (da < 0 !== db < 0) {
          const t = da / (da - db);
          next.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        }
      }
      cell = next;
    }
    return cell;
  });
}

/** Authored elliptical sweep. Ring furrows follow the branch instead of a tiled bump map. */
export function sweep(
  points: Point[],
  radii: number[],
  segments: number,
  sides: number,
  flatten = 1,
  furrows = 0,
  uvScale = 1,
): BufferGeometry {
  const curve = new CatmullRomCurve3(
    points.map((p) => new Vector3(...p)),
    false,
    "centripetal",
  );
  const positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  const length = curve.getLength();
  const frames = curve.computeFrenetFrames(segments, false);
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments,
      p = curve.getPointAt(t);
    const side = frames.normals[i]!;
    const up = frames.binormals[i]!;
    const ri = t * (radii.length - 1),
      index = Math.min(radii.length - 2, Math.floor(ri)),
      mix = ri - index;
    const radius = radii[index]! * (1 - mix) + radii[index + 1]! * mix;
    for (let j = 0; j <= sides; j += 1) {
      const angle = (j / sides) * Math.PI * 2;
      const scallop =
        1 +
        furrows *
          (Math.cos(angle * 7 + t * 1.1) * 0.7 +
            Math.sin(angle * 11 - t * 0.9) * 0.3);
      const offset = side
        .clone()
        .multiplyScalar(Math.cos(angle) * radius * scallop)
        .addScaledVector(up, Math.sin(angle) * radius * scallop);
      offset.y *= flatten;
      positions.push(p.x + offset.x, p.y + offset.y, p.z + offset.z);
      uvs.push(j / sides, (t * length) / uvScale);
      if (i < segments && j < sides) {
        const a = i * (sides + 1) + j,
          b = a + sides + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
  // A tiny terminal radius keeps tips closed without zero-area triangles.
  return geometryData(positions, indices, uvs);
}

/** Grid patch with ordinary UVs, used for continuous terrain, flowing channels and bent fern fronds. */
export function patch(
  columns: number,
  rows: number,
  sample: (u: number, v: number) => Point,
  uv: (u: number, v: number) => [number, number] = (u, v) => [u, v],
): BufferGeometry {
  const positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  for (let y = 0; y <= rows; y += 1) {
    for (let x = 0; x <= columns; x += 1) {
      const u = x / columns,
        v = y / rows;
      positions.push(...sample(u, v));
      uvs.push(...uv(u, v));
      if (x < columns && y < rows) {
        const a = y * (columns + 1) + x,
          b = a + columns + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  return geometryData(positions, indices, uvs);
}

/** Slightly chamfered arc voussoir with a true open inner edge. */
export function archStone(
  inner: number,
  outer: number,
  start: number,
  end: number,
  spring: number,
  depth: number,
  subdivisions = 5,
): BufferGeometry {
  const positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  const profile = [
    [inner + 0.025, depth / 2],
    [outer - 0.025, depth / 2],
    [outer, depth / 2 - 0.025],
    [outer, -depth / 2 + 0.025],
    [outer - 0.025, -depth / 2],
    [inner + 0.025, -depth / 2],
    [inner, -depth / 2 + 0.025],
    [inner, depth / 2 - 0.025],
  ];
  for (let s = 0; s <= subdivisions; s += 1) {
    const angle = start + ((end - start) * s) / subdivisions;
    for (const [radius, z] of profile) {
      positions.push(
        Math.cos(angle) * radius!,
        spring + Math.sin(angle) * radius!,
        z!,
      );
      uvs.push((angle / Math.PI) * 1.4, radius! + z!);
    }
  }
  for (let s = 0; s < subdivisions; s += 1)
    for (let edge = 0; edge < profile.length; edge += 1) {
      const a = s * profile.length + edge,
        b = s * profile.length + ((edge + 1) % profile.length);
      indices.push(
        a,
        b,
        a + profile.length,
        b,
        b + profile.length,
        a + profile.length,
      );
    }
  for (let edge = 1; edge < profile.length - 1; edge += 1) {
    indices.push(0, edge + 1, edge);
    const o = subdivisions * profile.length;
    indices.push(o, o + edge, o + edge + 1);
  }
  return geometryData(positions, indices, uvs);
}

export type RolePalette = Partial<
  Record<Role, Partial<(typeof materialRoles)[Role]>>
>;

export class Authoring {
  readonly root = new Group();
  private readonly groups = new Map<string, Map<string, BufferGeometry[]>>();
  readonly materials = new Map<Role, MeshStandardMaterial>();
  constructor(name: string, palette: RolePalette = {}) {
    this.root.name = name;
    for (const [role, base] of Object.entries(materialRoles) as [
      Role,
      (typeof materialRoles)[Role],
    ][]) {
      const settings = { ...base, ...palette[role] };
      const material = new MeshStandardMaterial({
        color: settings.color,
        roughness: settings.roughness,
        metalness: settings.metalness,
        vertexColors: true,
      });
      material.name = role;
      if (settings.doubleSided) material.side = 2;
      if (settings.emissive) {
        material.emissive.set(settings.emissive);
        material.emissiveIntensity = settings.emissiveIntensity!;
      }
      if (settings.opacity) {
        material.transparent = true;
        material.opacity = settings.opacity;
        material.depthWrite = false;
      }
      material.userData.role = role;
      this.materials.set(role, material);
    }
  }
  add(
    landmark: string,
    role: Role,
    geometry: BufferGeometry,
    color = "#ffffff",
    variation = 0,
    transform?: Matrix4,
    variant?: "solid-leaf",
  ): void {
    if (transform) geometry.applyMatrix4(transform);
    if (role === "stone-dark" && landmark !== "statue-east") {
      const position = geometry.getAttribute("position"),
        uv = geometry.getAttribute("uv");
      for (let i = 0; i < position.count; i += 1)
        uv.setXY(i, position.getX(i) / 2.8, position.getZ(i) / 2.8);
    }
    if (!geometry.getAttribute("color")) colorize(geometry, color, variation);
    if (!geometry.index) geometry = mergeVertices(geometry, 0.00001);
    geometry.clearGroups();
    if (!this.groups.has(landmark)) this.groups.set(landmark, new Map());
    const roles = this.groups.get(landmark)!;
    const key = variant ? `${role}/${variant}` : role;
    if (!roles.has(key)) roles.set(key, []);
    roles.get(key)!.push(geometry);
  }
  finish(): Group {
    for (const [name, batches] of this.groups) {
      const group = new Group();
      group.name = name;
      for (const [key, geometries] of batches) {
        const [roleName, variant] = key.split("/");
        const role = roleName as Role;
        const geometry = mergeGeometries(geometries, false);
        if (!geometry) throw new Error(`Cannot merge ${name}/${role}`);
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        const material = variant
          ? this.materials.get(role)!.clone()
          : this.materials.get(role)!;
        if (variant === "solid-leaf")
          material.userData = { role, baseColorTexture: false };
        const mesh = new Mesh(geometry, material);
        mesh.name = `${name}--${key.replace("/", "--")}`;
        mesh.castShadow = role !== "water";
        mesh.receiveShadow = true;
        mesh.userData = { role, landmark: name };
        group.add(mesh);
        for (const source of geometries) source.dispose();
      }
      this.root.add(group);
    }
    this.root.updateMatrixWorld(true);
    return this.root;
  }
}
