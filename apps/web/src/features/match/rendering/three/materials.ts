import * as T from "three";

const materials = {
  "moonroot-conservatory": "moonroot",
  "cinder-foundry": "cinder",
  "glasswater-sanctum": "glasswater",
  "astral-causeway": "astral",
} as const;
const owners = new WeakMap<T.Object3D, () => void>();
type LoadTexture = (
  path: string,
  loaded: (texture: T.Texture) => void,
  failed: () => void,
) => T.Texture;

/** One map owner also cancels late image installation after a scene is disposed. */
export function attachArenaMaterial(
  group: T.Group,
  key: string,
  surfaces: readonly T.MeshStandardMaterial[],
  quality: "low" | "high",
  changed: () => void,
  load: LoadTexture = (path, loaded, failed) =>
    new T.TextureLoader().load(path, loaded, undefined, failed),
) {
  let active = true;
  let bump: T.Texture | undefined;
  const source =
    materials[key as keyof typeof materials] ??
    materials["moonroot-conservatory"];
  group.userData.materialStatus = "loading";
  const texture = load(
    `/assets/arena-materials-v1/${source}.webp`,
    (loaded) => {
      if (!active) return;
      loaded.colorSpace = T.SRGBColorSpace;
      loaded.wrapS = loaded.wrapT = T.ClampToEdgeWrapping;
      loaded.anisotropy = quality === "high" ? 4 : 1;
      bump = loaded.clone();
      bump.colorSpace = T.NoColorSpace;
      bump.needsUpdate = true;
      surfaces.forEach((surface, index) => {
        surface.map = loaded;
        surface.bumpMap = bump!;
        surface.bumpScale = index === 0 ? 0.055 : 0.025;
        surface.color.setHex(index === 0 ? 0xffffff : 0x5a6267);
        surface.needsUpdate = true;
      });
      group.userData.materialStatus = "ready";
      changed();
    },
    () => {
      if (!active) return;
      group.userData.materialStatus = "fallback";
      changed();
    },
  );
  owners.set(group, () => {
    if (!active) return;
    active = false;
    // Detach owned maps before generic graph disposal visits shared materials.
    for (const surface of surfaces) {
      if (surface.map === texture) surface.map = null;
      if (surface.bumpMap === bump) surface.bumpMap = null;
    }
    texture.dispose();
    bump?.dispose();
  });
}

export function releaseArenaMaterials(root: T.Object3D) {
  root.traverse((object) => {
    owners.get(object)?.();
    owners.delete(object);
  });
}
