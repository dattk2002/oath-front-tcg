import { expect, it } from "vitest";
import * as T from "three";
import { loadArenaAssets } from "../src/features/match/rendering/three/arena-assets";
import type { PublicCatalog } from "@oathfront/contracts";
import {
  createArenaPicker,
  createDragFeedback,
} from "../src/features/match/rendering/three/interaction";
import {
  cardAnchor,
  createCamera,
} from "../src/features/match/rendering/three/layout";
import { response } from "./fixtures";
const manifest = {
  version: "arenas-v2",
  arenas: {
    "moonroot-conservatory": {
      models: { low: { url: "/low.glb" }, high: { url: "/high.glb" } },
      materials: {
        "stone-pale": { baseColorUrl: "/stone.webp", roughness: 0.9 },
      },
    },
  },
};
const fetcher = async (url: string) =>
  new Response(
    url.endsWith("manifest.json")
      ? JSON.stringify(manifest)
      : new Uint8Array([1, 2]),
  );
it("loads only the selected quality and preserves authored colors while owning texture and bitmap disposal", async () => {
  const group = new T.Group(),
    material = new T.MeshStandardMaterial({
      name: "stone-pale",
      color: 0xc7d2d1,
      vertexColors: true,
    });
  group.add(new T.Mesh(new T.BoxGeometry(), material));
  const original = material.color.clone();
  let closes = 0,
    disposes = 0;
  const texture = new T.Texture({
    close() {
      closes++;
    },
  });
  texture.addEventListener("dispose", () => disposes++);
  const urls: string[] = [];
  const loaded = await loadArenaAssets("moonroot-conservatory", "low", {
    signal: new AbortController().signal,
    fetch: async (url) => {
      urls.push(url);
      return fetcher(url);
    },
    parse: async () => group,
    texture: async () => texture,
  });
  expect(urls).toEqual(["/assets/arenas-v2/manifest.json", "/low.glb"]);
  expect(material.color).toEqual(original);
  expect(material.vertexColors).toBe(true);
  expect(material.map).toBe(texture);
  expect(material.bumpMap).toBeNull();
  loaded!.dispose();
  loaded!.dispose();
  expect(closes).toBe(1);
  expect(disposes).toBe(1);
});
it("disposes a GLB that finishes decoding after cancellation and never starts its textures", async () => {
  const abort = new AbortController();
  const group = new T.Group();
  const geometry = new T.BoxGeometry();
  group.add(new T.Mesh(geometry, new T.MeshStandardMaterial()));
  let disposed = 0,
    textures = 0;
  geometry.addEventListener("dispose", () => disposed++);
  let finish!: (g: T.Group) => void;
  let began!: () => void;
  const started = new Promise<void>((r) => (began = r));
  const promise = loadArenaAssets("moonroot-conservatory", "high", {
    signal: abort.signal,
    fetch: fetcher,
    parse: () => {
      began();
      return new Promise((r) => (finish = r));
    },
    texture: async () => {
      textures++;
      return new T.Texture();
    },
  });
  await started;
  abort.abort();
  finish(group);
  await expect(promise).rejects.toMatchObject({ kind: "aborted" });
  expect(disposed).toBe(1);
  expect(textures).toBe(0);
});
it("picks exact projected surfaces, filters overlapping identities, and never snaps outside the board", () => {
  const picker = createArenaPicker();
  const view = response().view;
  view.board[0]!.good = {
    instanceId: "one",
    owner: "GOOD",
    laneId: 1,
  } as NonNullable<(typeof view.board)[0]["good"]>;
  picker.update(view);
  const camera = createCamera(1000, 650),
    rect = { left: 30, top: 40, width: 1000, height: 650 };
  const p = cardAnchor(1, "GOOD", "GOOD").project(camera);
  const x = rect.left + ((p.x + 1) * rect.width) / 2,
    y = rect.top + ((1 - p.y) * rect.height) / 2;
  const slot = { kind: "SLOT", side: "GOOD", laneId: 1 } as const,
    lane = { kind: "LANE", laneId: 1 } as const,
    unit = { kind: "UNIT", instanceId: "one" } as const;
  expect(picker.pick(x, y, [slot, lane], camera, rect)).toEqual([slot, lane]);
  expect(picker.pick(x, y, [unit], camera, rect)).toEqual([unit]);
  expect(picker.pick(rect.left - 1, y, [slot], camera, rect)).toEqual([]);
  expect(picker.pick(x, y, [], camera, rect)).toEqual([]);
  picker.dispose();
  expect(picker.pick(x, y, [slot], camera, rect)).toEqual([]);
});

