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
  if (deck.contentVersion !== catalog.version) add("VERSION_UNSUPPORTED");
  const hero = catalog.heroes.find((h) => h.id === deck.heroId);
  if (!hero) add("WRONG_FACTION");
  else if (!Array.isArray(hero.classes)) add("WRONG_CLASS");
  const seen = new Set<string>();
  let totalCards = 0;
  for (const entry of deck.entries) {
    if (seen.has(entry.cardId)) add("DUPLICATE_CARD_ID", entry.cardId);
    seen.add(entry.cardId);
    if (!integer(entry.quantity, 1) || entry.quantity > 2)
      add("TOO_MANY_COPIES", entry.cardId);
    if (integer(entry.quantity, 1)) totalCards += entry.quantity;
    const card = catalog.cards.find((c) => c.id === entry.cardId);
    if (!card) add("UNKNOWN_CARD", entry.cardId);
    else if (hero && card.faction !== hero.faction)
      add("WRONG_FACTION", entry.cardId);
    else if (
      hero &&
      card.classId !== null &&
      (!Array.isArray(hero.classes) || !hero.classes.includes(card.classId))
    )
      add("WRONG_CLASS", entry.cardId);
  }
  if (totalCards !== 30) add("TOTAL_NOT_30");
  return { playable: issues.length === 0, totalCards, issues };
}
