import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Box3, Mesh, Raycaster, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type Bounds = { min: [number, number, number]; max: [number, number, number] };
type Model = {
  url: string;
  sha256: string;
  bytes: number;
  triangles: number;
  drawCalls: number;
};
type ArenaEntry = {
  models: Record<"high" | "low", Model>;
  materials: Record<string, { baseColorUrl?: string }>;
  landmarks: { name: string; bounds: Bounds }[];
  bounds: Bounds;
};
const publicRoot = resolve("apps/web/public");
const geometryOnly = process.argv.includes("--geometry-only");
const manifest: { version: string; arenas: Record<string, ArenaEntry> } =
  JSON.parse(
    await readFile(
      resolve(publicRoot, "assets/arenas-v2/manifest.json"),
      "utf8",
    ),
  );
assert.equal(manifest.version, "arenas-v2");
const roles = new Set([
  "stone-pale",
  "stone-dark",
  "trim-brass",
  "bark",
  "foliage",
  "groundcover",
  "water",
  "emissive",
  "metal",
  "crystal",
]);
const reports: unknown[] = [];
for (const [arenaKey, entry] of Object.entries(manifest.arenas)) {
  for (const quality of ["high", "low"] as const) {
    const info = entry.models[quality];
    const bytes = await readFile(resolve(publicRoot, info.url.slice(1)));
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      info.sha256,
      `${arenaKey}/${quality} hash`,
    );
    assert.equal(bytes.length, info.bytes, "download byte count");
    const parsed = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
    );
    parsed.scene.updateMatrixWorld(true);
    let triangles = 0;
    let drawCalls = 0;
    const materials = new Set<string>();
    parsed.scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const geometry = object.geometry;
      const position = geometry.getAttribute("position");
      const normal = geometry.getAttribute("normal");
      const uv = geometry.getAttribute("uv");
      assert(
        position && normal && uv,
        `${object.name}: position, normal and ordinary UV are mandatory`,
      );
      assert.equal(position.count, normal.count);
      assert.equal(position.count, uv.count);
      for (const attribute of [position, normal, uv]) {
        for (const value of attribute.array)
          assert(
            Number.isFinite(value),
            `${object.name}: finite vertex attributes`,
          );
      }
      for (let i = 0; i < normal.count; i += 1) {
        const length = Math.hypot(
          normal.getX(i),
          normal.getY(i),
          normal.getZ(i),
        );
        assert(
          length > 0.98 && length < 1.02,
          `${object.name}: valid normal at ${i}: ${length}`,
        );
      }
      const assigned = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of assigned) {
        assert(
          roles.has(material.name),
          `unknown material role ${material.name}`,
        );
        materials.add(material.name);
      }
      triangles += (geometry.index?.count ?? position.count) / 3;
      drawCalls += Math.max(1, geometry.groups.length);
      if (object.parent?.name !== "courtyard") {
        for (let i = 0; i < position.count; i += 1) {
          const vertex = new Vector3()
            .fromBufferAttribute(position, i)
            .applyMatrix4(object.matrixWorld);
          assert(
            Math.abs(vertex.x) >= 6.399 || Math.abs(vertex.z) >= 3.799,
            `${object.name}: architecture obstructs playable rectangle`,
          );
        }
      }
    });
    assert.equal(triangles, info.triangles, "manifest triangles");
    assert.equal(drawCalls, info.drawCalls, "manifest draw calls");
    assert(
      triangles <= (quality === "high" ? 160_000 : 60_000),
      "triangle budget",
    );
    assert(drawCalls <= (quality === "high" ? 45 : 30), "draw call budget");
    const textureUrls = [
      ...new Set(
        Object.values(entry.materials)
          .map((value) => value.baseColorUrl)
          .filter(Boolean),
      ),
    ] as string[];
    let textureBytes = 0;
    let textureMemory = 0;
    const missingTextures: string[] = [];
    for (const url of textureUrls) {
      try {
        const texture = await readFile(resolve(publicRoot, url.slice(1)));
        textureBytes += texture.length;
        const type = texture.toString("ascii", 12, 16);
        let width = 0,
          height = 0;
        if (type === "VP8X") {
          width = texture.readUIntLE(24, 3) + 1;
          height = texture.readUIntLE(27, 3) + 1;
        } else if (type === "VP8 ") {
          width = texture.readUInt16LE(26) & 0x3fff;
          height = texture.readUInt16LE(28) & 0x3fff;
        } else if (type === "VP8L") {
          const bits = texture.readUInt32LE(21);
          width = (bits & 0x3fff) + 1;
          height = ((bits >>> 14) & 0x3fff) + 1;
        }
        assert(width > 0 && height > 0, `${url}: decodable WebP dimensions`);
        textureMemory += Math.ceil((width * height * 4 * 4) / 3);
      } catch {
        missingTextures.push(url);
      }
    }
    assert(
      geometryOnly || missingTextures.length === 0,
      `missing or invalid material textures: ${missingTextures.join(", ")}`,
    );
    assert(
      bytes.length + textureBytes <=
        (quality === "high" ? 8_000_000 : 3_000_000),
      "selected arena geometry plus texture byte budget",
    );
    assert(
      textureMemory <= (quality === "high" ? 72 : 20) * 1024 * 1024,
      "decoded RGBA and mipmap memory budget",
    );
    const courtyard = parsed.scene.getObjectByName("courtyard");
    assert(courtyard, "continuous courtyard landmark");
    for (const x of [-6.3, -4.8, -2.4, 0, 2.4, 4.8, 6.3]) {
      for (const z of [-3.7, -2.05, 0, 2.05, 3.7]) {
        const hits = new Raycaster(
          new Vector3(x, 3, z),
          new Vector3(0, -1, 0),
        ).intersectObject(courtyard, true);
        assert(
          hits.length && Math.abs(hits[0]!.point.y - 0.36) < 0.045,
          `continuous supported card plane at ${x},${z}`,
        );
      }
    }
    for (const name of [
      "arch-west",
      "statue-east",
      "root-banks",
      "water-channels",
      "fern-banks",
      "boundary-masonry",
    ]) {
      assert(
        parsed.scene.getObjectByName(name),
        `recognizable landmark ${name}`,
      );
      assert(
        entry.landmarks.some((landmark) => landmark.name === name),
        `landmark bounds for ${name}`,
      );
    }
    const portal = parsed.scene.getObjectByName("arch-west")!;
    const opening = new Raycaster(
      new Vector3(-7.486, 0.92, 0.448),
      new Vector3(-0.314, 0, -0.949).normalize(),
      0,
      5,
    ).intersectObject(portal, true);
    assert.equal(
      opening.length,
      0,
      "the west arch has an unobstructed physical opening above its water channel",
    );
    const bounds = new Box3().setFromObject(parsed.scene);
    const declared = new Box3(
      new Vector3(...(entry.bounds.min as [number, number, number])),
      new Vector3(...(entry.bounds.max as [number, number, number])),
    );
    assert(
      declared.expandByScalar(0.001).containsBox(bounds),
      "measured world bounds fit the declared high/low union",
    );
    reports.push({
      arenaKey,
      quality,
      triangles,
      drawCalls,
      bytes: bytes.length,
      textureBytes,
      textureMemory,
      missingTextures,
      roles: [...materials],
      bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
    });
  }
}
console.log(JSON.stringify({ valid: true, geometryOnly, reports }, null, 2));
