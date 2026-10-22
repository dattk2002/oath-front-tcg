import { expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  currentCatalog,
  coreCatalog,
  heroesCatalog,
} from "../../../packages/game-content/src/index.js";
import { publicHero, heroPortrait } from "../src/features/campaign/model";
import { contentName, contentText } from "../src/content/english-content";
import { filterCards, changeQuantity } from "../src/features/deck/model";
import {
  artById,
  resolveArt,
  battleAssetRequests,
} from "../src/features/match/rendering/asset-manifest";
import { createApiClient } from "../src/features/match/api-client";
import { loadVersionedCatalog } from "../src/features/content/use-versioned-catalog";
import { publicCatalog } from "../../../apps/api/src/content/registry.js";

it("publishes all twenty exact system pairs and power sets without changing legacy heroes", () => {
  for (const hero of currentCatalog.heroes) {
    expect(publicHero(hero.id)).toMatchObject({
      classes: hero.classes,
      powerIds: hero.powerIds,
    });
    expect(
      existsSync(
        resolve("apps/web/public", heroPortrait(publicHero(hero.id)!).slice(1)),
      ),
    ).toBe(true);
  }
  expect(coreCatalog.heroes[0]!.classes).toEqual(["BASTION", "VERDANT"]);
  expect(heroesCatalog.heroes[0]!.powerIds).toEqual([
    "P_B1",
    "P_V1",
    "P_V2",
    "S_G_BV",
  ]);
});
it("gives every new card and power English names, rules and real art", () => {
  for (const definition of [
    ...currentCatalog.cards.filter((c) => c.rarity === "E"),
    ...currentCatalog.powers.filter((p) => p.id.startsWith("P_")),
  ]) {
    expect(contentName(definition.id)).toBe(definition.nameVi);
    expect(contentText(definition.id)).toBe(definition.exactTextVi);
    expect(
      existsSync(
        resolve(
          "apps/web/public",
          resolveArt(definition.artKey, definition.nameVi).src.slice(1),
        ),
      ),
    ).toBe(true);
  }
  expect(artById("E01")?.cutout).toContain("/event-cards-v1/");
});
it("includes both factions' neutral/system cards under the new law and filters rarity", () => {
  const hero = currentCatalog.heroes[0]!;
  const filters = { search: "", classId: "ALL", type: "ALL", cost: "ALL" };
  const cards = filterCards(currentCatalog, hero, filters);
  expect(cards.some((c) => c.id === "EC01")).toBe(true);
  expect(cards.some((c) => c.id === "S04")).toBe(true);
  expect(
    filterCards(currentCatalog, hero, { ...filters, rarity: "E" })
      .map((c) => c.id)
      .sort(),
  ).toEqual(["E01", "E02", "E09", "E10"]);
  expect(
    filterCards(coreCatalog, coreCatalog.heroes[0]!, filters),
  ).toHaveLength(22);
});
it("never adds more than the owned zero/one/two copies; removal remains possible", () => {
  expect(changeQuantity([], "E01", 1, 0)).toEqual([]);
  const one = changeQuantity([], "E01", 1, 1);
  expect(one).toEqual([{ cardId: "E01", quantity: 1 }]);
  expect(changeQuantity(one, "E01", 1, 1)).toEqual(one);
  expect(changeQuantity(one, "E01", 1, 2)).toEqual([
    { cardId: "E01", quantity: 2 },
  ]);
  expect(changeQuantity(one, "E01", -1, 0)).toEqual([]);
});
it("loads elements art while retaining supported legacy packs", () => {
  for (const version of ["core_v1", "heroes_v1", "elements_v1"])
    expect(
      battleAssetRequests(version, "low").every((url) =>
        existsSync(resolve("apps/web/public", url.slice(1))),
      ),
    ).toBe(true);
  expect(
    battleAssetRequests("elements_v1", "high").some((url) =>
      url.includes("event-cards-v1"),
    ),
  ).toBe(true);
});
it("requests the explicit match catalog instead of substituting current", async () => {
  const urls: string[] = [];
  const api = createApiClient({
    fetcher: async (input) => {
      urls.push(String(input));
      return new Response(JSON.stringify(publicCatalog("core_v1")), {
        status: 200,
      });
    },
  });
  await api.catalog("core_v1");
  await api.catalog();
  expect(urls).toEqual([
    "/api/v1/catalog/core_v1",
    "/api/v1/catalog/elements_v1",
  ]);
});

it("coalesces identical version reads and rejects a mismatched catalog without poisoning retry", async () => {
  let wrong = true,
    calls = 0;
  const api = createApiClient({
    fetcher: async () => {
      calls++;
      return Response.json(publicCatalog(wrong ? "elements_v1" : "core_v1"));
    },
  });
  const first = loadVersionedCatalog(api, "core_v1");
  expect(loadVersionedCatalog(api, "core_v1")).toBe(first);
  await expect(first).rejects.toThrow("CATALOG_VERSION_MISMATCH");
  wrong = false;
  expect((await loadVersionedCatalog(api, "core_v1")).version).toBe("core_v1");
  await loadVersionedCatalog(api, "core_v1");
  expect(calls).toBe(2);
});
