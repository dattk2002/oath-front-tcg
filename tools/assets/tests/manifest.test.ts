import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { coreCatalog } from "../../../packages/game-content/src/catalog.js";
import { ready } from "../../../packages/game-engine/tests/helpers.js";
import { projectPlayerView } from "../../../packages/game-engine/src/projection.js";

it("AC36 validates every original source, export hash, alpha, bounds and atlas budget", async () => {
  expect(existsSync("assets/source/manifest.json")).toBe(true);
  const { validateManifest } = await import("../validate.js");
  expect(await validateManifest()).toEqual([]);
});
it("covers all immutable artKeys with Vietnamese fallback names and complete production groups", async () => {
  expect(existsSync("assets/source/manifest.json")).toBe(true);
  const manifest = JSON.parse(
    readFileSync("assets/source/manifest.json", "utf8"),
  );
  const entries = [
    ...coreCatalog.cards,
    ...coreCatalog.powers,
    ...coreCatalog.tokens,
    ...coreCatalog.locations,
  ];
  for (const item of entries) {
    const art = manifest.assets.find(
      (a: { artKey: string }) => a.artKey === item.artKey,
    );
    expect(art?.fallbackLabel).toBe(item.nameVi);
    expect(art?.containsRulesText).toBe(false);
  }
  for (const [kind, count] of Object.entries({
    hero: 6,
    card: 60,
    power: 18,
    token: 3,
    terrain: 8,
    board: 1,
    vfx: 7,
    sfx: 18,
    music: 2,
  }))
    expect(
      manifest.assets.filter((a: { kind: string }) => a.kind === kind),
    ).toHaveLength(count);
  expect(
    manifest.assets.filter(
      (a: { kind: string; cutout?: unknown }) => a.kind === "card" && a.cutout,
    ),
  ).toHaveLength(38);
});
it("preloads the same complete terrain pool for matches with different hidden locations", async () => {
  expect(
    existsSync("apps/web/src/features/match/rendering/asset-manifest.ts"),
  ).toBe(true);
  const { battleAssetRequests, resolveArt } =
    await import("../../../apps/web/src/features/match/rendering/asset-manifest.js");
  const hiddenA = ready();
  hiddenA.board[0]!.location = {
    state: "HIDDEN",
    definitionId: "ancient_forest",
    revealTurn: 5,
  };
  const hiddenB = structuredClone(hiddenA);
  hiddenB.board[0]!.location = {
    state: "HIDDEN",
    definitionId: "volcano",
    revealTurn: 5,
  };
  expect(projectPlayerView(hiddenA, "GOOD")).toEqual(
    projectPlayerView(hiddenB, "GOOD"),
  );
  // Loading accepts only the public catalog version/quality; private state has no input path.
  const preloadsForHiddenA = battleAssetRequests(
    hiddenA.versions.content,
    "low",
  );
  const preloadsForHiddenB = battleAssetRequests(
    hiddenB.versions.content,
    "low",
  );
  expect(preloadsForHiddenA).toEqual(preloadsForHiddenB);
  expect(
    preloadsForHiddenA.filter((p: string) => p.includes("locations/")),
  ).toEqual(
    coreCatalog.locations.map(
      (location) =>
        `/assets/core-v1/${location.artKey.replace(".webp", "-strip.webp")}`,
    ),
  );
  expect(resolveArt("missing.webp", "Người Gác Đèn").fallbackLabel).toBe(
    "Người Gác Đèn",
  );
});
