import { useEffect, useState } from "react";
import type {
  CardDefinitionView,
  CollectionView,
} from "@oathfront/contracts/browser";
import type { ApiClient } from "../match/api-client";

export function useCollection(api: ApiClient, enabled: boolean) {
  const [collection, setCollection] = useState<CollectionView | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const refresh = () => {
      void api.collection().then(
        (value) => {
          if (active) {
            setCollection(value);
            setError(false);
          }
        },
        () => {
          if (active) setError(true);
        },
      );
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, [api, enabled, attempt]);
  const owned = (card: CardDefinitionView) =>
    card.rarity === "E"
      ? Math.min(
          2,
          collection?.items.find((item) => item.cardId === card.id)?.quantity ??
            0,
        )
      : 2;
  return { collection, error, owned, retry: () => setAttempt((n) => n + 1) };
}
