import type { DeckEntry, PublicCatalog } from "@oathfront/contracts/browser";
import { deckStats } from "./model";
export default function ManaCurve({
  entries,
  catalog,
}: {
  entries: DeckEntry[];
  catalog: PublicCatalog;
}) {
  const s = deckStats(entries, catalog);
  return (
    <section className="mana-curve" aria-label="Deck statistics">
      <p>
        <strong>{s.total}/30 cards</strong> · {s.units} Units / {s.tricks}{" "}
        Tricks · Average {s.average}
      </p>
      <div className="curve-bars" aria-hidden="true">
        {s.curve.map((n, i) => (
          <div key={i} title={`${i === 5 ? "6+" : i + 1}: ${n} cards`}>
            <span style={{ height: `${Math.max(3, n * 4)}px` }} />
            <b>{n}</b>
            <small>{i === 5 ? "6+" : i + 1}</small>
          </div>
        ))}
      </div>
      <table className="curve-table">
        <caption>Cost by copy count</caption>
        <thead>
          <tr>
            {s.curve.map((_, i) => (
              <th key={i} scope="col">
                {i === 5 ? "6+" : i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {s.curve.map((n, i) => (
              <td key={i}>{n}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </section>
  );
}
