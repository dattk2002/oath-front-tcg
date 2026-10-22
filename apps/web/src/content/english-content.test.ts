import { describe, expect, it } from "vitest";
import { coreCatalog } from "../../../../packages/game-content/src/catalog";
import { response } from "../../tests/fixtures";
import {
  contentName,
  contentText,
  englishContent,
  heroTitle,
} from "./english-content";
import { filterCards } from "../features/deck/model";
import {
  factionLabel,
  classLabel,
  keywordLabel,
} from "../features/match/labels";

describe("English presentation over immutable stable IDs", () => {
  it("covers every hero, card, power, token and location without a translated transport", () => {
    expect(coreCatalog.heroes).toHaveLength(6);
    expect(coreCatalog.cards).toHaveLength(60);
    expect(coreCatalog.powers).toHaveLength(18);
    expect(coreCatalog.tokens).toHaveLength(3);
    expect(coreCatalog.locations).toHaveLength(8);
    for (const item of [
      ...coreCatalog.heroes,
      ...coreCatalog.cards,
      ...coreCatalog.powers,
      ...coreCatalog.tokens,
      ...coreCatalog.locations,
    ]) {
      expect(englishContent[item.id], item.id).toBeDefined();
      expect(contentName(item.id)).not.toBe("Unknown content");
      expect(contentName(item.id)).not.toMatch(/[À-ỹ]/);
      if (!item.id.startsWith("H_"))
        expect(contentText(item.id).length, item.id).toBeGreaterThan(0);
    }
    expect(heroTitle("H_G_BV")).toBe("The Rootbound Warden");
  });
  it.each([
    [
      "S_E_FX",
      "Deal 1 damage simultaneously to all enemy units. Then deal 2 damage to the enemy hero.",
    ],
    [
      "P_P1",
      "Move an allied unit to an empty lane on your side. It gains +1 ATK this turn.",
    ],
    ["P_S1", "Move an enemy unit to an empty lane on its owner's side."],
    [
      "S_G_VP",
      "Move an allied unit to an empty lane on your side. It gains +2/+1 permanently.",
    ],
    ["X03", "When damaged, once per turn: this unit gains +1 ATK permanently."],
    [
      "volcano",
      "After combat in this lane and all block responses, deal 1 damage simultaneously to every surviving unit here.",
    ],
    [
      "healing_spring",
      "At turn end, after Poison and unit triggers, heal every surviving unit here for 1 HP.",
    ],
  ])("preserves targets, ordering and duration for %s", (id, expected) => {
    expect(contentText(id)).toBe(expected);
  });
  it("displays an old saved match in English while preserving hashes, IDs and custom names", () => {
    const saved = {
      match: response(),
      checkpointHash: "legacy-checkpoint",
      deck: {
        name: "Vườn của tôi",
        heroId: "H_G_BV",
        entries: [{ cardId: "GC01", quantity: 2 }],
      },
      account: { displayName: "Nguyễn An" },
    };
    const before = JSON.stringify(saved),
      catalogBefore = JSON.stringify(coreCatalog);
    expect(contentName(saved.match.view.players.GOOD.heroId)).toBe("Briar");
    expect(contentName(saved.match.view.self.hand[0]!.definitionId)).toBe(
      "Lanternkeeper",
    );
    expect(contentName(saved.deck.entries[0]!.cardId)).toBe("Lanternkeeper");
    expect(JSON.stringify(saved)).toBe(before);
    expect(JSON.stringify(coreCatalog)).toBe(catalogBefore);
    expect(saved.deck.name).toBe("Vườn của tôi");
    expect(saved.account.displayName).toBe("Nguyễn An");
  });
  it("searches English names, rule text and keywords without changing catalog objects", () => {
    const query = (search: string) =>
      filterCards(coreCatalog, coreCatalog.heroes[0]!, {
        search,
        classId: "ALL",
        type: "ALL",
        cost: "ALL",
      });
    expect(query("leaf knight").map((c) => c.id)).toEqual(["GC02"]);
    expect(query("permanently").map((c) => c.id)).toEqual(["V06", "B07"]);
    expect(query("shield").some((c) => c.id === "B01")).toBe(true);
    expect(query("lanternkeeper")[0]).toBe(coreCatalog.cards[0]);
  });
  it("uses safe generic English fallbacks for unknown IDs", () => {
    expect(contentName("<unknown> Người lạ")).toBe("Unknown content");
    expect(contentText("missing")).toBe("Rules unavailable.");
    expect(heroTitle("missing")).toBe("Unknown hero");
    expect(contentName("toString")).toBe("Unknown content");
  });
  it("labels both factions, every class and combat keyword in English", () => {
    expect(factionLabel).toEqual({ GOOD: "Dawnward", EVIL: "Ashen Court" });
    expect(Object.values(classLabel)).toEqual([
      "Grove",
      "Terra",
      "Tide",
      "Tempest",
      "Solar",
      "Forge",
      "Arcane",
      "Umbral",
      "Bastion",
      "Verdant",
      "Prism",
      "Furnace",
      "Hex",
      "Veil",
    ]);
    expect(keywordLabel).toMatchObject({
      SHIELD: "Shield",
      ARMOR: "Armor",
      POISONED: "Poison",
      STUNNED: "Stun",
      EXHAUSTED: "Exhausted",
      PIERCE: "Pierce",
      MOVE: "Move",
    });
  });
});
