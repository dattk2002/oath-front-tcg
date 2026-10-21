import {
  contentName,
  heroTitle,
  contentText,
  deckDisplayName,
} from "../../content/english-content";
import { usePrivateStorage } from "../auth/private-storage";
import ArtImage from "../match/ArtImage";
import { useState } from "react";
import type {
  CommandResponse,
  CreateMatchRequest,
  HeroId,
  PublicCatalog,
} from "@oathfront/contracts";
import { restorePresetCreate } from "./pending-create";
import type { ApiClient } from "../match/api-client";
import { ApiError } from "../match/api-error";
import { classLabel, sideLabel } from "../match/labels";
const strategies: Record<HeroId, string> = {
  H_G_BV: "Protect units with Shield, heal, then take the board.",
  H_G_BP: "Disrupt the opponent and hold strong positions.",
  H_G_VP: "Grow your units and switch lanes to clear a path.",
  H_E_FX: "Combine damage and Poison to wear down the enemy.",
  H_E_FS: "Attack quickly and create piercing strikes.",
  H_E_XS: "Reposition, Poison and maintain card advantage.",
};
export default function PresetSetup({
  catalog,
  api,
  onCreated,
  onResume,
  initialRequest,
  selectedSource,
  selectedHeroId,
  onBack,
  onRejected,
}: {
  initialRequest?: CreateMatchRequest;
  selectedSource?: Extract<CreateMatchRequest, { mode: "SKIRMISH" }>["deck"];
  selectedHeroId?: HeroId;
  onBack?: () => void;
  onRejected: () => void;
  catalog: PublicCatalog;
  api: ApiClient;
  onCreated: (response: CommandResponse) => void;
  onResume: (id: string) => void;
}) {
  const storage = usePrivateStorage();
  const [restored] = useState(() =>
    selectedSource || typeof storage === "undefined"
      ? null
      : restorePresetCreate(catalog.presets, storage, catalog.version),
  );
  const original = initialRequest ?? restored?.request;
  const [pending, setPending] = useState<CreateMatchRequest | null>(
    original ?? null,
  );
  const [heroId, setHeroId] = useState<HeroId>(
    selectedHeroId ?? restored?.heroId ?? "H_G_BV",
  );
  const [stage, setStage] = useState<"HERO" | "DECK" | "OPPONENT">(
    original || selectedSource ? "OPPONENT" : "HERO",
  );
  const [opponentId, setOpponentId] = useState<HeroId | null>(
    original?.mode === "SKIRMISH" ? original.opponentHeroId : null,
  );
  const [difficulty, setDifficulty] = useState<"EASY" | "NORMAL">(
    original?.mode === "SKIRMISH" ? original.difficulty : "EASY",
  );
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState<string | null>(
      original
        ? "A match request is unconfirmed. Retry to check the same choices."
        : null,
    );
  const [rejected, setRejected] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const hero = catalog.heroes.find((item) => item.id === heroId)!;
  const preset = catalog.presets.find((item) => item.heroId === heroId)!;
  const opponents = catalog.heroes.filter(
    (item) => item.faction !== hero.faction,
  );
  const opponent =
    opponents.find((item) => item.id === opponentId) ?? opponents[0]!;
  async function create() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    let body = pending;
    body ??= {
      commandId: crypto.randomUUID(),
      mode: "SKIRMISH",
      deck: selectedSource ?? { kind: "PRESET", presetId: preset.presetId },
      opponentHeroId: opponent.id,
      difficulty,
      expectedContentVersion: catalog.version,
    };
    setPending(body);
    let durable = true;
    try {
      storage.setItem("oathfront.create", JSON.stringify(body));
    } catch {
      durable = false;
    }
    try {
      const response = await api.createMatch(body);
      try {
        storage.removeItem("oathfront.create");
      } catch {
        /* Confirmed or rejected receipt; memory still tracks the request. */
      }
      onCreated(response);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.body.error.code === "ACTIVE_MATCH_EXISTS"
      ) {
        setConflict(error.body.error.details.matchId);
        try {
          storage.removeItem("oathfront.create");
        } catch {
          /* Confirmed or rejected receipt; memory still tracks the request. */
        }
        setPending(null);
        setMessage("You have an active match. Resume it first.");
      } else if (
        error instanceof ApiError &&
        error.status !== 401 &&
        error.status < 500 &&
        !error.body.error.retryable
      ) {
        try {
          storage.removeItem("oathfront.create");
        } catch {
          /* Confirmed or rejected receipt; memory still tracks the request. */
        }
        setPending(null);
        setRejected(true);
        setMessage(
          "The request was rejected. Review your hero and deck before creating another match.",
        );
      } else
        setMessage(
          `Match creation is unconfirmed. Restore your session if expired, then retry the same request.${durable ? "" : " The request could not be saved; keep this page open and do not reload."}`,
        );
    } finally {
      setBusy(false);
    }
  }
  if (rejected)
    return (
      <section className="status-panel panel" role="alert">
        <h1>Review deck</h1>
        <p>{message}</p>
        <button className="primary" onClick={onRejected}>
          Choose another deck
        </button>
      </section>
    );
  const pendingPresetId =
    pending?.mode === "SKIRMISH" && pending.deck.kind === "PRESET"
      ? pending.deck.presetId
      : null;
  const pendingVersion =
    pending?.mode === "SKIRMISH" ? pending.expectedContentVersion : null;
  if (
    pending &&
    !selectedSource &&
    (pendingVersion !== catalog.version ||
      !catalog.presets.some(
        (item) =>
          item.presetId === pendingPresetId &&
          item.contentVersion === pendingVersion,
      ) ||
      (pending.mode === "SKIRMISH" &&
        !opponents.some((item) => item.id === pending.opponentHeroId)))
  )
    return (
      <section className="status-panel panel" role="alert">
        <h1>Restore pending match request</h1>
        <p>
          The saved deck or revision is unavailable in the current catalog. Your
          original request is preserved; no choices have been replaced.
        </p>
        <p>
          Retry to check the recorded result, or return home to resume your
          active match.
        </p>
        {message && <p>{message}</p>}
        <button
          className="primary"
          disabled={busy}
          onClick={() => void create()}
        >
          {busy ? "Checking…" : "Retry match request"}
        </button>
      </section>
    );
  return (
    <section className="setup" aria-labelledby="setup-title">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Play vs bot</p>
          <h1 id="setup-title">
            {stage === "HERO"
              ? "Choose your hero"
              : stage === "DECK"
                ? "Your deck"
                : "Choose your opponent"}
          </h1>
        </div>
        <p className="muted">
          {stage === "HERO"
            ? "Six heroes · All ready"
            : `${contentName(hero.id)} · ${sideLabel[hero.faction]}`}
        </p>
      </div>
      {stage === "HERO" ? (
        <div className="hero-selection">
          <fieldset className="hero-grid">
            <legend className="sr-only">Choose hero</legend>
            {catalog.heroes.map((item) => (
              <label
                className={`hero-tile ${item.faction.toLowerCase()}`}
                key={item.id}
              >
                <input
                  type="radio"
                  name="hero"
                  value={item.id}
                  checked={heroId === item.id}
                  onChange={() => setHeroId(item.id)}
                />
                <span className="hero-portrait">
                  <ArtImage
                    artKey={item.portraitKey}
                    name={contentName(item.id)}
                    eager
                  />
                </span>
                <span className="eyebrow">{sideLabel[item.faction]}</span>
                <strong>{contentName(item.id)}</strong>
                <span>
                  {item.classes.map((id) => classLabel[id]).join(" + ")}
                </span>
                <span className="muted">{strategies[item.id]}</span>
                <span className="selection-label">
                  {heroId === item.id ? "Selected" : "Choose hero"}
                </span>
              </label>
            ))}
          </fieldset>
          <aside className={`hero-detail panel ${hero.faction.toLowerCase()}`}>
            <p className="eyebrow">{heroTitle(hero.id)}</p>
            <h2>{contentName(hero.id)}</h2>
            <p>{strategies[hero.id]}</p>
            <h3>Four powers</h3>
            <ul className="power-list">
              {hero.powerIds.map((id) => {
                const power = catalog.powers.find((item) => item.id === id)!;
                return (
                  <li key={id}>
                    <strong>{contentName(power.id)}</strong>
                    {power.signatureOwner && (
                      <span className="signature">Signature</span>
                    )}
                    <p>{contentText(power.id)}</p>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      ) : stage === "DECK" ? (
        <article className="preset panel">
          <p className="eyebrow">Preset deck · Recommended</p>
          <h2>
            {deckDisplayName({
              kind: "PRESET",
              presetId: preset.presetId,
              name: preset.name,
            })}
          </h2>
          <p>{strategies[hero.id]}</p>
          <strong className="deck-count">30 / 30 cards</strong>
          <p className="muted">
            Maximum two copies per card ·{" "}
            {hero.classes.map((id) => classLabel[id]).join(" + ")}
          </p>
          <details>
            <summary>15 card types</summary>
            <ul className="deck-list">
              {preset.entries.map((entry) => (
                <li key={entry.cardId}>
                  <span>
                    {contentName(
                      catalog.cards.find((item) => item.id === entry.cardId)
                        ?.id ?? "",
                    )}
                  </span>
                  <strong>×{entry.quantity}</strong>
                </li>
              ))}
            </ul>
          </details>
        </article>
      ) : (
        <section className="opponent panel">
          <div className="matchup-art" aria-hidden="true">
            <div>
              <ArtImage
                artKey={hero.portraitKey}
                name={contentName(hero.id)}
                variant="inspect"
              />
              <strong>{contentName(hero.id)}</strong>
            </div>
            <span>VS</span>
            <div>
              <ArtImage
                artKey={opponent.portraitKey}
                name={contentName(opponent.id)}
                variant="inspect"
              />
              <strong>{contentName(opponent.id)}</strong>
            </div>
          </div>
          <fieldset disabled={busy || !!pending}>
            <legend>Opponent for {contentName(hero.id)}</legend>
            <label>
              Opponent hero
              <select
                value={opponent.id}
                onChange={(event) => {
                  const selected = opponents.find(
                    (item) => item.id === event.target.value,
                  );
                  if (selected) setOpponentId(selected.id);
                }}
              >
                {opponents.map((item) => (
                  <option value={item.id} key={item.id}>
                    {contentName(item.id)} · {sideLabel[item.faction]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Difficulty
              <select
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(
                    event.target.value === "NORMAL" ? "NORMAL" : "EASY",
                  )
                }
              >
                <option value="EASY">Easy</option>
                <option value="NORMAL">Normal</option>
              </select>
            </label>
          </fieldset>
          <p>
            The match starts only after you confirm. Both factions resolve lanes
            from 1 to 5.
          </p>
        </section>
      )}
      {message && (
        <p role="alert" className="notice">
          {message}
        </p>
      )}
      <div className="screen-actions">
        {stage !== "HERO" && (
          <button
            disabled={busy || !!pending}
            onClick={() =>
              selectedSource
                ? onBack?.()
                : setStage(stage === "DECK" ? "HERO" : "DECK")
            }
          >
            Back
          </button>
        )}
        {conflict ? (
          <button className="primary" onClick={() => onResume(conflict)}>
            Resume match
          </button>
        ) : (
          <button
            className="primary"
            disabled={busy}
            onClick={() => {
              if (stage === "HERO") setStage("DECK");
              else if (stage === "DECK") setStage("OPPONENT");
              else void create();
            }}
          >
            {stage === "HERO"
              ? "Choose deck"
              : stage === "DECK"
                ? "Use this deck"
                : busy
                  ? "Creating match…"
                  : pending
                    ? "Retry match creation"
                    : "Start match"}
          </button>
        )}
      </div>
    </section>
  );
}
