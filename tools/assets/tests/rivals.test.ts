import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { coreCatalog } from "../../../packages/game-content/src/catalog.js";
import {
  artById,
  battleAssetRequests,
  resolveArt,
} from "../../../apps/web/src/features/match/rendering/asset-manifest.js";

it("resolves all six hero identities to bounded versioned art while preserving core fallback", () => {
  for (const hero of coreCatalog.heroes) {
    for (const variant of ["thumb", "hud", "inspect", "bust"]) {
      const art = resolveArt(hero.portraitKey, hero.id, variant);
      expect(art.src).toMatch(/^\/assets\/rivals-v2\/heroes\//);
      expect(existsSync(`apps/web/public${art.src}`)).toBe(true);
    }
  }
  expect(resolveArt("missing.webp", "Named fallback")).toEqual({
    src: "/assets/core-v1/missing.webp",
    fallbackLabel: "Named fallback",
    artKey: "missing.webp",
  });
  expect(resolveArt(coreCatalog.cards[0]!.artKey, "Card").src).toMatch(
    /^\/assets\/fivefold-cards-v3\//,
  );
});
it("uses the current unit atlas, board override and complete terrain pool", () => {
  const requests = battleAssetRequests("core_v1", "low");
  expect(requests.filter((p) => p.includes("locations/"))).toHaveLength(8);
  expect(requests).toContain(
    "/assets/fivefold-cards-v3/atlases/cutouts-low.webp",
  );
  expect(requests).not.toContain("/assets/core-v1/atlases/cutouts-low.webp");
  expect(requests).toContain("/assets/rivals-v2/board/scene-wide.webp");
  expect(artById("board")?.wide).toBe(
    "/assets/rivals-v2/board/scene-wide.webp",
  );
  expect(resolveArt("board/scene.webp", "Board", "wide").src).toBe(
    "/assets/rivals-v2/board/scene-wide.webp",
  );
});
it("retains provenance and measured hashes for every exported original", () => {
  expect(existsSync("assets/source/rivals-v2/manifest.json")).toBe(true);
  const manifest = JSON.parse(
    readFileSync("assets/source/rivals-v2/manifest.json", "utf8"),
  );
  expect(manifest.assets).toHaveLength(7);
  for (const asset of manifest.assets) {
    expect(asset.provenance).toBeTruthy();
    expect(asset.license).toBeTruthy();
    for (const file of [asset.source, ...Object.values(asset.exports)] as {
      path: string;
      sha256: string;
      bytes: number;
      width?: number;
      height?: number;
    }[]) {
      const bytes = readFileSync(file.path);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        file.sha256,
      );
      expect(bytes.byteLength).toBe(file.bytes);
      if (file.path.endsWith("webp")) {
        expect(file.width! * file.height!).toBeLessThanOrEqual(1600 * 900);
        expect(file.bytes).toBeLessThan(450000);
      }
    }
  }
});
