import { contentName, contentText } from "../../content/english-content";
import { useState } from "react";
import type {
  CardDefinitionView,
  DeckEntry,
  HeroDefinitionView,
  PublicCatalog,
} from "@oathfront/contracts/browser";
import { classLabel } from "../match/labels";
import { filterCards } from "./model";
import ArtImage from "../match/ArtImage";
export function QuantityControls({
  card,
  quantity,
  total,
  onChange,
}: {
  card: CardDefinitionView;
  quantity: number;
  total: number;
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
        disabled={quantity >= 2 || total >= 30}
        onClick={() => onChange(card.id, 1)}
      >
        +
      </button>
      <small>
        {quantity >= 2
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
}: {
  catalog: PublicCatalog;
  hero: HeroDefinitionView;
  entries: DeckEntry[];
  onChange: (id: CardDefinitionView["id"], delta: number) => void;
  onInspect: (c: CardDefinitionView) => void;
}) {
  const [search, setSearch] = useState(""),
    [classId, setClass] = useState("ALL"),
    [type, setType] = useState("ALL"),
    [cost, setCost] = useState("ALL");
  const cards = filterCards(catalog, hero, { search, classId, type, cost });
  const total = entries.reduce((n, e) => n + e.quantity, 0);
  return (
    <section className="collection" aria-label="Collection">
      <div className="collection-filters">
        <label>
          Search names, rules or keywords
          <input value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label>
          Class
          <select value={classId} onChange={(e) => setClass(e.target.value)}>
            <option value="ALL">All classes</option>
            {hero.classes.map((c) => (
              <option key={c} value={c}>
                {classLabel[c]}
              </option>
            ))}
            <option value="COMMON">Common</option>
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
      </div>
      <p role="status">{cards.length} matching cards</p>
      <div className="collection-grid">
        {cards.map((c) => (
          <article
            className={`collection-card panel ${c.faction.toLowerCase()}`}
            key={c.id}
            onClick={() => onInspect(c)}
          >
            <span className="card-cost">{c.cost}</span>
            <button
              className="card-title"
              onClick={(e) => {
                e.stopPropagation();
                onInspect(c);
              }}
            >
              {contentName(c.id)}
            </button>
            <span className={`card-art ${c.faction.toLowerCase()}`}>
              <ArtImage artKey={c.artKey} name={contentName(c.id)} />
            </span>
            <p className="card-stat-plate">
              {c.type === "UNIT"
                ? `${c.printed.attack} ATK · ${c.printed.hp} HP`
                : "Trick"}
            </p>
            <p className="card-rules">{contentText(c.id)}</p>
            <QuantityControls
              card={c}
              quantity={entries.find((e) => e.cardId === c.id)?.quantity ?? 0}
              total={total}
              onChange={onChange}
            />
          </article>
        ))}
      </div>
      {!cards.length && (
        <p>No matching cards. Change your filters or search.</p>
      )}
    </section>
  );
}
