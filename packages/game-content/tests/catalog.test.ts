import { expect, it } from "vitest";
import { coreCatalog } from "../src/catalog.js";
import { validateCatalog, validateDeck } from "../src/validate.js";
it("core_catalog_and_presets_are_closed", () => {
  expect(validateCatalog(coreCatalog)).toEqual([]);
  expect(coreCatalog.cards).toHaveLength(60);
  expect(
    coreCatalog.cards.filter((c: { type: string }) => c.type === "UNIT"),
  ).toHaveLength(38);
  expect(coreCatalog.powers).toHaveLength(18);
  expect(new Set(coreCatalog.cards.map((c: { id: string }) => c.id)).size).toBe(
    60,
  );
  expect(coreCatalog.heroes).toHaveLength(6);
  expect(coreCatalog.locations).toHaveLength(8);
  expect(coreCatalog.tokens).toHaveLength(3);
  expect(coreCatalog.presets).toHaveLength(6);
  for (const deck of coreCatalog.presets)
    expect(validateDeck(deck, coreCatalog).playable).toBe(true);
});
it("every hero has four distinct legal powers and exactly 22 eligible regular IDs", () => {
  for (const hero of coreCatalog.heroes) {
    expect(new Set(hero.powerIds).size).toBe(4);
    expect(hero.maxHp).toBe(20);
    expect(
      coreCatalog.cards.filter(
        (c) =>
          c.faction === hero.faction &&
          (c.classId === null || hero.classes.includes(c.classId)),
      ),
    ).toHaveLength(22);
  }
  for (const deck of coreCatalog.presets) {
    expect(deck.entries).toHaveLength(15);
    expect(new Set(deck.entries.map((e) => e.cardId)).size).toBe(15);
    expect(deck.entries.reduce((n, e) => n + e.quantity, 0)).toBe(30);
  }
});
it.each([
  [
    "copy limit",
    (c: typeof coreCatalog) => {
      c.presets[0]!.entries[0]!.quantity = 3;
    },
  ],
  [
    "wrong faction",
    (c: typeof coreCatalog) => {
      c.presets[0]!.entries[0]!.cardId = "EC01";
    },
  ],
  [
    "wrong class",
    (c: typeof coreCatalog) => {
      c.presets[0]!.entries[0]!.cardId = "P01";
    },
  ],
  [
    "duplicate ID",
    (c: typeof coreCatalog) => {
      c.cards[1]!.id = "GC01";
    },
  ],
  [
    "unknown effect",
    (c: typeof coreCatalog) => {
      Object.assign(c.cards.find((x) => x.id === "GC05")!.effects[0]!, {
        kind: "RUN_SCRIPT",
      });
    },
  ],
  [
    "missing duration",
    (c: typeof coreCatalog) => {
      Reflect.deleteProperty(
        c.cards.find((x) => x.id === "B07")!.effects[0]!,
        "duration",
      );
    },
  ],
  [
    "fractional damage",
    (c: typeof coreCatalog) => {
      Object.assign(c.cards.find((x) => x.id === "GC05")!.effects[0]!, {
        amount: 1.5,
      });
    },
  ],
  [
    "negative heal",
    (c: typeof coreCatalog) => {
      Object.assign(c.powers.find((x) => x.id === "P_B2")!.effects[0]!, {
        amount: -1,
      });
    },
  ],
  [
    "unknown target",
    (c: typeof coreCatalog) => {
      Object.assign(c.cards.find((x) => x.id === "GC05")!.effects[0]!, {
        targets: "PRIVATE_DECK",
      });
    },
  ],
  [
    "unknown hook",
    (c: typeof coreCatalog) => {
      Object.assign(c.cards.find((x) => x.id === "GC03")!.abilities[0]!, {
        hook: "ON_SUMMON",
      });
    },
  ],
  [
    "missing once-per-turn counter",
    (c: typeof coreCatalog) => {
      c.cards.find((x) => x.id === "F03")!.abilities[0]!.limit = null;
    },
  ],
  [
    "unknown token",
    (c: typeof coreCatalog) => {
      Object.assign(c.cards.find((x) => x.id === "V08")!.effects[0]!, {
        tokenId: "MISSING",
      });
    },
  ],
  [
    "tutorial token in skirmish effect",
    (c: typeof coreCatalog) => {
      Object.assign(c.cards.find((x) => x.id === "V08")!.effects[0]!, {
        tokenId: "TK_G_LANTERN",
      });
    },
  ],
  [
    "wrong power owner",
    (c: typeof coreCatalog) => {
      c.heroes[0]!.powerIds[0] = "P_F1";
    },
  ],
  [
    "wrong signature",
    (c: typeof coreCatalog) => {
      c.heroes[0]!.signaturePowerId = "S_G_BP";
    },
  ],
  [
    "invalid Location rule",
    (c: typeof coreCatalog) => {
      Object.assign(c.locations[0]!.rule, { duration: "FOREVER" });
    },
  ],
  [
    "duplicate deck entry",
    (c: typeof coreCatalog) => {
      c.presets[0]!.entries[1]!.cardId = "GC01";
    },
  ],
] as const)("rejects catalog mutation: %s", (_, mutate) => {
  const catalog = structuredClone(coreCatalog);
  mutate(catalog);
  expect(validateCatalog(catalog).length).toBeGreaterThan(0);
});
it.each([
  [
    "TOO_MANY_COPIES",
    (d: (typeof coreCatalog.presets)[number]) => {
      d.entries[0]!.quantity = 3;
    },
  ],
  [
    "WRONG_FACTION",
    (d: (typeof coreCatalog.presets)[number]) => {
      d.entries[0]!.cardId = "EC01";
    },
  ],
  [
    "WRONG_CLASS",
    (d: (typeof coreCatalog.presets)[number]) => {
      d.entries[0]!.cardId = "P01";
    },
  ],
  [
    "DUPLICATE_CARD_ID",
    (d: (typeof coreCatalog.presets)[number]) => {
      d.entries[1]!.cardId = "GC01";
    },
  ],
  [
    "UNKNOWN_CARD",
    (d: (typeof coreCatalog.presets)[number]) => {
      Object.assign(d.entries[0]!, { cardId: "NOT_A_CARD" });
    },
  ],
  [
    "VERSION_UNSUPPORTED",
    (d: (typeof coreCatalog.presets)[number]) => {
      d.contentVersion = "future_v2";
    },
  ],
  [
    "TOTAL_NOT_30",
    (d: (typeof coreCatalog.presets)[number]) => {
      d.entries.pop();
    },
  ],
] as const)("reports actionable deck issue %s", (code, mutate) => {
  const deck = structuredClone(coreCatalog.presets[0]!);
  mutate(deck);
  const result = validateDeck(deck, coreCatalog);
  expect(result.playable).toBe(false);
  expect(result.issues.some((x: { code: string }) => x.code === code)).toBe(
    true,
  );
});
it.each([
  [
    "empty arrays",
    (c: typeof coreCatalog) => {
      c.cards = [];
    },
  ],
  [
    "non-array effects",
    (c: typeof coreCatalog) => {
      Object.assign(c.cards[0]!, { effects: null });
    },
  ],
  [
    "missing targeting",
    (c: typeof coreCatalog) => {
      Reflect.deleteProperty(c.powers[0]!, "targeting");
    },
  ],
  [
    "null definition",
    (c: typeof coreCatalog) => {
      Object.assign(c.cards, { 0: null });
    },
  ],
  [
    "unknown card field",
    (c: typeof coreCatalog) => {
      Object.assign(c.cards[0]!, { script: "private callback" });
    },
  ],
  [
    "damage targets lane",
    (c: typeof coreCatalog) => {
      Object.assign(c.cards.find((x) => x.id === "GC05")!.effects[0]!, {
        targets: "EMPTY_ALLY_LANE",
      });
    },
  ],
  [
    "stun missing duration",
    (c: typeof coreCatalog) => {
      Reflect.deleteProperty(
        c.powers.find((x) => x.id === "P_P2")!.effects[0]!,
        "duration",
      );
    },
  ],
] as const)(
  "returns issues without throwing for malformed content: %s",
  (_, mutate) => {
    const catalog = structuredClone(coreCatalog);
    mutate(catalog);
    expect(validateCatalog(catalog).length).toBeGreaterThan(0);
  },
);
