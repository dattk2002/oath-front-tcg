import { it, expect } from "vitest";
import { coreCatalog } from "../../../packages/game-content/src/index.js";
import {
  deckStats,
  filterCards,
  changeQuantity,
} from "../src/features/deck/model.js";
it("curve and composition count every copy and preserve 2.33 average", () => {
  const s = deckStats(coreCatalog.presets[0]!.entries, coreCatalog);
  expect(s).toEqual({
    total: 30,
    units: 22,
    tricks: 8,
    curve: [8, 12, 6, 2, 0, 2],
    average: "2.33",
  });
});
it("collection combines accent-insensitive name/keyword, class/type/cost with AND and stable cost sort", () => {
  const hero = coreCatalog.heroes[0]!;
  expect(
    filterCards(coreCatalog, hero, {
      search: "",
      classId: "ALL",
      type: "ALL",
      cost: "ALL",
    }),
  ).toHaveLength(22);
  const filters = {
    search: "ky si la",
    classId: "COMMON",
    type: "UNIT",
    cost: "2",
  };
  const found = filterCards(coreCatalog, hero, filters);
  expect(found.length).toBeGreaterThan(0);
  expect(found.every((c) => c.type === "UNIT" && c.cost === 2)).toBe(true);
  expect(
    filterCards(coreCatalog, hero, { ...filters, search: "không tồn tại" }),
  ).toEqual([]);
});
it("quantity changes block copy3 and card31 while allowing removal", () => {
  const entries = coreCatalog.presets[0]!.entries;
  expect(changeQuantity(entries, "GC01", 1)).toEqual(entries);
  expect(changeQuantity(entries, "GC04", 1)).toEqual(entries);
  expect(
    changeQuantity(entries, "GC01", -1).find((e) => e.cardId === "GC01")
      ?.quantity,
  ).toBe(1);
});
