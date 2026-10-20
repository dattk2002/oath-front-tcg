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
    <section className="mana-curve" aria-label="Thống kê bộ bài">
      <p>
        <strong>{s.total}/30 lá</strong> · {s.units} Nhân vật / {s.tricks} Trick
        · Trung bình {s.average}
      </p>
      <div className="curve-bars" aria-hidden="true">
        {s.curve.map((n, i) => (
          <div key={i} title={`${i === 5 ? "6+" : i + 1}: ${n} lá`}>
            <span style={{ height: `${Math.max(3, n * 4)}px` }} />
            <b>{n}</b>
            <small>{i === 5 ? "6+" : i + 1}</small>
          </div>
        ))}
      </div>
      <table className="curve-table">
        <caption>Chi phí theo số bản</caption>
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
