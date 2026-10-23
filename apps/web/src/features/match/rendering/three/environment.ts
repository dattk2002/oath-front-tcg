import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { CARD_WIDTH, CARD_DEPTH, cardAnchor } from "./layout";
import { attachArenaMaterial, releaseArenaMaterials } from "./materials";
export function buildEnvironment(
  key: string,
  quality: "low" | "high",
  onMaterialLoaded?: () => void,
) {
  const group = new T.Group();
  group.name = key;
  const fire = key === "cinder-foundry",
    water = key === "glasswater-sanctum",
    astral = key === "astral-causeway";
  const colors: [number, number, number, number] = fire
    ? [0x33333a, 0x17151b, 0xcb6e35, 0xff570c]
    : water
      ? [0xb9cccf, 0x5d7688, 0xd3b676, 0x64e7ff]
      : astral
        ? [0x645d7d, 0x27263d, 0xb9a16e, 0xb99aff]
        : [0x677a73, 0x263b3c, 0x9d9870, 0x62eed5];
  const stone = new T.MeshStandardMaterial({
    color: colors[0],
    roughness: fire ? 0.75 : 0.9,
    metalness: fire ? 0.6 : 0.08,
  });
  const dark = new T.MeshStandardMaterial({
    color: colors[1],
    roughness: 0.82,
    metalness: fire ? 0.7 : 0.1,
  });
  const trim = new T.MeshStandardMaterial({
    color: colors[2],
    roughness: 0.36,
    metalness: 0.75,
  });
  const glow = new T.MeshStandardMaterial({
    color: colors[3],
    emissive: colors[3],
    emissiveIntensity: 1.4,
    roughness: 0.3,
    metalness: 0.2,
  });
  const moss = new T.MeshStandardMaterial({ color: 0x264e3f, roughness: 1 });
  function mesh(
    geometry: T.BufferGeometry,
    material: T.Material,
    x: number,
    y: number,
    z: number,
  ) {
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = material !== glow;
    m.receiveShadow = true;
    group.add(m);
    return m;
  }
  function slab(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: T.Material = stone,
    bevel = 0.09,
  ) {
    const shape = new T.Shape();
    const hw = w / 2,
      hd = d / 2,
      b = Math.min(bevel, hw / 2, hd / 2);
    shape.moveTo(-hw + b, -hd);
    shape.lineTo(hw - b, -hd);
    shape.lineTo(hw, -hd + b);
    shape.lineTo(hw, hd - b);
    shape.lineTo(hw - b, hd);
    shape.lineTo(-hw + b, hd);
    shape.lineTo(-hw, hd - b);
    shape.lineTo(-hw, -hd + b);
    shape.closePath();
    const geo = new T.ExtrudeGeometry(shape, {
      depth: h,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.035,
      bevelSegments: 1,
      steps: 1,
    });
    geo.rotateX(-Math.PI / 2);
    // All paving shares a single top-down map; the supplied swatches are not edge tiles.
    const positions = geo.getAttribute("position");
    const normals = geo.getAttribute("normal");
    const uv = geo.getAttribute("uv");
    for (let i = 0; i < positions.count; i++) {
      const px = positions.getX(i) + x;
      const py = positions.getY(i) + y - h / 2;
      const pz = positions.getZ(i) + z;
      if (Math.abs(normals.getY(i)) > 0.5)
        uv.setXY(i, px / 15 + 0.5, pz / 10.5 + 0.5);
      else if (Math.abs(normals.getX(i)) > 0.5)
        uv.setXY(i, pz / 10.5 + 0.5, py / 4 + 0.5);
      else uv.setXY(i, px / 15 + 0.5, py / 4 + 0.5);
    }
    return mesh(geo, mat, x, y - h / 2, z);
  }
  function column(x: number, z: number, height: number) {
    slab(0.95, 0.24, 0.95, x, 0.3, z, dark);
    slab(0.73, 0.13, 0.73, x, 0.48, z, trim);
    mesh(
      new T.CylinderGeometry(0.25, 0.34, height, quality === "high" ? 20 : 12),
      stone,
      x,
      0.5 + height / 2,
      z,
    );
    for (const y of [0.6, height + 0.45])
      mesh(new T.CylinderGeometry(0.39, 0.39, 0.13, 12), trim, x, y, z);
    slab(0.8, 0.18, 0.8, x, height + 0.6, z, stone);
  }
  function tube(points: T.Vector3[], radius: number, mat: T.Material) {
    return mesh(
      new T.TubeGeometry(new T.CatmullRomCurve3(points), 16, radius, 6, false),
      mat,
      0,
      0,
      0,
    );
  }
  // Layered silhouette and independently beveled paving create genuine height and shadows.
  slab(14.8, 0.4, 10.15, 0, -0.95, 0, dark, 0.7);
  slab(14.3, 0.42, 9.7, 0, -0.55, 0, stone, 0.5);
  slab(13.95, 0.1, 9.35, 0, -0.28, 0, trim, 0.35);
  for (let col = 0; col < 10; col++)
    for (let row = 0; row < 6; row++) {
      const x = (col - 4.5) * 1.36,
        z = (row - 2.5) * 1.48;
      slab(
        1.325,
        0.22,
        1.445,
        x,
        -0.1 + Math.sin(col * 9 + row * 4) * 0.012,
        z,
        (col + row) % 5 === 0 ? dark : stone,
        0.06,
      );
    }
  for (const z of [-4.82, 4.82]) {
    slab(11.5, 0.17, 0.65, 0, -0.52, z, stone);
    slab(10.8, 0.17, 0.7, 0, -0.73, z + Math.sign(z) * 0.43, dark);
  }
  for (let lane = 1; lane <= 5; lane++) {
    for (const owner of ["GOOD", "EVIL"] as const) {
      const a = cardAnchor(lane, owner, "GOOD");
      slab(CARD_WIDTH + 0.25, 0.1, CARD_DEPTH + 0.25, a.x, 0.13, a.z, trim);
      slab(CARD_WIDTH + 0.12, 0.11, CARD_DEPTH + 0.12, a.x, 0.18, a.z, dark);
      for (const dx of [-0.75, 0.75])
        for (const dz of [-1.05, 1.05])
          mesh(new T.OctahedronGeometry(0.055), glow, a.x + dx, 0.27, a.z + dz);
    }
    slab(2.05, 0.12, 0.95, (lane - 3) * 2.4, 0.12, 0, trim);
    slab(1.94, 0.13, 0.84, (lane - 3) * 2.4, 0.16, 0, dark.clone()).name =
      `terrain-${lane}`;
  }
  if (fire) {
    for (const x of [-6.45, 6.45]) {
      slab(0.34, 0.04, 8.8, x, 0.07, 0, glow);
      for (let z = -4; z <= 4; z += 0.48)
        slab(0.64, 0.1, 0.09, x, 0.14, z, dark);
    }
    for (const x of [-7, 7]) {
      slab(1.2, 0.9, 1.6, x, -0.35, -3.8, dark);
      slab(0.75, 2.3, 0.9, x, 0.7, -3.8, dark);
      slab(0.55, 0.9, 0.08, x, 0.75, -3.29, glow);
      for (let i = 0; i < 4; i++)
        slab(0.64, 0.08, 0.12, x, 0.38 + i * 0.25, -3.2, trim);
      tube(
        [
          new T.Vector3(x, 0, 3),
          new T.Vector3(x, 1.1, 2),
          new T.Vector3(x, 1.1, -1),
          new T.Vector3(x, 0.1, -2),
        ],
        0.16,
        trim,
      );
      for (const z of [-2, 0, 2]) {
        const collar = mesh(
          new T.TorusGeometry(0.21, 0.055, 6, 12),
          dark,
          x,
          1.08,
          z,
        );
        collar.rotation.y = 0;
      }
    }
    for (const x of [-6, 6])
      for (let z = -4; z < 4; z += 0.8)
        mesh(new T.SphereGeometry(0.06, 6, 4), trim, x, 0.17, z);
  } else if (water) {
    for (const x of [-6.3, 6.3]) {
      slab(0.85, 0.08, 7.7, x, 0.1, 0, trim);
      slab(
        0.65,
        0.035,
        7.5,
        x,
        0.16,
        0,
        new T.MeshPhysicalMaterial({
          color: 0x2a9db9,
          metalness: 0.45,
          roughness: 0.16,
          emissive: 0x0b536a,
          emissiveIntensity: 0.5,
          clearcoat: 1,
        }),
      );
    }
    for (const x of [-7, 7])
      for (const z of [-3.7, 3.7]) {
        column(x, z, z < 0 ? 2.1 : 0.75);
        for (let i = 0; i < 3; i++) {
          const c = mesh(
            new T.ConeGeometry(0.23, 0.85 + i * 0.3, 5),
            glow,
            x + (i - 1) * 0.27,
            0.65 + i * 0.1,
            z + 0.65,
          );
          c.rotation.z = (i - 1) * 0.24;
        }
      }
  } else if (astral) {
    for (const x of [-6.85, 6.85])
      for (let i = 0; i < 5; i++) {
        const s = slab(
          0.65,
          0.45,
          0.95,
          x + (i % 2) * 0.25,
          -0.5 - i * 0.17,
          (i - 2) * 1.7,
          dark,
        );
        s.rotation.y = i * 0.16;
      }
    for (const x of [-7, 7]) {
      column(x, -3.7, 1.5);
      for (let i = 0; i < 2; i++) {
        const ring = mesh(
          new T.TorusGeometry(1 + i * 0.18, 0.055, 6, 40),
          trim,
          x,
          2,
          -3.7,
        );
        ring.rotation.set(0.3 + i * 0.8, i * 0.65, 0.35);
      }
      mesh(new T.IcosahedronGeometry(0.26, 0), glow, x, 2, -3.7);
    }
    for (let i = 0; i < (quality === "high" ? 36 : 16); i++) {
      const angle = i * 2.399;
      mesh(
        new T.OctahedronGeometry(0.025 + (i % 3) * 0.01),
        glow,
        Math.cos(angle) * (9 + (i % 4)),
        -1 + (i % 5) * 0.7,
        Math.sin(angle) * (7 + (i % 3)),
      );
    }
  } else {
    for (const x of [-7, 7])
      for (const z of [-3.7, 3.6]) {
        column(x, z, z < 0 ? 1.9 : 0.7);
        const y = z < 0 ? 2.65 : 1.45;
        mesh(new T.CylinderGeometry(0.17, 0.22, 0.42, 6), glow, x, y, z);
        mesh(new T.ConeGeometry(0.38, 0.24, 6), dark, x, y + 0.32, z);
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2;
          slab(
            0.045,
            0.52,
            0.045,
            x + Math.cos(a) * 0.2,
            y,
            z + Math.sin(a) * 0.2,
            trim,
          );
        }
      }
    for (const sign of [-1, 1])
      for (let i = 0; i < 5; i++) {
        const x = sign * (6.7 + (i % 2) * 0.3),
          z = (i - 2) * 1.65;
        tube(
          [
            new T.Vector3(x, -0.4, z - 1),
            new T.Vector3(x - 0.25 * sign, 0.25, z),
            new T.Vector3(x + 0.3 * sign, 0.12, z + 0.8),
          ],
          0.1 + (i % 2) * 0.05,
          dark,
        );
        for (let j = 0; j < 3; j++) {
          const leaf = mesh(
            new T.IcosahedronGeometry(0.32, 0),
            moss,
            x + (j - 1) * 0.22,
            0.3 + j * 0.12,
            z + j * 0.18,
          );
          leaf.scale.set(1, 0.35, 1.5);
        }
      }
  }
  const ambient = new T.HemisphereLight(
    water ? 0xd0edff : astral ? 0xc4b8ff : 0xa0d8de,
    colors[1],
    2.2,
  );
  group.add(ambient);
  const sun = new T.DirectionalLight(
    water ? 0xffefcf : fire ? 0xffc28a : 0xd6e5ff,
    3.3,
  );
  sun.position.set(-5, 11, 6);
  sun.castShadow = quality === "high";
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -11,
    right: 11,
    top: 10,
    bottom: -10,
    near: 1,
    far: 35,
  });
  sun.shadow.bias = -0.0007;
  sun.shadow.normalBias = 0.035;
  group.add(sun);
  const fill = new T.PointLight(colors[3], fire ? 24 : 16, 22, 2);
  fill.position.set(5, 3, -4);
  group.add(fill);
  // Bake static architecture by material: low quality keeps the same silhouette at a small draw-call budget.
  const batches = new Map<T.Material, T.Mesh[]>();
  group.updateMatrixWorld(true);
  for (const child of [...group.children])
    if (
      child instanceof T.Mesh &&
      !child.name &&
      !Array.isArray(child.material)
    ) {
      const list = batches.get(child.material) ?? [];
      list.push(child);
      batches.set(child.material, list);
    }
  for (const [material, meshes] of batches) {
    const geometries = meshes.map((m) => {
      const g = m.geometry.index
        ? m.geometry.toNonIndexed()
        : m.geometry.clone();
      return g.applyMatrix4(m.matrix);
    });
    const combined = mergeGeometries(geometries, false);
    geometries.forEach((g) => g.dispose());
    if (!combined) continue;
    for (const m of meshes) {
      group.remove(m);
      m.geometry.dispose();
    }
    const baked = new T.Mesh(combined, material);
    baked.castShadow = material !== glow;
    baked.receiveShadow = material !== glow;
    group.add(baked);
  }
  if (onMaterialLoaded)
    attachArenaMaterial(group, key, [stone, dark], quality, onMaterialLoaded);
  return group;
}
export function disposeObject(root: T.Object3D) {
  releaseArenaMaterials(root);
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>(),
    textures = new Set<T.Texture>();
  root.traverse((o) => {
    if (o instanceof T.InstancedMesh) o.dispose();
    if (o instanceof T.Mesh || o instanceof T.Sprite || o instanceof T.Line) {
      if ("geometry" in o) geometries.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        materials.add(m);
        for (const value of Object.values(m))
          if (value instanceof T.Texture) textures.add(value);
      }
    }
    if (
      o instanceof T.DirectionalLight ||
      o instanceof T.SpotLight ||
      o instanceof T.PointLight
    )
      o.shadow.dispose();
  });
  const bitmaps = new Set<{ close: () => void }>();
  textures.forEach((t) => {
    t.dispose();
    const image = t.image as { close?: () => void } | undefined;
    if (typeof image?.close === "function")
      bitmaps.add(image as { close: () => void });
  });
  bitmaps.forEach((image) => image.close());
  materials.forEach((m) => m.dispose());
  geometries.forEach((g) => g.dispose());
  root.clear();
}

