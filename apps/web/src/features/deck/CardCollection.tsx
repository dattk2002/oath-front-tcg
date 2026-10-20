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
        aria-label={`Bớt ${card.nameVi}`}
        disabled={!quantity}
        onClick={() => onChange(card.id, -1)}
      >
        −
      </button>
      <span aria-label={`${quantity} trên 2 bản`}>{quantity}/2</span>
      <button
        aria-label={`Thêm ${card.nameVi}`}
        disabled={quantity >= 2 || total >= 30}
        onClick={() => onChange(card.id, 1)}
      >
        +
      </button>
      <small>
        {quantity >= 2
          ? "Tối đa 2 bản"
          : total >= 30
            ? "Bộ bài đã đủ 30 lá"
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
    <section className="collection" aria-label="Bộ sưu tập">
      <div className="collection-filters">
        <label>
          Tìm tên hoặc keyword
          <input value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label>
          Class
          <select value={classId} onChange={(e) => setClass(e.target.value)}>
            <option value="ALL">Tất cả class</option>
            {hero.classes.map((c) => (
              <option key={c} value={c}>
                {classLabel[c]}
              </option>
            ))}
            <option value="COMMON">Chung</option>
          </select>
        </label>
        <label>
          Loại
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="ALL">Tất cả loại</option>
            <option value="UNIT">Nhân vật</option>
            <option value="TRICK">Trick</option>
          </select>
        </label>
        <label>
          Chi phí
          <select value={cost} onChange={(e) => setCost(e.target.value)}>
            <option value="ALL">Tất cả chi phí</option>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n === 6 ? "6+" : n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p role="status">{cards.length} lá phù hợp</p>
      <div className="collection-grid">
        {cards.map((c) => (
          <article
            className="collection-card panel"
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
              {c.nameVi}
            </button>
            <span className={`card-art ${c.faction.toLowerCase()}`}>
              <ArtImage artKey={c.artKey} name={c.nameVi} />
            </span>
            <p>
              {c.type === "UNIT"
                ? `${c.printed.attack} Công · ${c.printed.hp} Máu`
                : "Trick"}
            </p>
            <p className="card-rules">{c.exactTextVi}</p>
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
        <p>Không có lá phù hợp. Hãy đổi bộ lọc hoặc tìm kiếm.</p>
      )}
    </section>
  );
}
