import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  DeckDTO,
  HeroId,
  PublicCatalog,
  CreateMatchRequest,
} from "@oathfront/contracts/browser";
import type { ApiClient } from "../match/api-client";
import ManaCurve from "./ManaCurve";
import { strategies, presetNames } from "../hero/HeroInspect";
type Source = Extract<CreateMatchRequest, { mode: "SKIRMISH" }>["deck"];
export default function DeckList({
  catalog,
  heroId,
  api,
  onSelect,
}: {
  catalog: PublicCatalog;
  heroId: HeroId;
  api: ApiClient;
  onSelect: (source: Source) => void;
}) {
  const [items, setItems] = useState<DeckDTO[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [error, setError] = useState(false),
    [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const preset = catalog.presets.find((p) => p.heroId === heroId)!;
  const hero = catalog.heroes.find((h) => h.id === heroId)!;
  async function load(next?: string) {
    setLoading(true);
    setError(false);
    try {
      const p = await api.decks(next);
      setItems((old) => (next ? [...old, ...p.items] : p.items));
      setCursor(p.nextCursor);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    void api.decks().then(
      (p) => {
        if (active) {
          setItems(p.items);
          setCursor(p.nextCursor);
          setLoading(false);
        }
      },
      () => {
        if (active) {
          setError(true);
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [api]);
  return (
    <section className="setup">
      <div className="screen-heading">
        <h1>Bộ bài của {hero.nameVi}</h1>
        <Link href="/heroes">Đổi hero</Link>
      </div>
      <h2>Deck mẫu — đề xuất</h2>
      <article
        className="panel deck-choice"
        onClick={() => setPreview(preset.presetId)}
      >
        <button
          className="card-title"
          onClick={(e) => {
            e.stopPropagation();
            setPreview(preset.presetId);
          }}
        >
          {presetNames[preset.presetId]}
        </button>
        <p>{strategies[heroId]}</p>
        <ManaCurve entries={preset.entries} catalog={catalog} />
        <div className="button-row" onClick={(e) => e.stopPropagation()}>
          <button
            className="primary"
            onClick={() =>
              onSelect({ kind: "PRESET", presetId: preset.presetId })
            }
          >
            Dùng bộ bài này
          </button>
          <Link
            className="button-link"
            href={`/decks/new?hero=${heroId}&preset=${preset.presetId}`}
          >
            Tùy chỉnh
          </Link>
        </div>
      </article>
      <h2>Bộ bài cá nhân</h2>
      <div className="saved-decks">
        {items
          .filter((d) => d.heroId === heroId)
          .map((d) => (
            <article
              key={d.id}
              className="panel deck-choice"
              onClick={() => setPreview(d.id)}
            >
              <button
                className="card-title"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreview(d.id);
                }}
              >
                {d.name}
              </button>
              <p>
                {d.validation.totalCards}/30 ·{" "}
                {d.validation.playable ? "Sẵn sàng" : "Bản nháp"} · phiên bản{" "}
                {d.revision}
              </p>
              <div className="button-row" onClick={(e) => e.stopPropagation()}>
                <button
                  disabled={!d.validation.playable}
                  onClick={() =>
                    onSelect({
                      kind: "SAVED",
                      deckId: d.id,
                      deckRevision: d.revision,
                    })
                  }
                >
                  Dùng bộ bài này
                </button>
                <Link href={`/decks/${d.id}/edit`}>Sửa bộ bài</Link>
              </div>
            </article>
          ))}
      </div>
      {loading ? (
        <p role="status">Đang tải bộ bài…</p>
      ) : error ? (
        <p role="alert">
          Không tải được bộ bài.{" "}
          <button onClick={() => void load(cursor ?? undefined)}>
            Thử lại bộ bài
          </button>
        </p>
      ) : (
        !items.some((d) => d.heroId === heroId) && (
          <p>Chưa có bộ bài cá nhân cho hero này.</p>
        )
      )}
      {cursor && (
        <button disabled={loading} onClick={() => void load(cursor)}>
          Tải thêm bộ bài
        </button>
      )}
      <Link className="button-link" href={`/decks/new?hero=${heroId}`}>
        Tạo bộ bài
      </Link>
      {preview && (
        <section className="panel deck-preview" aria-label="Xem trước bộ bài">
          <h2>
            {preview === preset.presetId
              ? presetNames[preset.presetId]
              : items.find((d) => d.id === preview)?.name}
          </h2>
          <ul>
            {(preview === preset.presetId
              ? preset.entries
              : (items.find((d) => d.id === preview)?.entries ?? [])
            ).map((e) => (
              <li key={e.cardId}>
                {catalog.cards.find((c) => c.id === e.cardId)?.nameVi} ×{" "}
                {e.quantity}
              </li>
            ))}
          </ul>
          <button onClick={() => setPreview(null)}>Đóng xem trước</button>
        </section>
      )}
    </section>
  );
}