/** Runtime engravings and neutral lighting around authored geometry; no socket plinths. */
export function prepareAuthoredEnvironment(
  group: T.Group,
  quality: "low" | "high",
) {
  const engraving = new T.MeshStandardMaterial({
    color: 0x667a68,
    roughness: 0.72,
    metalness: 0.22,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const outline = (w: number, d: number) => {
    const shape = new T.Shape();
    shape.moveTo(-w / 2, -d / 2);
    shape.lineTo(w / 2, -d / 2);
    shape.lineTo(w / 2, d / 2);
    shape.lineTo(-w / 2, d / 2);
    shape.closePath();
    const hole = new T.Path();
    const inset = 0.018;
    hole.moveTo(-w / 2 + inset, -d / 2 + inset);
    hole.lineTo(-w / 2 + inset, d / 2 - inset);
    hole.lineTo(w / 2 - inset, d / 2 - inset);
    hole.lineTo(w / 2 - inset, -d / 2 + inset);
    hole.closePath();
    shape.holes.push(hole);
    const geometry = new T.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  };
  const border = outline(CARD_WIDTH + 0.13, CARD_DEPTH + 0.13),
    circle = new T.RingGeometry(0.23, 0.245, 48);
  circle.rotateX(-Math.PI / 2);
  const strokes: T.BufferGeometry[] = [];
  for (let lane = 1; lane <= 5; lane++)
    for (const side of ["GOOD", "EVIL"] as const) {
      const a = cardAnchor(lane, side, "GOOD");
      a.y = 0.362;
      const transform = new T.Matrix4().makeTranslation(a.x, a.y, a.z);
      strokes.push(
        border.clone().applyMatrix4(transform),
        circle.clone().applyMatrix4(transform),
      );
    }
  const engravings = mergeGeometries(strokes, false);
  border.dispose();
  circle.dispose();
  strokes.forEach((stroke) => stroke.dispose());
  if (engravings) {
    const mesh = new T.Mesh(engravings, engraving);
    mesh.name = "slot-engravings";
    group.add(mesh);
  }
  const ambient = new T.HemisphereLight(0xd6e8ee, 0x829083, 1.85);
  group.add(ambient);
  const sun = new T.DirectionalLight(0xffebcc, 2.05);
  sun.position.set(-6, 12, 4);
  sun.castShadow = quality === "high";
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -11,
    right: 11,
    top: 10,
    bottom: -10,
    near: 1,
    far: 35,
  });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3;
  sun.shadow.intensity = 0.48;
  group.add(sun);
  const fill = new T.DirectionalLight(0xb7d9eb, 0.8);
  fill.position.set(7, 5, -4);
  group.add(fill);
}
