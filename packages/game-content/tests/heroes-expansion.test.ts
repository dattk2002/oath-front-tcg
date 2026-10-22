import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import * as content from "../src/index.js";
import { coreCatalog } from "../src/catalog.js";
import { validateCatalog, validateDeck } from "../src/validate.js";
import type { Catalog } from "@oathfront/contracts";
import { canonicalJson } from "../../game-engine/src/hash.js";

const expanded = () => Reflect.get(content, "heroesCatalog") as Catalog;

it("ships a complete playable expansion while retaining the exact stored core manifest", () => {
  expect(expanded()).toBeDefined();
  expect(validateCatalog(expanded())).toEqual([]);
  expect(expanded().heroes).toHaveLength(20);
  expect(expanded().powers).toHaveLength(32);
  expect(expanded().presets).toHaveLength(20);
  expect(expanded().cards).toEqual(coreCatalog.cards);
  expect(
    createHash("sha256").update(canonicalJson(coreCatalog)).digest("hex"),
  ).toBe("37ec966ce1e734e8e5f85310e384ea0d1c4a126eea4618471ea874d60546cdcc");
  for (const preset of expanded().presets) {
    expect(validateDeck(preset, expanded()).playable, preset.presetId).toBe(
      true,
    );
  }
});

it("selects only known immutable versions without silently falling back", () => {
  const lookup = Reflect.get(content, "catalogForVersion");
  expect(lookup).toBeTypeOf("function");
  expect(lookup("core_v1")).toBe(coreCatalog);
  expect(lookup("heroes_v1")).toBe(expanded());
  expect(lookup("future_v9")).toBeUndefined();
  expect(Reflect.get(content, "currentCatalog")).toBe(
    Reflect.get(content, "elementsCatalog"),
  );
});

it("accepts old unchanged-card decks forward but never new heroes in an old catalog", () => {
  expect(expanded()).toBeDefined();
  const old = structuredClone(coreCatalog.presets[0]!);
  expect(validateDeck(old, expanded()).playable).toBe(true);
  expect(old.contentVersion).toBe("core_v1");
  const solenne = expanded().presets.find((p) => p.heroId === "H_G_SOL")!;
  expect(solenne).toBeDefined();
  expect(validateDeck(solenne, coreCatalog).playable).toBe(false);
  expect(
    validateDeck({ ...solenne, contentVersion: "core_v1" }, expanded())
      .playable,
  ).toBe(false);
});

it("rejects wrong power ownership and missing expansion presets", () => {
  expect(expanded()).toBeDefined();
  const wrong = structuredClone(expanded());
  wrong.heroes.find((h) => h.id === "H_G_SOL")!.powerIds[0] = "P_F1";
  expect(
    validateCatalog(wrong).some((issue) => issue.code === "INVALID_HERO_POWER"),
  ).toBe(true);
  const missing = structuredClone(expanded());
  missing.presets.pop();
  expect(
    validateCatalog(missing).some((issue) => issue.code === "INVALID_COUNT"),
  ).toBe(true);
});
