import { systemStrategy } from "../content/ContentBadges";
import { contentName, deckDisplayName } from "../../content/english-content";
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
import { strategies } from "../hero/HeroInspect";
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
        <h1>Decks for {contentName(hero.id)}</h1>
        <Link href="/heroes">Change hero</Link>
      </div>
      <h2>Recommended preset deck</h2>
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
          {deckDisplayName({
            kind: "PRESET",
            presetId: preset.presetId,
            name: preset.name,
          })}
        </button>
        <p>{systemStrategy(hero) || strategies[heroId]}</p>
        <ManaCurve entries={preset.entries} catalog={catalog} />
        <div className="button-row" onClick={(e) => e.stopPropagation()}>
          <button
            className="primary"
            onClick={() =>
              onSelect({ kind: "PRESET", presetId: preset.presetId })
            }
          >
            Use this deck
          </button>
          <Link
            className="button-link"
            href={`/decks/new?hero=${heroId}&preset=${preset.presetId}`}
          >
            Customize
          </Link>
        </div>
      </article>
      <h2>My decks</h2>
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
                {d.validation.playable ? "Ready" : "Draft"} · revision{" "}
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
                  Use this deck
                </button>
                <Link href={`/decks/${d.id}/edit`}>Edit deck</Link>
              </div>
            </article>
          ))}
      </div>
      {loading ? (
        <p role="status">Loading decks…</p>
      ) : error ? (
        <p role="alert">
          Decks could not be loaded.{" "}
          <button onClick={() => void load(cursor ?? undefined)}>
            Retry decks
          </button>
        </p>
      ) : (
        !items.some((d) => d.heroId === heroId) && (
          <p>No saved decks for this hero yet.</p>
        )
      )}
      {cursor && (
        <button disabled={loading} onClick={() => void load(cursor)}>
          Load more decks
        </button>
      )}
      <Link className="button-link" href={`/decks/new?hero=${heroId}`}>
        Create deck
      </Link>
      {preview && (
        <section className="panel deck-preview" aria-label="Deck preview">
          <h2>
            {preview === preset.presetId
              ? deckDisplayName({
                  kind: "PRESET",
                  presetId: preset.presetId,
                  name: preset.name,
                })
              : items.find((d) => d.id === preview)?.name}
          </h2>
          <ul>
            {(preview === preset.presetId
              ? preset.entries
              : (items.find((d) => d.id === preview)?.entries ?? [])
            ).map((e) => (
              <li key={e.cardId}>
                {contentName(
                  catalog.cards.find((c) => c.id === e.cardId)?.id ?? "",
                )}{" "}
                × {e.quantity}
              </li>
            ))}
          </ul>
          <button onClick={() => setPreview(null)}>Close preview</button>
        </section>
      )}
    </section>
  );
}
