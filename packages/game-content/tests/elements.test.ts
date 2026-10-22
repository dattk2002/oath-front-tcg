import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import * as content from "../src/index.js";
import { canonicalJson } from "../../game-engine/src/hash.js";
import type { Catalog, DeckInput } from "@oathfront/contracts";

const elements = () => Reflect.get(content, "elementsCatalog") as Catalog;

it("provides twenty legal two-system free decks and preserves both replay manifests", () => {
  expect(elements()).toBeDefined();
  const catalog = elements();
  expect(content.validateCatalog(catalog)).toEqual([]);
  expect([
    catalog.heroes.length,
    catalog.powers.length,
    catalog.cards.length,
    catalog.presets.length,
  ]).toEqual([20, 36, 72, 20]);
  expect(
    new Set(catalog.heroes.map((h) => [...h.classes].sort().join("/"))).size,
  ).toBe(20);
  for (const preset of catalog.presets) {
    expect(
      content.validateDeck(preset, catalog),
      preset.presetId,
    ).toMatchObject({ playable: true, totalCards: 30 });
    const cards = preset.entries.flatMap((e) =>
      Array.from({ length: e.quantity }, () =>
        catalog.cards.find((c) => c.id === e.cardId)!,
      ),
    );
    expect(
      cards.some((c) => c.id.startsWith("E") && !c.id.startsWith("EC")),
    ).toBe(false);
    expect(cards.filter((c) => c.cost >= 6).length).toBeLessThanOrEqual(4);
    expect(
      cards.filter((c) => c.type === "UNIT" && c.cost <= 3).length,
    ).toBeGreaterThanOrEqual(8);
  }
  for (const [catalog, hash] of [
    [
      content.coreCatalog,
      "37ec966ce1e734e8e5f85310e384ea0d1c4a126eea4618471ea874d60546cdcc",
    ],
    [
      content.heroesCatalog,
      "cb086648a206ca6e289d743a5158db8592e1b1f2733c615199d5ebc1bddb09d7",
    ],
  ] as const) {
    expect(
      createHash("sha256").update(canonicalJson(catalog)).digest("hex"),
    ).toBe(hash);
  }
  expect(content.catalogForVersion("elements_v1")).toBe(catalog);
});

it("accepts opposite-origin cards by system but rejects a third system, neutral flooding, and too few system cards", () => {
  expect(elements()).toBeDefined();
  const catalog = elements();
  const preset = catalog.presets.find((p) => p.heroId === "H_G_BV")!;
  const issues = (deck: DeckInput) =>
    content.validateDeck(deck, catalog).issues.map((i) => i.code);
  const deck: DeckInput = structuredClone(preset);
  deck.entries = [
    "B01",
    "B02",
    "B05",
    "S04",
    "V01",
    "V02",
    "V04",
    "V05",
    "V06",
    "GC01",
    "GC02",
    "GC03",
    "EC01",
    "EC02",
    "EC03",
  ].map((cardId) => ({
    cardId: cardId as (typeof deck.entries)[number]["cardId"],
    quantity: 2,
  }));
  expect(issues(deck)).toEqual([]);
  expect(
    issues({
      ...deck,
      entries: [...deck.entries.slice(1), { cardId: "F01", quantity: 2 }],
    }),
  ).toContain("WRONG_CLASS");
  expect(
    issues({
      ...deck,
      entries: [
        ...deck.entries.slice(3),
        { cardId: "GC04", quantity: 2 },
        { cardId: "EC04", quantity: 2 },
        { cardId: "EC05", quantity: 2 },
      ],
    }),
  ).toEqual(expect.arrayContaining(["TOO_MANY_NEUTRALS", "SYSTEM_MINIMUM"]));
  expect(
    issues({
      ...deck,
      entries: [{ cardId: "B01", quantity: 3 }, ...deck.entries.slice(1)],
    }),
  ).toContain("TOO_MANY_COPIES");
  expect(
    content
      .validateDeck(content.coreCatalog.presets[0]!, catalog)
      .issues.map((i) => i.code),
  ).toContain("VERSION_UNSUPPORTED");
});

it("rejects new catalogs with missing rarity, mixed legacy classes or wrong power ownership", () => {
  expect(elements()).toBeDefined();
  const bad = structuredClone(elements());
  Reflect.deleteProperty(bad.cards[0]!, "rarity");
  bad.heroes[0]!.classes[0] = "BASTION";
  bad.heroes[0]!.powerIds[0] =
    "P_TIDE1" as (typeof bad.heroes)[0]["powerIds"][number];
  const codes = content.validateCatalog(bad).map((i) => i.code);
  expect(codes).toEqual(
    expect.arrayContaining([
      "INVALID_RARITY",
      "INVALID_HERO_CLASSES",
      "INVALID_HERO_POWER",
    ]),
  );
});
