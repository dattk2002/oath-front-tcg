import { expect, it } from "vitest";
import * as T from "three";
import {
  attachArenaMaterial,
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
  expect(surfaces[0]!.bumpMap?.colorSpace).toBe(T.NoColorSpace);
  expect(renders).toBe(1);
  let bumpReleases = 0;
  surfaces[0]!.bumpMap!.addEventListener("dispose", () => bumpReleases++);
  releaseArenaMaterials(scene);
  releaseArenaMaterials(scene);
  expect(
    surfaces.every(
      (surface) => surface.map === null && surface.bumpMap === null,
    ),
  ).toBe(true);
  expect(releases).toBe(1);
  expect(bumpReleases).toBe(1);
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
