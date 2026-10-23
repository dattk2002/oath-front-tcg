import { expect, it } from "vitest";
import * as T from "three";
import {
  attachArenaMaterial,
  prepareCourtyardMaterials,
  releaseArenaMaterials,
} from "../src/features/match/rendering/three/materials";

it("installs the selected original arena texture once and releases shared maps exactly once", () => {
  const group = new T.Group();
  const scene = new T.Scene();
  scene.add(group);
  const surfaces = [new T.MeshStandardMaterial(), new T.MeshStandardMaterial()];
  const texture = new T.Texture();
  let loaded!: (texture: T.Texture) => void;
  let path = "";
  let renders = 0;
  let releases = 0;
  texture.addEventListener("dispose", () => releases++);
  attachArenaMaterial(
    group,
    "astral-causeway",
    surfaces,
    "high",
    () => renders++,
    (url, done) => {
      path = url;
      loaded = done;
      return texture;
    },
  );
  expect(surfaces[0]!.map).toBeNull();
  expect(path).toBe("/assets/arena-materials-v1/astral.webp");
  loaded(texture);
  expect(surfaces.every((surface) => surface.map === texture)).toBe(true);
  expect(texture.colorSpace).toBe(T.SRGBColorSpace);
  expect(texture.wrapS).toBe(T.ClampToEdgeWrapping);
  expect(surfaces[0]!.bumpMap).toBeNull();
  expect(renders).toBe(1);
  releaseArenaMaterials(scene);
  releaseArenaMaterials(scene);
  expect(
    surfaces.every(
      (surface) => surface.map === null && surface.bumpMap === null,
    ),
  ).toBe(true);
  expect(releases).toBe(1);
});

it("does not install a late arena image or request another frame after disposal", () => {
  const group = new T.Group();
  const surface = new T.MeshStandardMaterial();
  const texture = new T.Texture();
  let loaded!: (texture: T.Texture) => void;
  let failed!: () => void;
  let renders = 0;
  attachArenaMaterial(
    group,
    "moonroot-conservatory",
    [surface],
    "low",
    () => renders++,
    (_url, done, error) => {
      loaded = done;
      failed = error;
      return texture;
    },
  );
  releaseArenaMaterials(group);
  loaded(texture);
  failed();
  expect(surface.map).toBeNull();
  expect(surface.bumpMap).toBeNull();
  expect(renders).toBe(0);
});

it("adds water surface detail without replacing authored colors, maps or geometry", () => {
  const group = new T.Group();
  const water = new T.MeshStandardMaterial({
    name: "water",
    color: 0x43aead,
    vertexColors: true,
  });
  const stone = new T.MeshStandardMaterial({
    name: "stone-pale",
    color: 0xeee8dc,
  });
  const geometry = new T.PlaneGeometry(2, 2);
  group.add(new T.Mesh(geometry, water), new T.Mesh(geometry, stone));
  const original = water.color.clone();
  const clock = { value: 0 };
  expect(prepareCourtyardMaterials(group, clock)).toBe(true);
  expect(group.children).toHaveLength(2);
  expect(water.color).toEqual(original);
  expect(water.vertexColors).toBe(true);
  expect(water.transparent).toBe(true);
  expect(water.depthWrite).toBe(false);
  expect(water.bumpMap).toBeNull();
  expect(water.map).toBeNull();
  const shader = {
    uniforms: {},
    vertexShader: T.ShaderLib.standard.vertexShader,
    fragmentShader: T.ShaderLib.standard.fragmentShader,
  };
  water.onBeforeCompile(
    shader as Parameters<typeof water.onBeforeCompile>[0],
    {} as T.WebGLRenderer,
  );
  expect(shader.uniforms).toMatchObject({ arenaTime: clock });
  expect(shader.fragmentShader).toContain("#include <normal_fragment_maps>");
  expect(shader.fragmentShader).toContain("#include <lights_fragment_begin>");
  // Low/reduced motion uses the identical detailed surface with a clock that stays zero.
  expect(clock.value).toBe(0);
  geometry.dispose();
  water.dispose();
  stone.dispose();
});
