import { contentName, contentText } from "../../content/english-content";
import type {
  DeckEntry,
  PublicCatalog,
  HeroDefinitionView,
} from "@oathfront/contracts/browser";
import { keywordLabel } from "../match/labels";
export const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
export function filterCards(
  catalog: {
    version?: string;
    cards: readonly PublicCatalog["cards"][number][];
  },
  hero: HeroDefinitionView,
  filter: {
    search: string;
    classId: string;
    type: string;
    cost: string;
    rarity?: string;
  },
) {
  return catalog.cards
    .filter(
      (c) =>
        (catalog.version === "elements_v1" || c.faction === hero.faction) &&
        (c.classId === null || hero.classes.includes(c.classId)) &&
        (filter.classId === "ALL" ||
          (filter.classId === "COMMON"
            ? c.classId === null
            : c.classId === filter.classId)) &&
        (filter.type === "ALL" || c.type === filter.type) &&
        (!filter.rarity ||
          filter.rarity === "ALL" ||
          c.rarity === filter.rarity) &&
        (filter.cost === "ALL" ||
          (filter.cost === "6"
            ? c.cost >= 6
            : c.cost === Number(filter.cost))) &&
        normalize(
          `${contentName(c.id)} ${contentText(c.id)} ${c.keywords.map((k) => `${k} ${keywordLabel[k]}`).join(" ")}`,
        ).includes(normalize(filter.search.trim())),
    )
    .sort(
      (a, b) =>
        a.cost - b.cost ||
        normalize(contentName(a.id)).localeCompare(
          normalize(contentName(b.id)),
          "en",
        ) ||
        a.id.localeCompare(b.id),
    );
}
export function deckStats(
  entries: DeckEntry[],
  catalog: { cards: readonly PublicCatalog["cards"][number][] },
) {
  let units = 0,
    tricks = 0,
    total = 0,
    cost = 0;
  const curve = [0, 0, 0, 0, 0, 0];
  for (const e of entries) {
    const c = catalog.cards.find((c) => c.id === e.cardId);
    if (!c) continue;
    total += e.quantity;
    cost += c.cost * e.quantity;
    curve[Math.min(5, Math.max(0, c.cost - 1))]! += e.quantity;
    if (c.type === "UNIT") units += e.quantity;
    else tricks += e.quantity;
  }
  return {
    total,
    units,
    tricks,
    curve,
    average: total ? (cost / total).toFixed(2) : "0.00",
  };
}
export function changeQuantity(
  entries: DeckEntry[],
  cardId: DeckEntry["cardId"],
  delta: number,
  owned = 2,
): DeckEntry[] {
  const old = entries.find((e) => e.cardId === cardId)?.quantity ?? 0;
  const quantity = old + delta;
  if (
    quantity < 0 ||
    (delta > 0 && quantity > Math.min(2, owned)) ||
    (delta > 0 && entries.reduce((n, e) => n + e.quantity, 0) >= 30)
  )
    return entries;
  return [
    ...entries.filter((e) => e.cardId !== cardId),
    ...(quantity ? [{ cardId, quantity }] : []),
  ];
}
