import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Box3, Mesh } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { materialRoles } from "./geometry.js";
import { buildMoonroot, moonrootParameters, type Quality } from "./moonroot.js";

// GLTFExporter uses FileReader for its final binary Blob even with no embedded images.
class ExportFileReader {
  result: ArrayBuffer | string | null = null;
  onloadend: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  readAsArrayBuffer(blob: Blob): void {
    void blob
      .arrayBuffer()
      .then((value) => {
        this.result = value;
        this.onloadend?.();
      })
      .catch((error: unknown) => this.onerror?.(error));
  }
  readAsDataURL(blob: Blob): void {
    void blob
      .arrayBuffer()
      .then((value) => {
        this.result = `data:${blob.type};base64,${Buffer.from(value).toString("base64")}`;
        this.onloadend?.();
      })
      .catch((error: unknown) => this.onerror?.(error));
  }
}
Object.defineProperty(globalThis, "FileReader", {
  value: ExportFileReader,
  configurable: true,
});

const publicRoot = resolve("apps/web/public/assets/arenas-v2");
const arenaDir = resolve(publicRoot, "moonroot-conservatory");
const sourceDir = resolve("assets/source/arenas-v2");
await mkdir(arenaDir, { recursive: true });
await mkdir(sourceDir, { recursive: true });
const models: Record<
  string,
  {
    url: string;
    sha256: string;
    bytes: number;
    triangles: number;
    drawCalls: number;
  }
> = {};
let landmarks: ReturnType<typeof buildMoonroot>["landmarks"] = [];
const bounds = new Box3();
for (const quality of ["high", "low"] as Quality[]) {
  const authored = buildMoonroot(quality);
  let triangles = 0,
    drawCalls = 0;
  authored.scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    triangles +=
      (object.geometry.index?.count ??
        object.geometry.getAttribute("position").count) / 3;
    drawCalls += Math.max(1, object.geometry.groups.length);
  });
  if (triangles > (quality === "high" ? 160_000 : 60_000))
    throw new Error(`${quality} triangle budget exceeded: ${triangles}`);
  if (drawCalls > (quality === "high" ? 45 : 30))
    throw new Error(`${quality} draw-call budget exceeded: ${drawCalls}`);
  const glb = await new GLTFExporter().parseAsync(authored.scene, {
    binary: true,
    onlyVisible: true,
    trs: false,
  });
  if (!(glb instanceof ArrayBuffer))
    throw new Error("Binary GLB export required");
  const bytes = Buffer.from(glb);
  await writeFile(resolve(arenaDir, `${quality}.glb`), bytes);
  models[quality] = {
    url: `/assets/arenas-v2/moonroot-conservatory/${quality}.glb`,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
    triangles,
    drawCalls,
  };
  bounds.union(authored.bounds);
  if (quality === "high") landmarks = authored.landmarks;
  else
    for (const landmark of authored.landmarks) {
      const stored = landmarks.find((entry) => entry.name === landmark.name)!;
      for (let i = 0; i < 3; i += 1) {
        stored.bounds.min[i] = Math.min(
          stored.bounds.min[i]!,
          landmark.bounds.min[i]!,
        );
        stored.bounds.max[i] = Math.max(
          stored.bounds.max[i]!,
          landmark.bounds.max[i]!,
        );
      }
    }
  authored.scene.traverse((object) => {
    if (object instanceof Mesh) object.geometry.dispose();
  });
  console.log(
    `${quality}: ${triangles.toLocaleString()} triangles, ${drawCalls} draws, ${(bytes.length / 1_000_000).toFixed(3)} MB`,
  );
}
let previous: { version: string; arenas: Record<string, unknown> } = {
  version: "arenas-v2",
  arenas: {},
};
try {
  previous = JSON.parse(
    await readFile(resolve(publicRoot, "manifest.json"), "utf8"),
  );
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
const manifest = {
  version: "arenas-v2",
  coordinateSystem: "Y-up; world units; courtyard center origin",
  arenas: {
    ...previous.arenas,
    "moonroot-conservatory": {
      models,
      bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
      landmarks,
      materials: materialRoles,
      surfaceY: 0.36,
    },
  },
};
await writeFile(
  resolve(publicRoot, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
await writeFile(
  resolve(sourceDir, "moonroot-geometry.json"),
  `${JSON.stringify({ ...moonrootParameters, tools: { three: "0.186.1", exporter: "GLTFExporter", build: "pnpm exec tsx tools/assets/arenas/build-arena.ts", validate: "pnpm exec tsx tools/assets/arenas/validate-arena.ts" }, artisticSource: "docs/design/concepts/moonroot-battlefield-v3-concept.png", authorship: "Deterministically authored geometry; no image-derived displacement, baked cards, UI or painted-perspective scenery.", models }, null, 2)}\n`,
);
