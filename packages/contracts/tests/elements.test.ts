import { expect, it } from "vitest";
import { validateWire } from "../src/index.js";
import { publicCatalog } from "../../../apps/api/src/content/registry.js";

it("serializes the new catalog with rarity while rejecting new data mislabeled as a legacy release", () => {
  const catalog = publicCatalog("elements_v1");
  expect(validateWire("PublicCatalog", catalog)).toBe(true);
  expect(catalog.cards.find((c) => c.id === "E01")).toMatchObject({
    rarity: "E",
    classId: "TERRA",
  });
  expect(
    validateWire("PublicCatalog", { ...catalog, version: "heroes_v1" }),
  ).toBe(false);
  const legacy = publicCatalog("heroes_v1");
  expect(legacy.cards.some((c) => Object.hasOwn(c, "rarity"))).toBe(false);
  const corrupted = structuredClone(legacy);
  corrupted.heroes[0]!.classes[0] = "GROVE";
  expect(validateWire("PublicCatalog", corrupted)).toBe(false);
  const corruptedPower = structuredClone(legacy);
  corruptedPower.powers[0]!.faction = "NEUTRAL";
  expect(validateWire("PublicCatalog", corruptedPower)).toBe(false);
});
