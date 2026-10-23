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
      surfaces.forEach((surface, index) => {
        surface.map = loaded;
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
    }
    texture.dispose();
  });
}

export function releaseArenaMaterials(root: T.Object3D) {
  root.traverse((object) => {
    owners.get(object)?.();
    owners.delete(object);
  });
}

/** Spatial surface detail remains visible when the GSAP-owned clock is held at zero. */
export function prepareCourtyardMaterials(
  group: T.Group,
  clock: { value: number },
): boolean {
  const surfaces = new Set<T.MeshStandardMaterial>();
  group.traverse((object) => {
    if (object instanceof T.Mesh)
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material])
        if (material instanceof T.MeshStandardMaterial) surfaces.add(material);
  });
  let animated = false;
  for (const material of surfaces) {
    const water = material.name === "water";
    const rune = material.name === "emissive";
    const canopy = ["stone-pale", "stone-dark", "bark", "foliage"].includes(
      material.name,
    );
    if (!water && !rune && !canopy) continue;
    animated ||= water || rune;
    if (water) {
      material.transparent = true;
      material.opacity = 0.78;
      material.depthWrite = false;
      material.roughness = 0.24;
      material.metalness = 0.08;
    }
    material.onBeforeCompile = (shader) => {
      shader.uniforms.arenaTime = clock;
      const header = "uniform float arenaTime;\nvarying vec3 vArenaPosition;\n";
      shader.vertexShader =
        header +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
        ${water ? "transformed.y += .005 * sin(position.x * 3.0 + position.z * 2.0 + arenaTime);" : ""}
        vArenaPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
        );
      shader.fragmentShader = header + shader.fragmentShader;
      if (water) {
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <color_fragment>",
            `#include <color_fragment>
            // Shallow banks reveal the real recessed bed; deeper channel centers stay teal.
            float bank = clamp(abs(abs(vArenaPosition.x) - (8.39 + sin(vArenaPosition.z * .41) * .18)) / .97, 0.0, 1.0);
            float flow = sin(vArenaPosition.z * 7.0 - arenaTime * 2.0 + sin(vArenaPosition.x * 9.0));
            float fineFlow = sin(vArenaPosition.z * 21.0 - vArenaPosition.x * 13.0 - arenaTime * 3.0);
            float depthTone = .59 + .16 * bank + .045 * flow;
            diffuseColor.rgb *= vec3(.64, .84, .84) * depthTone;
            // Elevated, sloped water sheets identify authored cascades without hardcoded locations.
            vec3 waterSlope = normalize(cross(dFdx(vArenaPosition), dFdy(vArenaPosition)));
            float spill = smoothstep(.045, .18, vArenaPosition.y);
            float foam = spill * (.12 + .28 * (1.0 - abs(waterSlope.y)));
            foam *= .35 + .65 * smoothstep(.1, .8, flow * fineFlow);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.48, .69, .63), foam);
            diffuseColor.a *= .88 + .10 * bank;`,
          )
          .replace(
            "#include <normal_fragment_maps>",
            `#include <normal_fragment_maps>
            vec3 ripple = vec3(
              .065 * cos(vArenaPosition.x * 8.0 + vArenaPosition.z * 4.0 + arenaTime),
              0.0,
              .055 * sin(vArenaPosition.z * 11.0 - vArenaPosition.x * 3.0 - arenaTime * 2.0));
            normal = normalize(normal + mat3(viewMatrix) * ripple);`,
          )
          .replace(
            "#include <roughnessmap_fragment>",
            `#include <roughnessmap_fragment>
            roughnessFactor = clamp(roughnessFactor + .04 * flow, .18, .32);`,
          );
      } else if (rune) {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= .96 + .04 * sin(arenaTime);",
        );
      } else {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          // Broad, low-contrast canopy light; no texture, extra pass or moving card shadow.
          float canopy = sin(vArenaPosition.x * .83 + sin(vArenaPosition.z * .71))
            * sin(vArenaPosition.z * 1.12 - vArenaPosition.x * .24);
          float shade = smoothstep(-.25, .65, canopy) * .075;
          diffuseColor.rgb *= vec3(1.0 - shade, 1.0 - shade * .77, 1.0 - shade * .60);`,
        );
      }
    };
    material.customProgramCacheKey = () =>
      `courtyard-surface-v2-${material.name}`;
    material.needsUpdate = true;
  }
  return animated;
}
