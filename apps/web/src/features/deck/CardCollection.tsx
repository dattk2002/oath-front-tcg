import CardVisual from "../content/CardVisual";
import { contentName } from "../../content/english-content";
import { useState } from "react";
import type {
  CardDefinitionView,
  DeckEntry,
  HeroDefinitionView,
  PublicCatalog,
} from "@oathfront/contracts/browser";
import { classLabel } from "../match/labels";
import { filterCards } from "./model";
export function QuantityControls({
  card,
  quantity,
  total,
  owned = 2,
  onChange,
}: {
  card: CardDefinitionView;
  quantity: number;
  total: number;
  owned?: number;
  onChange: (id: CardDefinitionView["id"], delta: number) => void;
}) {
  return (
    <div className="quantity-controls" onClick={(e) => e.stopPropagation()}>
      <button
        aria-label={`Remove ${contentName(card.id)}`}
        disabled={!quantity}
        onClick={() => onChange(card.id, -1)}
      >
        −
      </button>
      <span aria-label={`${quantity} of 2 copies`}>{quantity}/2</span>
      <button
        aria-label={`Add ${contentName(card.id)}`}
        disabled={quantity >= owned || quantity >= 2 || total >= 30}
        onClick={() => onChange(card.id, 1)}
      >
        +
      </button>
      <small>
        {quantity >= owned && owned < 2
          ? "Earn this card in Weekly Events"
          : quantity >= 2
            ? "Maximum 2 copies"
            : total >= 30
              ? "Your deck already has 30 cards"
              : ""}
      </small>
    </div>
  );
}
export default function CardCollection({
  catalog,
  hero,
  entries,
  onChange,
  onInspect,
  owned,
  isRevealed,
}: {
  catalog: PublicCatalog;
  hero: HeroDefinitionView;
  entries: DeckEntry[];
  onChange: (id: CardDefinitionView["id"], delta: number) => void;
  onInspect: (c: CardDefinitionView) => void;
  owned: (c: CardDefinitionView) => number;
  isRevealed: (c: CardDefinitionView) => boolean;
}) {
  const [search, setSearch] = useState(""),
    [classId, setClass] = useState("ALL"),
    [type, setType] = useState("ALL"),
    [cost, setCost] = useState("ALL"),
    [rarity, setRarity] = useState("ALL");
  const cards = filterCards(catalog, hero, {
    search,
    classId,
    type,
    cost,
    rarity,
  }).filter(isRevealed);
  const total = entries.reduce((n, e) => n + e.quantity, 0);
  return (
    <section className="collection" aria-label="Collection">
      {catalog.version === "elements_v1" && (
        <p className="collection-reveal-note">
          Event cards appear here after their weekly reveal.{" "}
          <a href="/events">See the season schedule</a>.
        </p>
      )}
      <div className="collection-filters">
        <label>
          Search names, rules or keywords
          <input value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label>
          {catalog.version === "elements_v1" ? "System" : "Class"}
          <select value={classId} onChange={(e) => setClass(e.target.value)}>
            <option value="ALL">All systems / classes</option>
            {hero.classes.map((c) => (
              <option key={c} value={c}>
                {classLabel[c]}
              </option>
            ))}
            <option value="COMMON">
              {catalog.version === "elements_v1" ? "Neutral" : "Common"}
            </option>
          </select>
        </label>
        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="ALL">All types</option>
            <option value="UNIT">Unit</option>
            <option value="TRICK">Trick</option>
          </select>
        </label>
        <label>
          Cost
          <select value={cost} onChange={(e) => setCost(e.target.value)}>
            <option value="ALL">All costs</option>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n === 6 ? "6+" : n}
              </option>
            ))}
          </select>
        </label>
        {catalog.version === "elements_v1" && (
          <label>
            Rarity
            <select value={rarity} onChange={(e) => setRarity(e.target.value)}>
              <option value="ALL">All rarities</option>
              {["U", "R", "SR", "SL", "E"].map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <p role="status">{cards.length} matching cards</p>
      <div className="collection-grid">
        {cards.map((c) => (
          <article
            className={`collection-card panel ${c.faction.toLowerCase()}`}
            data-rarity={c.rarity}
            data-owned={owned(c)}
            key={c.id}
            onClick={() => onInspect(c)}
          >
            <CardVisual
              definition={c}
              surface="collection"
              artRetry
              title={
                <button
                  className="card-title"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspect(c);
                  }}
                >
                  {contentName(c.id)}
                </button>
              }
            />
            {c.rarity === "E" && (
              <p className="owned-count">Owned {owned(c)}/2 · Event tickets</p>
            )}
            <QuantityControls
              card={c}
              owned={owned(c)}
              quantity={entries.find((e) => e.cardId === c.id)?.quantity ?? 0}
              total={total}
              onChange={onChange}
            />
          </article>
        ))}
      </div>
      {!cards.length && (
        <div>
          <p>No matching cards.</p>
          <button
            onClick={() => {
              setSearch("");
              setClass("ALL");
              setType("ALL");
              setCost("ALL");
              setRarity("ALL");
            }}
          >
            Reset filters
          </button>
        </div>
      )}
    </section>
  );
}
