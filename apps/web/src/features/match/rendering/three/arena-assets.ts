import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { disposeObject } from "./environment";
export type ArenaMaterialRole =
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
interface MaterialSpec {
  baseColorUrl?: string;
  alphaTest?: number;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  transparent?: boolean;
  doubleSided?: boolean;
  emissiveIntensity?: number;
}
interface ArenaEntry {
  models: Record<
    "low" | "high",
    {
      url: string;
      sha256?: string;
      bytes?: number;
      triangles?: number;
      drawCalls?: number;
    }
  >;
  materials: Partial<Record<ArenaMaterialRole, MaterialSpec>>;
}
export class ArenaAssetError extends Error {
  constructor(
    readonly kind: "manifest" | "model" | "texture" | "aborted",
    cause?: unknown,
  ) {
    super(`Arena asset ${kind}`, { cause });
    this.name = "ArenaAssetError";
  }
}
type FetchAsset = (url: string, init?: RequestInit) => Promise<Response>;
export interface ArenaAssetOptions {
  signal: AbortSignal;
  fetch?: FetchAsset;
  parse?: (data: ArrayBuffer) => Promise<T.Group>;
  texture?: (url: string, signal: AbortSignal) => Promise<T.Texture>;
}
export interface LoadedArena {
  group: T.Group;
  dispose(): void;
}
/** Per-mount ownership: cancel fetch, reject late decodes, close ImageBitmaps exactly once. */
export async function loadArenaAssets(
  key: string,
  quality: "low" | "high",
  options: ArenaAssetOptions,
): Promise<LoadedArena | null> {
  const abort = new AbortController(),
    onAbort = () => abort.abort();
  options.signal.addEventListener("abort", onAbort, { once: true });
  if (options.signal.aborted) abort.abort();
  const fetchAsset = options.fetch ?? fetch;
  const textures = new Map<string, T.Texture>();
  let group: T.Group | undefined,
    released = false,
    stage: "manifest" | "model" | "texture" = "manifest";
  const guard = () => {
    if (abort.signal.aborted) throw new ArenaAssetError("aborted");
  };
  const dispose = () => {
    if (released) return;
    released = true;
    abort.abort();
    options.signal.removeEventListener("abort", onAbort);
    if (group) {
      group.traverse((o) => {
        if (o instanceof T.Mesh) {
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            if (
              m instanceof T.MeshStandardMaterial &&
              m.map &&
              [...textures.values()].includes(m.map)
            )
              m.map = null;
        }
      });
      disposeObject(group);
    }
    for (const texture of textures.values()) {
      texture.dispose();
      const source = texture.image as { close?: () => void } | undefined;
      source?.close?.();
    }
    textures.clear();
  };
  const get = async (url: string) => {
    guard();
    const res = await fetchAsset(url, { signal: abort.signal });
    if (!res.ok) throw Error(`Asset response ${res.status}`);
    return res;
  };
  try {
    const manifest = (await (
      await get("/assets/arenas-v2/manifest.json")
    ).json()) as { version?: string; arenas?: Record<string, ArenaEntry> };
    guard();
    if (manifest.version !== "arenas-v2" || !manifest.arenas)
      throw Error("Invalid arena manifest");
    const entry = manifest.arenas[key];
    if (!entry) {
      options.signal.removeEventListener("abort", onAbort);
      if (key === "moonroot-conservatory")
        throw Error("Moonroot model missing");
      return null;
    }
    stage = "model";
    const model = entry.models?.[quality];
    if (!model?.url) throw Error("Model quality missing");
    const bytes = await (await get(model.url)).arrayBuffer();
    guard();
    group = await (
      options.parse ??
      (async (data) => (await new GLTFLoader().parseAsync(data, "")).scene)
    )(bytes);
    guard();
    group.name = key;
    group.userData.authored = true;
    stage = "texture";
    const loadTexture =
      options.texture ??
      (async (url: string, signal: AbortSignal) => {
        const response = await fetchAsset(url, { signal });
        if (!response.ok) throw Error(`Texture response ${response.status}`);
        const bitmap = await createImageBitmap(await response.blob());
        if (signal.aborted) {
          bitmap.close();
          throw new ArenaAssetError("aborted");
        }
        const texture = new T.Texture(bitmap);
        texture.flipY = false;
        texture.colorSpace = T.SRGBColorSpace;
        texture.anisotropy = quality === "high" ? 4 : 1;
        texture.needsUpdate = true;
        return texture;
      });
    // Sequential unique maps keep cancellation/ownership explicit; only this arena is requested.
    for (const spec of Object.values(entry.materials ?? {})) {
      if (!spec?.baseColorUrl || textures.has(spec.baseColorUrl)) continue;
      const texture = await loadTexture(spec.baseColorUrl, abort.signal);
      textures.set(spec.baseColorUrl, texture);
      guard();
    }
    group.traverse((o) => {
      if (!(o instanceof T.Mesh)) return;
      o.castShadow = quality === "high";
      o.receiveShadow = true;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (!(m instanceof T.MeshStandardMaterial)) continue;
        const spec = entry.materials?.[m.name as ArenaMaterialRole];
        if (!spec) continue;
        if (spec.baseColorUrl && m.userData.baseColorTexture !== false)
          m.map = textures.get(spec.baseColorUrl)!;
        for (const property of [
          "roughness",
          "metalness",
          "opacity",
          "alphaTest",
          "emissiveIntensity",
        ] as const)
          if (typeof spec[property] === "number") m[property] = spec[property]!;
        if (spec.transparent !== undefined) m.transparent = spec.transparent;
        if (spec.doubleSided) m.side = T.DoubleSide;
        if (m.map && (m.name === "stone-pale" || m.name === "bark"))
          m.map.wrapS = m.map.wrapT = T.RepeatWrapping;
        if (m.name === "foliage") {
          m.side = T.DoubleSide;
          m.alphaTest = spec.alphaTest ?? 0.45;
          m.transparent = false;
        }
        if (m.name === "water" || m.name === "emissive") o.castShadow = false;
        m.needsUpdate = true;
      }
    });
    group.userData.materialStatus = "ready";
    return { group, dispose };
  } catch (error) {
    const aborted = abort.signal.aborted;
    dispose();
    throw error instanceof ArenaAssetError
      ? error
      : new ArenaAssetError(aborted ? "aborted" : stage, error);
  }
}
