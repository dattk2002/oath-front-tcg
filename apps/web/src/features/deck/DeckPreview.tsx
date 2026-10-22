import { useCollectionMotion } from "../motion/use-collection-motion";
import { useRef, useState } from "react";
import type {
  CardDefinitionView,
  DeckEntry,
  PublicCatalog,
} from "@oathfront/contracts/browser";
import { contentName, contentText } from "../../content/english-content";
import { RarityBadge, SystemBadge } from "../content/ContentBadges";
import DetailDialog from "../content/DetailDialog";
import ArtImage from "../match/ArtImage";
import { keywordLabel } from "../match/labels";
import { keywordCopy } from "../content/keyword-copy";

export default function DeckPreview({
  entries,
  catalog,
}: {
  entries: DeckEntry[];
  catalog: PublicCatalog;
}) {
  const grid = useRef<HTMLDivElement>(null);
  useCollectionMotion(
    grid,
    entries.map((e) => `${e.cardId}:${e.quantity}`).join(","),
  );
  const [inspect, setInspect] = useState<CardDefinitionView | null>(null);
  const cards = new Map(catalog.cards.map((card) => [card.id, card]));
  const sorted = [...entries].sort(
    (a, b) =>
      (cards.get(a.cardId)?.cost ?? Infinity) -
        (cards.get(b.cardId)?.cost ?? Infinity) ||
      a.cardId.localeCompare(b.cardId),
  );
  return (
    <section className="deck-card-library" aria-label="Deck cards">
      <div className="deck-library-heading">
        <h2>Inside this deck</h2>
        <span>
          {entries.reduce((n, e) => n + e.quantity, 0)} cards · {entries.length}{" "}
          unique
        </span>
      </div>
      <p className="deck-library-hint">
        Ordered by energy. Select a card for its full effect.
      </p>
      <div className="deck-preview-grid" ref={grid}>
        {sorted.map((entry) => {
          const card = cards.get(entry.cardId);
          if (!card)
            return (
              <div
                key={entry.cardId}
                className="deck-preview-card deck-card-unavailable"
                data-quantity={entry.quantity}
              >
                <strong>{entry.cardId}</strong>
                <span>Unavailable in this catalog</span>
                <b>×{entry.quantity}</b>
              </div>
            );
          return (
            <button
              key={entry.cardId}
              className="deck-preview-card"
              data-rarity={card.rarity}
              data-quantity={entry.quantity}
              onClick={() => setInspect(card)}
              aria-label={`${contentName(card.id)}, ${card.cost} energy, ${entry.quantity} copies`}
            >
              <span className="deck-card-art">
                <ArtImage
                  artKey={card.artKey}
                  name={contentName(card.id)}
                  retry={false}
                />
              </span>
              <span className="deck-card-cost" aria-hidden="true">
                {card.cost}
              </span>
              <span className="deck-card-quantity" aria-hidden="true">
                ×{entry.quantity}
              </span>
              <strong>{contentName(card.id)}</strong>
              <span className="deck-card-meta">
                <RarityBadge rarity={card.rarity} />
                <span>
                  {card.type === "UNIT"
                    ? `${card.printed.attack} / ${card.printed.hp}`
                    : "Trick"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {!entries.length && (
        <p className="deck-empty-preview">
          This draft has no cards yet. Edit the deck to add its first card.
        </p>
      )}
      {inspect && (
        <DetailDialog
          title={contentName(inspect.id)}
          label="Card details"
          onClose={() => setInspect(null)}
        >
          <div className="preview-inspect-art">
            <ArtImage
              artKey={inspect.artKey}
              name={contentName(inspect.id)}
              variant="inspect"
            />
          </div>
          <div className="card-affinities">
            <RarityBadge rarity={inspect.rarity} full />
            <SystemBadge system={inspect.classId} />
          </div>
          <p className="detail-kicker">
            {inspect.cost} energy ·{" "}
            {inspect.type === "UNIT"
              ? `${inspect.printed.attack} ATK · ${inspect.printed.hp} HP`
              : "Trick"}
          </p>
          <p>{contentText(inspect.id)}</p>
          {inspect.keywords.length > 0 && (
            <dl className="deck-keyword-list">
              {inspect.keywords.map((keyword) => (
                <div key={keyword}>
                  <dt>{keywordLabel[keyword]}</dt>
                  <dd>{keywordCopy[keyword]}</dd>
                </div>
              ))}
            </dl>
          )}
        </DetailDialog>
      )}
    </section>
  );
}
