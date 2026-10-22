import type { DeckEntry, PublicCatalog } from "@oathfront/contracts/browser";
import { deckStats } from "./model";
export default function ManaCurve({
  entries,
  catalog,
  compact = false,
}: {
  entries: DeckEntry[];
  catalog: PublicCatalog;
  compact?: boolean;
}) {
  const s = deckStats(entries, catalog);
  const table = (
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
  );
  return (
    <section
      className={`mana-curve${compact ? " mana-curve-compact" : ""}`}
      aria-label="Deck statistics"
    >
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
      {compact ? (
        <details className="curve-details">
          <summary>Energy curve · card counts</summary>
          {table}
        </details>
      ) : (
        table
      )}
    </section>
  );
}
