import type { DeckInput, DeckValidation } from "@oathfront/contracts";
import { catalogForVersion, validateDeck } from "@oathfront/game-content";
import type { Pool, PoolClient } from "@oathfront/db";
import type { SessionPrincipal } from "../auth/sessions.js";
import { HttpError } from "../http.js";
export async function ownedEventCards(
  db: Pool | PoolClient,
  principal: SessionPrincipal,
): Promise<Map<string, number>> {
  if (principal.kind !== "ACCOUNT") return new Map();
  const rows = (
    await db.query<{ card_id: string; quantity: number }>(
      "SELECT card_id,quantity FROM collection_items WHERE account_id=$1",
      [principal.id],
    )
  ).rows;
  return new Map(rows.map((r) => [r.card_id, r.quantity]));
}
/** Inventory is deliberately separate from the pure structural rules used by bots and borrowed decks. */
export async function validateOwnedDeck(
  db: Pool | PoolClient,
  principal: SessionPrincipal,
  deck: DeckInput,
): Promise<DeckValidation> {
  const catalog = catalogForVersion(deck.contentVersion);
  if (!catalog) throw new HttpError(409, "VERSION_UNSUPPORTED");
  const validation = validateDeck(deck, catalog);
  if (catalog.version !== "elements_v1") return validation;
  const owned = await ownedEventCards(db, principal);
  for (const entry of deck.entries) {
    if (
      catalog.cards.find((c) => c.id === entry.cardId)?.rarity === "E" &&
      entry.quantity > (owned.get(entry.cardId) ?? 0)
    ) {
      validation.issues.push({
        code: "CARD_NOT_OWNED",
        cardId: entry.cardId,
        messageKey: "deck.card_not_owned",
      });
    }
  }
  validation.playable = validation.issues.length === 0;
  return validation;
}
