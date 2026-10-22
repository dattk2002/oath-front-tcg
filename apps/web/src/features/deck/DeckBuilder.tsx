import {
  RarityBadge,
  SystemBadge,
  SystemBadges,
} from "../content/ContentBadges";
import { useCollection } from "../content/use-collection";
import { useVersionedCatalog } from "../content/use-versioned-catalog";
import { contentName, contentText } from "../../content/english-content";
import { usePrivateStorage } from "../auth/private-storage";
import ArtImage from "../match/ArtImage";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import {
  validateBrowserWire,
  validateDeck,
} from "@oathfront/contracts/browser";
import type {
  CardDefinitionView,
  DeckDTO,
  DeckInput,
  PublicCatalog,
  RematchConfig,
} from "@oathfront/contracts/browser";
import type { ApiClient } from "../match/api-client";
import { ApiError } from "../match/api-error";
import { openDialog } from "../match/keyboard";
import CardCollection, { QuantityControls } from "./CardCollection";
import ManaCurve from "./ManaCurve";
import { classLabel, keywordLabel } from "../match/labels";
import { changeQuantity, normalize } from "./model";
import { draftLocation, readDraft, writeDraft } from "./draft-storage";
import type { DraftLocation, PendingSave } from "./draft-storage";
const keywordCopy: Record<string, string> = {
  SHIELD: "Blocks one positive damage packet, then consumes Shield.",
  ARMOR: "Reduces each damage packet by 1; does not stack.",
  POISONED: "Takes 1 damage at turn end; Poison does not stack.",
  STUNNED:
    "Cannot attack for the rest of this turn; still blocks the lane and triggers abilities.",
  PIERCE:
    "Regular attacks damage both the blocking unit and the hero behind it.",
  MOVE: "Changes lanes while keeping HP, statuses and its attack marker.",
};
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => openDialog(ref.current!, heading.current), []);
  return (
    <dialog
      ref={ref}
      className="match-dialog panel builder-dialog"
      onCancel={(e) => {
        e.preventDefault();
        onClose?.();
      }}
    >
      <h2 ref={heading} tabIndex={-1}>
        {title}
      </h2>
      {children}
    </dialog>
  );
}
export default function DeckBuilder({
  catalog: currentCatalog,
  api,
  initial,
  saved,
  review,
  onContinue,
}: {
  catalog: PublicCatalog;
  api: ApiClient;
  initial: DeckInput;
  saved?: DeckDTO;
  review?: { matchId: string; config: RematchConfig };
  onContinue: (deck: DeckDTO) => void;
}) {
  const storage = usePrivateStorage();
  const router = useRouter(),
    root = useRef<HTMLElement>(null),
    lock = useRef(false),
    pending = useRef<PendingSave | null>(null),
    storedLocation = useRef<DraftLocation | null>(null),
    createPending = useRef<Extract<
      import("@oathfront/contracts/browser").CreateMatchRequest,
      { mode: "SKIRMISH" }
    > | null>(null);
  const [deck, setDeck] = useState<DeckInput>(
      review ? { ...initial, contentVersion: currentCatalog.version } : initial,
    ),
    [base, setBase] = useState(saved),
    [baseline, setBaseline] = useState(JSON.stringify(initial)),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [reviewPending, setReviewPending] = useState(false),
    [message, setMessage] = useState(""),
    [inspect, setInspect] = useState<CardDefinitionView | null>(null),
    [deckOpen, setDeckOpen] = useState(false),
    [stale, setStale] = useState<DeckDTO | null>(null),
    [leave, setLeave] = useState<string | null>(null),
    [nameError, setNameError] = useState(false),
    [conflict, setConflict] = useState<string | null>(null);
  const bound = useVersionedCatalog(
    api,
    review ? currentCatalog.version : deck.contentVersion,
    currentCatalog,
  );
  const catalog = bound.catalog ?? currentCatalog;
  const inventory = useCollection(api, catalog.version === "elements_v1");
  const ownedValid =
    catalog.version !== "elements_v1" ||
    deck.entries.every((e) => {
      const card = catalog.cards.find((c) => c.id === e.cardId);
      return !!card && e.quantity <= inventory.owned(card);
    });
  const initialKey = draftLocation(
    initial.heroId,
    saved ?? null,
    review?.matchId,
  ).key;
  const dirty =
    JSON.stringify(deck) !== baseline || (!base && deck.entries.length > 0);
  const validation = validateDeck(deck, catalog);
  const hero = catalog.heroes.find((h) => h.id === deck.heroId)!;
  const nameValid =
    deck.name.normalize("NFC").trim().length > 0 &&
    deck.name.normalize("NFC").trim().length <= 40;
  useEffect(() => {
    try {
      const restored = readDraft(
        storage,
        initial,
        saved ?? null,
        review?.matchId,
      );
      if (restored) {
        storedLocation.current = restored.location;
        setDeck(restored.draft.deck);
        setBase(restored.draft.base ?? undefined);
        let matchesSavedBase = false;
        if (restored.draft.base) {
          const { name, heroId, entries, contentVersion } = restored.draft.base;
          const savedBaseline = JSON.stringify({
            name,
            heroId,
            entries,
            contentVersion,
          });
          setBaseline(savedBaseline);
          matchesSavedBase =
            JSON.stringify(restored.draft.deck) === savedBaseline;
        }
        pending.current = restored.draft.pending;
        setMessage(
          matchesSavedBase && !restored.draft.pending
            ? "Saved"
            : "Local draft restored; not yet saved to the server.",
        );
      }
    } catch {
      setMessage(
        "The local draft could not be read. Keep this page open while editing.",
      );
    }
    setReady(true);
  }, [initialKey, initial, saved, review?.matchId]);
  useEffect(() => {
    if (!ready) return;
    try {
      storedLocation.current = writeDraft(
        storage,
        { deck, base: base ?? null, pending: pending.current },
        storedLocation.current,
        review?.matchId,
      );
    } catch {
      setMessage(
        "The local draft could not be saved. Keep this page open to preserve your changes.",
      );
    }
  }, [deck, base, ready, review?.matchId]);
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const click = (e: MouseEvent) => {
      const link = (e.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (
        dirty &&
        link &&
        link.origin === location.origin &&
        !link.hash &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey
      ) {
        e.preventDefault();
        e.stopPropagation();
        setLeave(link.pathname + link.search);
      }
    };
    const currentHref = location.pathname + location.search;
    const currentHistoryState: unknown = history.state;
    const beforeNavigation = (event: NavigateEvent) => {
      if (!dirty || event.navigationType !== "traverse" || !event.cancelable)
        return;
      const url = new URL(event.destination.url);
      if (url.origin !== location.origin) return;
      event.preventDefault();
      setLeave(url.pathname + url.search);
    };
    const back = (event: PopStateEvent) => {
      if (!dirty || "navigation" in window) return;
      const target = location.pathname + location.search;
      if (target === currentHref) return;
      event.stopImmediatePropagation();
      // Restore the entry without overwriting the destination that Back just left.
      // Keep Next's current tree so Stay preserves this mounted draft.
      history.pushState(currentHistoryState, "", currentHref);
      setLeave(target);
    };
    if ("navigation" in window)
      window.navigation.addEventListener("navigate", beforeNavigation);
    window.addEventListener("popstate", back, true);
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("popstate", back, true);
      if ("navigation" in window)
        window.navigation.removeEventListener("navigate", beforeNavigation);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, router]);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".deck-builder-layout",
        { opacity: 0.6 },
        {
          opacity: 1,
          duration: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? 0
            : 0.16,
        },
      );
    }, root);
    return () => ctx.revert();
  }, []);
  function change(id: CardDefinitionView["id"], delta: number) {
    if (busy || pending.current || createPending.current) return;
    setDeck((old) => ({
      ...old,
      entries: changeQuantity(
        old.entries,
        id,
        delta,
        inventory.owned(catalog.cards.find((c) => c.id === id)!),
      ),
    }));
  }
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".deck-summary-count",
        { opacity: 0.4 },
        {
          opacity: 1,
          duration: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? 0
            : 0.14,
        },
      );
    }, root);
    return () => ctx.revert();
  }, [deck.entries]);
  function clearLocal() {
    try {
      const location =
        storedLocation.current ??
        draftLocation(deck.heroId, base ?? null, review?.matchId);
      storage.removeItem(location.key);
      storage.removeItem(location.pointer);
    } catch {
      /* Confirmed save. */
    }
  }
  function adoptSaved(result: DeckDTO) {
    pending.current = null;
    const { name, heroId, entries, contentVersion } = result;
    const clean = { name, heroId, entries, contentVersion };
    setBase(result);
    setDeck(clean);
    setBaseline(JSON.stringify(clean));
    setStale(null);
    try {
      storedLocation.current = writeDraft(
        storage,
        { deck: clean, base: result, pending: null },
        storedLocation.current,
        review?.matchId,
      );
    } catch {
      /* State remains available on this page. */
    }
  }
  async function save(
    asCopy = false,
    navigate = false,
  ): Promise<DeckDTO | null> {
    if (lock.current) return null;
    if (!pending.current && !ownedValid) {
      setMessage(
        "This deck uses Event copies you do not own. Your draft is preserved.",
      );
      return null;
    }
    if (!nameValid) {
      setNameError(true);
      requestAnimationFrame(() =>
        document.getElementById("deck-error-summary")?.focus(),
      );
      return null;
    }
    lock.current = true;
    setBusy(true);
    setMessage("");
    const p = pending.current ?? {
      id: !asCopy && base ? base.id : null,
      body:
        !asCopy && base
          ? {
              commandId: crypto.randomUUID(),
              expectedDeckRevision: base.revision,
              deck,
            }
          : { commandId: crypto.randomUUID(), deck },
    };
    pending.current = p;
    let durable = true;
    try {
      storedLocation.current = writeDraft(
        storage,
        { deck, base: base ?? null, pending: p },
        storedLocation.current,
        review?.matchId,
      );
    } catch {
      durable = false;
    }
    try {
      const result =
        p.id && "expectedDeckRevision" in p.body
          ? await api.updateDeck(p.id, p.body)
          : await api.saveDeck(p.body);
      adoptSaved(result);
      setMessage("Saved");
      if (navigate && !review) router.replace(`/decks/${result.id}/edit`);
      return result;
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.body.error.code === "STALE_DECK_REVISION"
      ) {
        setStale(error.body.error.details.deck);
        pending.current = null;
      } else if (
        error instanceof ApiError &&
        error.status !== 401 &&
        error.status < 500 &&
        !error.body.error.retryable
      ) {
        pending.current = null;
        setMessage(
          "The deck could not be saved. Check its name, copy counts and systems; your draft is preserved.",
        );
      } else
        setMessage(
          `Save result is unconfirmed. Restore your session if expired, then retry the same request.${durable ? "" : " The request could not be saved; keep this page open and do not reload."}`,
        );
      try {
        storedLocation.current = writeDraft(
          storage,
          { deck, base: base ?? null, pending: pending.current },
          storedLocation.current,
          review?.matchId,
        );
      } catch {
        /* The in-memory request remains available for retry. */
      }
      return null;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function acceptReview() {
    if (
      !review ||
      lock.current ||
      (!createPending.current &&
        (!validation.playable || !nameValid || !ownedValid))
    )
      return;
    let source = review.config.deck;
    if (
      !createPending.current &&
      (JSON.stringify(deck) !== JSON.stringify(initial) ||
        initial.contentVersion !== catalog.version)
    ) {
      const result = await save(true);
      if (!result) return;
      source = {
        kind: "SAVED",
        deckId: result.id,
        deckRevision: result.revision,
      };
    }
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    const body = createPending.current ?? {
      ...review.config,
      deck: source,
      commandId: crypto.randomUUID(),
      mode: "SKIRMISH" as const,
      expectedContentVersion: catalog.version,
    };
    createPending.current = body;
    setReviewPending(true);
    let durable = true;
    try {
      storage.setItem(
        `oathfront.review-create.${review.matchId}`,
        JSON.stringify(body),
      );
    } catch {
      durable = false;
    }
    try {
      const result = await api.createMatch(body);
      clearLocal();
      try {
        storage.removeItem(`oathfront.review-create.${review.matchId}`);
      } catch {
        /* Confirmed. */
      }
      router.push(`/matches/${result.view.matchId}`);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.body.error.code === "ACTIVE_MATCH_EXISTS"
      )
        setConflict(error.body.error.details.matchId);
      else if (
        error instanceof ApiError &&
        error.status !== 401 &&
        error.status < 500
      ) {
        createPending.current = null;
        setReviewPending(false);
        setMessage("The request was rejected. Check the deck source.");
      } else
        setMessage(
          `Match creation is unconfirmed. Retry sends the same request.${durable ? "" : " The request could not be saved; keep this page open and do not reload."}`,
        );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!review) return;
    try {
      const body: unknown = JSON.parse(
        storage.getItem(`oathfront.review-create.${review.matchId}`) ?? "null",
      );
      if (
        validateBrowserWire("CreateMatchRequest", body) &&
        body.mode === "SKIRMISH" &&
        body.opponentHeroId === review.config.opponentHeroId &&
        body.difficulty === review.config.difficulty
      ) {
        createPending.current = body;
        setReviewPending(true);
        setMessage(
          "A previous match request is unconfirmed. Retry keeps its original deck and rules.",
        );
      }
    } catch {
      /* Memory retries. */
    }
  }, [review]);
  if (!bound.catalog)
    return (
      <section className="status-panel panel">
        <h1>Loading deck rules</h1>
        {bound.failed ? (
          <>
            <p role="alert">
              The original catalog could not be loaded. Your deck has not
              changed.
            </p>
            <button onClick={bound.retry}>Retry deck rules</button>
          </>
        ) : (
          <p role="status">Restoring {deck.contentVersion}…</p>
        )}
      </section>
    );
  const rows = deck.entries
    .map((e) => ({
      entry: e,
      card: catalog.cards.find((c) => c.id === e.cardId),
    }))
    .sort(
      (a, b) =>
        (a.card?.cost ?? 0) - (b.card?.cost ?? 0) ||
        normalize(
          a.card ? contentName(a.card.id) : a.entry.cardId,
        ).localeCompare(
          normalize(b.card ? contentName(b.card.id) : b.entry.cardId),
          "en",
        ),
    );
  const deckPanel = (
    <aside className="panel deck-panel" aria-label="Deck list">
      <h2 className="deck-summary-count">Deck · {validation.totalCards}/30</h2>
      <ManaCurve catalog={catalog} entries={deck.entries} />
      {catalog.version === "elements_v1" && (
        <div className="deck-law">
          <SystemBadges systems={hero.classes} />
          <p>30 cards · Max 2 copies · Max 12 Neutral</p>
          {hero.classes.map((system) => (
            <p key={system}>
              {classLabel[system]}:{" "}
              {deck.entries.reduce(
                (sum, e) =>
                  sum +
                  (catalog.cards.find((c) => c.id === e.cardId)?.classId ===
                  system
                    ? e.quantity
                    : 0),
                0,
              )}{" "}
              / minimum 6
            </p>
          ))}
          <p>
            Neutral:{" "}
            {deck.entries.reduce(
              (sum, e) =>
                sum +
                (catalog.cards.find((c) => c.id === e.cardId)?.classId === null
                  ? e.quantity
                  : 0),
              0,
            )}{" "}
            / maximum 12
          </p>
        </div>
      )}
      {catalog.version !== "elements_v1" && (
        <p>Legacy rules · {catalog.version}. Editing keeps this version.</p>
      )}
      {inventory.error && (
        <p role="alert">
          Collection could not be refreshed.{" "}
          <button onClick={inventory.retry}>Retry collection</button>
        </p>
      )}
      {!ownedValid && (
        <p role="status">
          Some Event copies are not owned or collection data is still loading.
        </p>
      )}
      <ul className="builder-rows">
        {rows.map(({ entry, card }) => (
          <li
            key={entry.cardId}
            data-rarity={card?.rarity}
            onClick={() => card && setInspect(card)}
          >
            {card ? (
              <>
                <button
                  className="card-title"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInspect(card);
                  }}
                >
                  {card.cost} · {contentName(card.id)}
                </button>
                <RarityBadge rarity={card.rarity} />
                <QuantityControls
                  owned={inventory.owned(card)}
                  card={card}
                  quantity={entry.quantity}
                  total={validation.totalCards}
                  onChange={change}
                />
              </>
            ) : (
              entry.cardId
            )}
          </li>
        ))}
      </ul>
      {!rows.length && (
        <p>Your deck is empty. Add cards from the collection.</p>
      )}
      {!validation.playable && (
        <p role="status">Draft · Add 30 legal cards to play.</p>
      )}
    </aside>
  );
  return (
    <section className="setup deck-builder" ref={root}>
      <div className="screen-heading">
        <div>
          <h1>{review ? "Review deck" : "Build your deck"}</h1>
          <p>
            {contentName(hero.id)} ·{" "}
            {hero.classes.map((c) => classLabel[c]).join(" · ")}
          </p>
        </div>
        <Link href={`/heroes/${hero.id}/decks`}>Back to decks</Link>
      </div>
      {review && (
        <section className="panel review-source">
          <h2>Original deck source preserved</h2>
          <p>
            {review.config.deck.kind === "PRESET"
              ? `PRESET ${review.config.deck.presetId}`
              : `SAVED ${review.config.deck.deckId} · revision ${review.config.deck.deckRevision}`}
          </p>
          <p>
            Original content: {review.config.expectedContentVersion} · Current:{" "}
            {catalog.version}
          </p>
          <p>
            Review the deck below. A match starts only after you explicitly
            accept.
          </p>
        </section>
      )}
      {nameError && !nameValid && (
        <div
          id="deck-error-summary"
          tabIndex={-1}
          role="alert"
          className="notice"
        >
          <a
            href="#deck-name"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("deck-name")?.focus();
            }}
          >
            Deck names must contain 1–40 characters.
          </a>
        </div>
      )}
      <fieldset
        disabled={busy || !!pending.current || !!createPending.current}
        className="builder-fields"
      >
        <label className="deck-name">
          Deck name
          <input
            id="deck-name"
            maxLength={80}
            value={deck.name}
            aria-invalid={nameError && !nameValid}
            aria-describedby={
              nameError && !nameValid ? "deck-name-error" : undefined
            }
            onChange={(e) =>
              setDeck((old) => ({ ...old, name: e.target.value }))
            }
          />
        </label>
        {nameError && !nameValid && (
          <p id="deck-name-error" role="alert">
            Enter a name with 1 to 40 characters.
          </p>
        )}
        <div className="deck-builder-layout">
          <CardCollection
            catalog={catalog}
            hero={hero}
            entries={deck.entries}
            onChange={change}
            onInspect={setInspect}
            owned={inventory.owned}
            isRevealed={inventory.isRevealed}
          />
          <div className="desktop-deck-panel">{deckPanel}</div>
        </div>
      </fieldset>
      <div className="deck-footer">
        <button
          className="mobile-deck-button"
          aria-haspopup="dialog"
          onClick={() => setDeckOpen(true)}
        >
          Deck · {validation.totalCards}/30
        </button>
        <p role="status">
          {busy
            ? "Checking…"
            : message || (dirty ? "Local draft · Unsaved" : "Saved")}
        </p>
        <button
          disabled={
            busy || !!createPending.current || (!pending.current && !ownedValid)
          }
          onClick={() => void save(false, true)}
        >
          Save deck
        </button>
        {review ? (
          <button
            className="primary"
            disabled={
              busy ||
              (!reviewPending &&
                (!validation.playable || !nameValid || !ownedValid))
            }
            onClick={() => void acceptReview()}
          >
            Accept and create match
          </button>
        ) : (
          <button
            className="primary"
            disabled={busy || !validation.playable || !nameValid || !ownedValid}
            onClick={async () => {
              const result = dirty || !base ? await save() : base;
              if (result) onContinue(result);
            }}
          >
            {dirty || !base ? "Save and continue" : "Choose your opponent"}
          </button>
        )}
      </div>
      {conflict && <Link href={`/matches/${conflict}`}>Resume match</Link>}
      {deckOpen && (
        <Modal
          title={`Deck · ${validation.totalCards}/30`}
          onClose={() => setDeckOpen(false)}
        >
          <fieldset
            className="builder-fields"
            disabled={busy || !!pending.current || !!createPending.current}
          >
            {deckPanel}
          </fieldset>
          <button onClick={() => setDeckOpen(false)}>Close deck</button>
        </Modal>
      )}
      {inspect && (
        <Modal title={contentName(inspect.id)} onClose={() => setInspect(null)}>
          <div className="deck-inspect-art">
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
          <p>{contentText(inspect.id)}</p>
          <div className="keyword-help">
            {inspect.keywords.map((k) => (
              <details key={k}>
                <summary title={keywordCopy[k]}>{keywordLabel[k]}</summary>
                <p>{keywordCopy[k]}</p>
              </details>
            ))}
          </div>
          <QuantityControls
            card={inspect}
            owned={inventory.owned(inspect)}
            quantity={
              deck.entries.find((e) => e.cardId === inspect.id)?.quantity ?? 0
            }
            total={validation.totalCards}
            onChange={change}
          />
          <button onClick={() => setInspect(null)}>Close card details</button>
        </Modal>
      )}
      {stale && (
        <Modal title="This deck changed in another tab">
          <p>
            Your draft is preserved. The server version is now revision{" "}
            {stale.revision}.
          </p>
          <button
            onClick={() => {
              adoptSaved(stale);
              setMessage("Latest version loaded");
            }}
          >
            Load latest version
          </button>
          <button onClick={() => void save(true, true)}>Save as copy</button>
          <button onClick={() => setStale(null)}>Stay</button>
        </Modal>
      )}
      {leave && (
        <Modal
          title="Your deck has unsaved changes"
          onClose={() => setLeave(null)}
        >
          <button
            disabled={busy}
            onClick={async () => {
              const result = await save();
              if (result) {
                const href = leave;
                setLeave(null);
                router.push(href);
              }
            }}
          >
            Save
          </button>
          <button
            disabled={busy}
            onClick={() => {
              clearLocal();
              router.push(leave);
            }}
          >
            Leave
          </button>
          <button onClick={() => setLeave(null)}>Stay</button>
        </Modal>
      )}
    </section>
  );
}
