import type {
  DeckInput,
  DeckIssue,
  DeckValidation,
  PublicCatalog,
} from "./generated/api-v1.js";
const integer = (v: unknown, min = 0): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= min;
export function validateDeck(
  deck: DeckInput,
  catalog: {
    version: string;
    heroes: readonly PublicCatalog["heroes"][number][];
    cards: readonly PublicCatalog["cards"][number][];
  },
): DeckValidation {
  const issues: DeckIssue[] = [];
  const add = (code: DeckIssue["code"], cardId: string | null = null) =>
    issues.push({ code, cardId, messageKey: `deck.${code.toLowerCase()}` });
  const compatibleLegacy =
    deck.contentVersion === "core_v1" &&
    catalog.version === "heroes_v1" &&
    ["H_G_BV", "H_G_BP", "H_G_VP", "H_E_FX", "H_E_FS", "H_E_XS"].includes(
      deck.heroId,
    );
  if (deck.contentVersion !== catalog.version && !compatibleLegacy)
    add("VERSION_UNSUPPORTED");
  const hero = catalog.heroes.find((h) => h.id === deck.heroId);
  if (!hero) add("WRONG_FACTION");
  else if (!Array.isArray(hero.classes)) add("WRONG_CLASS");
  const seen = new Set<string>();
  let totalCards = 0;
  let neutrals = 0;
  const systemCounts = new Map<string, number>();
  const elements = catalog.version === "elements_v1";
  for (const entry of deck.entries) {
    if (seen.has(entry.cardId)) add("DUPLICATE_CARD_ID", entry.cardId);
    seen.add(entry.cardId);
    if (!integer(entry.quantity, 1) || entry.quantity > 2)
      add("TOO_MANY_COPIES", entry.cardId);
    if (integer(entry.quantity, 1)) totalCards += entry.quantity;
    const card = catalog.cards.find((c) => c.id === entry.cardId);
    if (card && integer(entry.quantity, 1)) {
      if (card.classId === null) neutrals += entry.quantity;
      else
        systemCounts.set(
          card.classId,
          (systemCounts.get(card.classId) ?? 0) + entry.quantity,
        );
    }
    if (!card) add("UNKNOWN_CARD", entry.cardId);
    else if (!elements && hero && card.faction !== hero.faction)
      add("WRONG_FACTION", entry.cardId);
    else if (
      hero &&
      card.classId !== null &&
      (!Array.isArray(hero.classes) || !hero.classes.includes(card.classId))
    )
      add("WRONG_CLASS", entry.cardId);
  }
  if (totalCards !== 30) add("TOTAL_NOT_30");
  if (elements) {
    if (neutrals > 12) add("TOO_MANY_NEUTRALS");
    if (hero?.classes.some((system) => (systemCounts.get(system) ?? 0) < 6))
      add("SYSTEM_MINIMUM");
  }
  return { playable: issues.length === 0, totalCards, issues };
}
