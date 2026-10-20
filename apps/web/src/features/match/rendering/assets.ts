import { Graphics, type Application, Texture, Rectangle } from "pixi.js";
import type { AssetBundle } from "./asset-manifest";
/** Shared crop/foot anchor contract for temporary geometry and Task15 cutouts. */
export const unitArtBounds = {
  width: 128,
  height: 160,
  anchor: { x: 0.5, y: 1 },
  cropSafe: { x: 8, y: 8, width: 112, height: 144 },
  atlasGroup: "units",
} as const;
export type BattleAssets = AssetBundle | { kind: "PLACEHOLDER" };
export const placeholderAssets: BattleAssets = { kind: "PLACEHOLDER" };
/** Shared original alpha art frames; pages own their GPU resources for one scene. */
export function createIllustratedTextures(
  app: Application,
  assets: AssetBundle,
) {
  const fallback = createPlaceholderTextures(app);
  const pages: Texture[] = [];
  const frames: Texture[] = [];
  for (const atlas of assets.atlases) {
    const image = assets.images.get(atlas.url);
    if (!image) continue;
    const page = Texture.from(image);
    pages.push(page);
    for (const [id, frame] of Object.entries(atlas.frames)) {
      const texture = new Texture({
        source: page.source,
        frame: new Rectangle(frame.x, frame.y, frame.width, frame.height),
      });
      frames.push(texture);
      fallback.textures.set(id, texture);
    }
  }
  return {
    textures: fallback.textures,
    dispose() {
      // Remove frame entries before the fallback owner releases its generated textures.
      for (const atlas of assets.atlases)
        for (const id of Object.keys(atlas.frames))
          fallback.textures.delete(id);
      frames.forEach((frame) => frame.destroy(false));
      pages.forEach((page) => page.destroy(true));
      fallback.dispose();
      assets.dispose();
    },
  };
}
export function createPlaceholderTextures(app: Application) {
  const textures = new Map<string, Texture>();
  const dispose = () => {
    textures.forEach((texture) => texture.destroy(true));
    textures.clear();
  };
  const generate = (shape: Graphics, frame?: Rectangle) => {
    try {
      return app.renderer.generateTexture(
        frame ? { target: shape, frame } : shape,
      );
    } finally {
      shape.destroy();
    }
  };
  try {
    for (const [side, color] of [
      ["GOOD", 0x76d9c4],
      ["EVIL", 0xffb078],
    ] as const) {
      const shape = new Graphics()
        .circle(64, 37, 22)
        .fill(color)
        .poly([40, 63, 88, 63, 112, 144, 16, 144])
        .fill({ color, alpha: 0.8 })
        .roundRect(8, 148, 112, 4, 2)
        .fill({ color, alpha: 0.45 });
      textures.set(
        side,
        generate(
          shape,
          new Rectangle(0, 0, unitArtBounds.width, unitArtBounds.height),
        ),
      );
    }
    // The complete public terrain pool is independent of unrevealed assignments.
    for (const id of [
      "ancient_forest",
      "volcano",
      "storm_peak",
      "frozen_lake",
      "desert",
      "healing_spring",
      "ruined_arena",
      "quiet_meadow",
    ]) {
      const shape = new Graphics()
        .roundRect(0, 0, 96, 24, 6)
        .fill({ color: 0x283e49, alpha: 0.7 })
        .poly([4, 22, 24, 6, 42, 18, 64, 3, 92, 22])
        .stroke({ color: 0xf4cb76, width: 1 });
      textures.set(id, generate(shape));
    }
  } catch (error) {
    dispose();
    throw error;
  }
  return { textures, dispose };
}
