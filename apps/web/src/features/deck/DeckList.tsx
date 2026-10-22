import { SystemBadges, systemStrategy } from "../content/ContentBadges";
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
import DeckPreview from "./DeckPreview";
import ArtImage from "../match/ArtImage";
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
  const saved = items.find((d) => d.id === preview && d.heroId === heroId);
  const entries = saved?.entries ?? preset.entries;
  const name =
    saved?.name ??
    deckDisplayName({
      kind: "PRESET",
      presetId: preset.presetId,
      name: preset.name,
    });
  const source: Source = saved
    ? { kind: "SAVED", deckId: saved.id, deckRevision: saved.revision }
    : { kind: "PRESET", presetId: preset.presetId };
  const editHref = saved
    ? `/decks/${saved.id}/edit`
    : `/decks/new?hero=${heroId}&preset=${preset.presetId}`;
  const spotlight = entries
    .map((entry) => catalog.cards.find((card) => card.id === entry.cardId))
    .filter((card) => !!card)
    .slice(0, 3);
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
    <section className="setup deck-lobby">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Deck library</p>
          <h1>Decks for {contentName(hero.id)}</h1>
        </div>
        <Link href="/heroes">Change hero</Link>
      </div>
      <div className="deck-library-layout">
        <aside className="deck-library-sidebar" aria-label="Available decks">
          <article
            className={`deck-cover ${!saved ? "is-current" : ""}`}
            onClick={() => setPreview(null)}
          >
            <div className="deck-cover-art">
              <ArtImage
                artKey={hero.portraitKey}
                name={contentName(hero.id)}
                variant="bust"
                eager
                retry={false}
              />
              <span aria-hidden="true">{contentName(hero.id)}</span>
            </div>
            <div className="deck-cover-copy">
              <p className="eyebrow">Recommended preset</p>
              <button
                className="card-title"
                aria-pressed={!saved}
                onClick={(e) => {
                  e.stopPropagation();
                  setPreview(null);
                }}
              >
                {deckDisplayName({
                  kind: "PRESET",
                  presetId: preset.presetId,
                  name: preset.name,
                })}
              </button>
              <SystemBadges systems={hero.classes} />
              <p>Ready to play · All 30 cards included</p>
            </div>
          </article>
          <div className="saved-decks-heading">
            <h2>My decks</h2>
            <Link href={`/decks/new?hero=${heroId}`}>
              Create deck <span aria-hidden="true">+</span>
            </Link>
          </div>
          <div className="saved-decks">
            {items
              .filter((d) => d.heroId === heroId)
              .map((d) => (
                <article
                  key={d.id}
                  className={`saved-deck-cover ${saved?.id === d.id ? "is-current" : ""}`}
                  onClick={() => setPreview(d.id)}
                >
                  <button
                    className="card-title"
                    aria-pressed={saved?.id === d.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreview(d.id);
                    }}
                  >
                    {d.name}
                  </button>
                  <p>
                    {d.validation.totalCards}/30 cards ·{" "}
                    {d.validation.playable ? "Ready" : "Draft"}
                  </p>
                  <Link
                    href={`/decks/${d.id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Edit deck
                  </Link>
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
              <div className="deck-library-empty">
                <p>Your next strategy starts here.</p>
                <span>
                  Customize the preset or create a deck with{" "}
                  {contentName(hero.id)}’s two systems.
                </span>
              </div>
            )
          )}
          {cursor && (
            <button disabled={loading} onClick={() => void load(cursor!)}>
              Load more decks
            </button>
          )}
        </aside>
        <div className="deck-library-content">
          <section className="deck-overview" aria-label="Selected deck">
            <div className="deck-overview-copy">
              <p className="eyebrow">
                {saved ? "Your deck" : "Ready-to-play strategy"}
              </p>
              <h2>{name}</h2>
              <p>{systemStrategy(hero) || strategies[heroId]}</p>
              <div className="button-row">
                <button
                  className="primary"
                  disabled={!!saved && !saved.validation.playable}
                  onClick={() => onSelect(source)}
                >
                  Use this deck <span aria-hidden="true">↗</span>
                </button>
                <Link href={editHref}>{saved ? "Edit deck" : "Customize"}</Link>
              </div>
              {saved && !saved.validation.playable && (
                <p className="deck-draft-note">
                  This draft needs a valid 30-card deck before it can be played.
                </p>
              )}
            </div>
            <div className="deck-card-fan" aria-hidden="true">
              {spotlight.map((card) => (
                <span key={card.id}>
                  <ArtImage
                    artKey={card.artKey}
                    name={contentName(card.id)}
                    retry={false}
                  />
                </span>
              ))}
            </div>
          </section>
          <ManaCurve entries={entries} catalog={catalog} compact />
          <DeckPreview
            key={saved?.id ?? preset.presetId}
            entries={entries}
            catalog={catalog}
          />
        </div>
      </div>
    </section>
  );
}