it("rejects missing selected geometry with a typed load phase and allows an independent retry", async () => {
  await expect(
    loadArenaAssets("moonroot-conservatory", "low", {
      signal: new AbortController().signal,
      fetch: async () => new Response("", { status: 404 }),
    }),
  ).rejects.toMatchObject({ kind: "manifest" });
  const retry = await loadArenaAssets("moonroot-conservatory", "low", {
    signal: new AbortController().signal,
    fetch: fetcher,
    parse: async () => new T.Group(),
    texture: async () => new T.Texture(),
  });
  expect(retry?.group.userData.authored).toBe(true);
  retry!.dispose();
});
it("closes a texture decoded after abort without installing it on an authored material", async () => {
  const controller = new AbortController(),
    group = new T.Group(),
    material = new T.MeshStandardMaterial({ name: "stone-pale" });
  group.add(new T.Mesh(new T.BoxGeometry(), material));
  let close = 0,
    dispose = 0,
    resolveTexture!: (t: T.Texture) => void,
    started!: () => void;
  const began = new Promise<void>((r) => (started = r));
  const pending = loadArenaAssets("moonroot-conservatory", "low", {
    signal: controller.signal,
    fetch: fetcher,
    parse: async () => group,
    texture: () => {
      started();
      return new Promise((r) => (resolveTexture = r));
    },
  });
  await began;
  controller.abort();
  const texture = new T.Texture({
    close() {
      close++;
    },
  });
  texture.addEventListener("dispose", () => dispose++);
  resolveTexture(texture);
  await expect(pending).rejects.toMatchObject({ kind: "aborted" });
  expect(material.map).toBeNull();
  expect(close).toBe(1);
  expect(dispose).toBe(1);
});
it("honors both faction orientations, exact slot edges and the central cast zone", () => {
  const picker = createArenaPicker(),
    view = response().view;
  view.self.side = "EVIL";
  picker.update(view);
  const camera = createCamera(375, 540),
    rect = { left: 18, top: 64, width: 375, height: 540 };
  const point = (a: T.Vector3) => {
    const p = a.project(camera);
    return [
      rect.left + ((p.x + 1) * rect.width) / 2,
      rect.top + ((1 - p.y) * rect.height) / 2,
    ] as const;
  };
  const allowed = [
    { kind: "SLOT", side: "EVIL", laneId: 5 },
    { kind: "CAST" },
  ] as const;
  const center = cardAnchor(5, "EVIL", "EVIL");
  const inside = point(center.clone().add(new T.Vector3(0.849, 0, 0))),
    outside = point(center.clone().add(new T.Vector3(0.86, 0, 0)));
  expect(picker.pick(...inside, allowed, camera, rect)).toEqual([allowed[0]]);
  expect(picker.pick(...outside, allowed, camera, rect)).toEqual([]);
  expect(
    picker.pick(...point(new T.Vector3(0, 0.38, 0)), allowed, camera, rect),
  ).toEqual([allowed[1]]);
  picker.dispose();
});

it("retains procedural fallback for an arena not yet authored and never fetches another arena model", async () => {
  const requested: string[] = [];
  const loaded = await loadArenaAssets("cinder-foundry", "high", {
    signal: new AbortController().signal,
    fetch: async (url) => {
      requested.push(url);
      return fetcher(url);
    },
    parse: async () => {
      throw Error("Must not decode unrelated model");
    },
  });
  expect(loaded).toBeNull();
  expect(requested).toEqual(["/assets/arenas-v2/manifest.json"]);
});

it("keeps unit target perimeters above opaque cards and shows the full legal lane band", () => {
  const view = response().view;
  view.board[0]!.good = {
    instanceId: "target",
    owner: "GOOD",
    laneId: 1,
  } as NonNullable<(typeof view.board)[number]["good"]>;
  const picker = createArenaPicker();
  const feedback = createDragFeedback(
    { cards: [], tokens: [] } as unknown as PublicCatalog,
    "low",
    () => {},
    picker,
  );
  const unit = { kind: "UNIT", instanceId: "target" } as const;
  const lane = { kind: "LANE", laneId: 1 } as const;
  feedback.update(
    {
      definitionId: "trick",
      instanceId: "source",
      clientX: 0,
      clientY: 0,
      allowedHits: [unit, lane],
      hoveredHit: unit,
      valid: true,
    },
    view,
  );
  const perimeter = feedback.group.children[0] as T.Mesh<
    T.BufferGeometry,
    T.MeshBasicMaterial
  >;
  const band = feedback.group.children[1] as T.Mesh;
  expect(perimeter.visible).toBe(true);
  expect(perimeter.position.y).toBeGreaterThan(0.441);
  expect(perimeter.scale.x).toBeGreaterThan(1.7);
  expect(perimeter.scale.z).toBeGreaterThan(2.35);
  expect(perimeter.material.depthTest).toBe(false);
  expect(perimeter.renderOrder).toBeGreaterThan(0);
  expect(band.scale.z).toBe(6.45);
  feedback.dispose();
  picker.dispose();
});

it("preserves authored broad leaves that opt out of the shared fern alpha texture", async () => {
  const foliageManifest = structuredClone(manifest);
  foliageManifest.arenas["moonroot-conservatory"].materials = {
    foliage: { baseColorUrl: "/fern.webp", roughness: 0.9 },
  } as unknown as (typeof foliageManifest.arenas)["moonroot-conservatory"]["materials"];
  const group = new T.Group();
  const fern = new T.MeshStandardMaterial({ name: "foliage" });
  const leaf = new T.MeshStandardMaterial({
    name: "foliage",
    vertexColors: true,
  });
  leaf.userData.baseColorTexture = false;
  group.add(
    new T.Mesh(new T.PlaneGeometry(), fern),
    new T.Mesh(new T.PlaneGeometry(), leaf),
  );
  const texture = new T.Texture();
  const loaded = await loadArenaAssets("moonroot-conservatory", "low", {
    signal: new AbortController().signal,
    fetch: async (url) =>
      url.endsWith("manifest.json")
        ? new Response(JSON.stringify(foliageManifest))
        : fetcher(url),
    parse: async () => group,
    texture: async () => texture,
  });
  expect(fern.map).toBe(texture);
  expect(leaf.map).toBeNull();
  expect(leaf.vertexColors).toBe(true);
  expect(leaf.side).toBe(T.DoubleSide);
  loaded!.dispose();
});
