import { useContext } from "react";
import type { CardDefinitionView } from "@oathfront/contracts/browser";
import type { ApiClient } from "../match/api-client";
import { PrivateStorageContext } from "../auth/private-storage";
import { useLiveRead } from "./use-live-read";
export function useCollection(api: ApiClient, enabled: boolean) {
  const owner = useContext(PrivateStorageContext);
  const read = useLiveRead(
    owner,
    async () => {
      const [collection, events] = await Promise.all([
        api.collection(),
        api.weeklyEvents(),
      ]);
      return {
        collection,
        revealed: events.items.flatMap((e) =>
          e.revealed && e.cardId ? [e.cardId] : [],
        ),
      };
    },
    enabled,
  );
  const collection = read.data?.collection ?? null;
  const owned = (card: CardDefinitionView) =>
    card.rarity === "E"
      ? Math.min(
          2,
          collection?.items.find((i) => i.cardId === card.id)?.quantity ?? 0,
        )
      : 2;
  const isRevealed = (card: CardDefinitionView) =>
    card.rarity !== "E" ||
    owned(card) > 0 ||
    !!read.data?.revealed.includes(card.id);
  return {
    collection,
    error: !!read.error,
    owned,
    isRevealed,
    retry: read.refresh,
  };
}
