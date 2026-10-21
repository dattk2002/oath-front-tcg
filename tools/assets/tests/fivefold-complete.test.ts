import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { expect, it } from "vitest";
import { coreCatalog } from "../../../packages/game-content/src/catalog.js";
import {
  artById,
  battleAssetRequests,
  resolveArt,
} from "../../../apps/web/src/features/match/rendering/asset-manifest.js";

it("covers every immutable card ID with distinct verified masters and bounded new variants", () => {
  expect(existsSync("assets/source/fivefold-cards-v3/manifest.json")).toBe(
    true,
  );
  const source = JSON.parse(
    readFileSync("assets/source/fivefold-cards-v3/manifest.json", "utf8"),
  );
  const runtime = JSON.parse(
    readFileSync(
      "apps/web/public/assets/fivefold-cards-v3/manifest.json",
      "utf8",
    ),
  );
  const expected = coreCatalog.cards.map((card) => card.id).sort();
  expect(source.assets.map((asset: { id: string }) => asset.id).sort()).toEqual(
    expected,
  );
  expect(
    runtime.assets.map((asset: { id: string }) => asset.id).sort(),
  ).toEqual(expected);
  expect(
    new Set(
      source.assets.map(
        (asset: { source: { sha256: string } }) => asset.source.sha256,
      ),
    ).size,
  ).toBe(60);
  expect(
    source.assets.filter((asset: { kind: string }) => asset.kind === "unit"),
  ).toHaveLength(38);
  for (const card of coreCatalog.cards) {
    const asset = source.assets.find(
      (entry: { id: string }) => entry.id === card.id,
    );
    expect(asset.artKey).toBe(card.artKey);
    const generation = JSON.parse(readFileSync(asset.generationRecord, "utf8"));
    expect(generation.sha256).toBe(asset.source.sha256);
    expect(asset.source.sha256).toBe(
      createHash("sha256")
        .update(readFileSync(asset.source.path))
        .digest("hex"),
    );
    expect(existsSync(asset.promptPath)).toBe(true);
    for (const variant of [
      "thumb",
      "inspect",
      ...(asset.kind === "unit" ? ["cutout"] : []),
    ]) {
      const exported = asset.exports[variant];
      expect(exported.sha256).toBe(
        createHash("sha256").update(readFileSync(exported.path)).digest("hex"),
      );
      expect(exported.width).toBe(variant === "thumb" ? 256 : 512);
      expect(exported.height).toBe(exported.width);
      expect(exported.alpha).toBe(asset.kind === "unit");
      expect(exported.bytes).toBeLessThan(450_000);
      const merged = artById(card.id) as Record<string, string | undefined>;
      expect(resolveArt(card.artKey, card.id, variant).src).toBe(
        merged[variant],
      );
    }
  }
});

it("loads one complete quality atlas with hero/token support and all eight terrain strips", () => {
  const runtime = JSON.parse(
    readFileSync(
      "apps/web/public/assets/fivefold-cards-v3/manifest.json",
      "utf8",
    ),
  );
  const budgets = JSON.parse(
    readFileSync(
      "apps/web/public/assets/fivefold-cards-v3/budgets.json",
      "utf8",
    ),
  );
  for (const quality of ["low", "high"] as const) {
    const atlas = runtime.atlases.find(
      (entry: { quality: string }) => entry.quality === quality,
    );
    expect(Object.keys(atlas.frames)).toHaveLength(47);
    expect(atlas.width).toBeLessThanOrEqual(2048);
    expect(atlas.height).toBeLessThanOrEqual(2048);
    for (const id of [
      ...coreCatalog.cards
        .filter((card) => card.type === "UNIT")
        .map((card) => card.id),
      ...coreCatalog.heroes.map((hero) => hero.id),
      ...coreCatalog.tokens.map((token) => token.id),
    ]) {
      expect(atlas.frames[id], id).toBeTruthy();
    }
    const requests = battleAssetRequests("core_v1", quality);
    expect(requests.filter((path) => path.includes("/atlases/"))).toEqual([
      atlas.url,
    ]);
    expect(
      requests.filter((path) => path.includes("/locations/")),
    ).toHaveLength(8);
    expect(requests).toContain("/assets/rivals-v2/board/scene-wide.webp");
    expect(budgets[quality].preloadBytes).toBe(
      requests.reduce(
        (bytes, path) => bytes + statSync(`apps/web/public${path}`).size,
        0,
      ),
    );
    expect(budgets[quality].preloadBytes).toBeLessThan(12_000_000);
    expect(budgets[quality].terrainStrips).toBe(8);
  }
});
