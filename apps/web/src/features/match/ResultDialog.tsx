import { RewardSummary } from "../events/RewardSummary";
import { useUiMotion } from "../motion/use-ui-motion";
import { contentName } from "../../content/english-content";
import { TutorialEntry } from "../tutorial/tutorial-controller";
import ArtImage from "./ArtImage";
import { usePrivateStorage } from "../auth/private-storage";
import SessionRecovery from "../auth/SessionRecovery";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { validateBrowserWire } from "@oathfront/contracts/browser";
import type {
  CreateMatchRequest,
  MatchSummary,
  PublicCatalog,
} from "@oathfront/contracts";
import type { ApiClient } from "./api-client";
import { ApiError } from "./api-error";
import { openDialog } from "./keyboard";
const titles: Record<NonNullable<MatchSummary["outcome"]>["reason"], string> = {
  HERO_DEFEATED: "",
  SIMULTANEOUS_LETHAL: "Draw",
  TURN_LIMIT: "Draw",
  SURRENDER: "Surrendered",
  EXPIRED: "Match closed",
  ACCOUNT_MERGE: "Match closed",
  ENGINE_FAULT: "Match interrupted",
  TUTORIAL_COMPLETED: "Tutorial complete",
  TUTORIAL_SKIPPED: "Tutorial skipped",
};
export function resultCopy(summary: MatchSummary) {
  const outcome = summary.outcome;
  const heading = outcome
    ? (outcome.reason === "SURRENDER" && outcome.result === "WIN"
        ? "Victory"
        : titles[outcome.reason]) ||
      (outcome.result === "WIN"
        ? "Victory"
        : outcome.result === "LOSS"
          ? "Defeat"
          : "Draw")
    : "Match finished";
  const reason = outcome?.reason;
  const body =
    reason === "HERO_DEFEATED"
      ? outcome?.result === "WIN"
        ? "The enemy hero was defeated."
        : "Your hero was defeated."
      : reason === "SIMULTANEOUS_LETHAL"
        ? "Both heroes were defeated in the same effect chain."
        : reason === "TURN_LIMIT"
          ? "Turn 20 has ended."
          : reason === "ENGINE_FAULT"
            ? "No win or loss recorded."
            : reason === "EXPIRED"
              ? "This match expired; no loss recorded."
              : reason === "ACCOUNT_MERGE"
                ? "This match closed when sessions merged; no loss recorded."
                : reason === "TUTORIAL_SKIPPED"
                  ? "You can replay the tutorial in Settings."
                  : "The match has ended.";
  return { heading, body };
}
export default function ResultDialog({
  summary,
  catalog,
  api,
}: {
  summary: MatchSummary;
  catalog: PublicCatalog;
  api: ApiClient;
}) {
  const storage = usePrivateStorage();
  const router = useRouter(),
    dialog = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const pending = useRef<CreateMatchRequest | null>(null),
    sending = useRef(false),
    alive = useRef(true);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState<string | null>(null),
    [review, setReview] = useState(false),
    [conflict, setConflict] = useState<string | null>(null);
  const key = `oathfront.rematch.${summary.matchId}`;
  useUiMotion(dialog, "panel");
  useEffect(() => {
    alive.current = true;
    const close = openDialog(dialog.current!, heading.current);
    try {
      const data: unknown = JSON.parse(storage.getItem(key) ?? "null");
      if (
        validateBrowserWire("CreateMatchRequest", data) &&
        data.mode === "SKIRMISH" &&
        summary.rematch &&
        JSON.stringify(data.deck) === JSON.stringify(summary.rematch.deck) &&
        data.opponentHeroId === summary.rematch.opponentHeroId &&
        data.difficulty === summary.rematch.difficulty &&
        data.expectedContentVersion === summary.rematch.expectedContentVersion
      )
        pending.current = data;
    } catch {
      /* Memory retry remains available. */
    }
    return () => {
      alive.current = false;
      close();
    };
  }, [key, summary.rematch]);
  const copy = resultCopy(summary);
  async function rematch() {
    if (sending.current || !summary.rematch) return;
    const version = summary.rematch.expectedContentVersion;
    // An uncertain command must be resolved with its original ID/body before migration.
    // core_v1 is still supported; heroes_v1 only adds heroes and reuses its card rules.
    if (
      !pending.current &&
      version !== catalog.version &&
      !(version === "core_v1" && catalog.version === "heroes_v1")
    ) {
      setReview(true);
      return;
    }
    sending.current = true;
    setBusy(true);
    setMessage(null);
    const request = pending.current ?? {
      commandId: crypto.randomUUID(),
      mode: "SKIRMISH" as const,
      ...summary.rematch,
    };
    pending.current = request;
    let durable = true;
    try {
      storage.setItem(key, JSON.stringify(request));
    } catch {
      durable = false;
      setMessage(
        "The request could not be saved. Keep this page open to retry the same request.",
      );
    }
    try {
      const response = await api.createMatch(request);
      try {
        storage.removeItem(key);
      } catch {
        /* Receipt is already confirmed. */
      }
      if (alive.current) router.push(`/matches/${response.view.matchId}`);
    } catch (error) {
      if (!alive.current) return;
      if (
        error instanceof ApiError &&
        error.body.error.code === "ACTIVE_MATCH_EXISTS"
      )
        setConflict(error.body.error.details.matchId);
      else if (
        error instanceof ApiError &&
        ["VERSION_UNSUPPORTED", "STALE_DECK_REVISION", "INVALID_DECK"].includes(
          error.body.error.code,
        )
      ) {
        setReview(true);
        pending.current = null;
        try {
          storage.removeItem(key);
        } catch {
          /* Ignore unavailable storage. */
        }
      } else
        setMessage(
          `Match creation is unconfirmed. Retry Rematch to send the same request.${durable ? "" : " The request could not be saved; keep this page open and do not reload."}`,
        );
    } finally {
      sending.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="match-dialog result-dialog panel"
      aria-labelledby="result-heading"
      onCancel={(event) => event.preventDefault()}
    >
      <h2 id="result-heading" ref={heading} tabIndex={-1}>
        {copy.heading}
      </h2>
      <p>{copy.body}</p>
      <RewardSummary summary={summary} api={api} />
      <div className="result-hero-art">
        <ArtImage
          artKey={
            catalog.heroes.find((hero) => hero.id === summary.humanHeroId)!
              .portraitKey
          }
          name={contentName(
            catalog.heroes.find((hero) => hero.id === summary.humanHeroId)!.id,
          )}
          variant="bust"
        />
      </div>
      <SessionRecovery />
      <p>
        {contentName(
          catalog.heroes.find((hero) => hero.id === summary.humanHeroId)?.id ??
            "",
        )}
      </p>
      <dl className="result-stats">
        <div>
          <dt>Turn</dt>
          <dd>{summary.turns}</dd>
        </div>
        <div>
          <dt>Active time</dt>
          <dd>{Math.round(summary.activeDurationMs / 1000)} seconds</dd>
        </div>
        <div>
          <dt>Damage to enemy hero</dt>
          <dd title="Total damage can exceed 20 if the hero was healed.">
            {summary.damageDealt}
          </dd>
        </div>
        <div>
          <dt>Blocks</dt>
          <dd>{summary.blocksUsed}</dd>
        </div>
      </dl>
      {summary.lifecycle === "FAULTED" && <p>Match ID: {summary.matchId}</p>}
      {review ? (
        <section className="deck-review" aria-label="Review deck">
          <h3>Review deck</h3>
          <p>
            Content or the deck has changed. Review the current deck before
            starting another match.
          </p>
          <p>
            Deck source:{" "}
            {summary.rematch?.deck.kind === "PRESET"
              ? summary.rematch.deck.presetId
              : summary.rematch?.deck.kind === "SAVED"
                ? `${summary.rematch.deck.deckId}· revision${summary.rematch.deck.deckRevision}`
                : "None"}
          </p>
          <p>
            Original content: {summary.rematch?.expectedContentVersion} ·
            Current: {catalog.version}
          </p>
          <Link href={`/decks/review/${summary.matchId}`}>
            Open original deck for review
          </Link>
          <Link href="/heroes">Choose another deck</Link>
        </section>
      ) : (
        summary.rematch &&
        summary.lifecycle !== "FAULTED" && (
          <button
            className="primary"
            disabled={busy}
            onClick={() => void rematch()}
          >
            {busy ? "Creating match…" : "Rematch"}
          </button>
        )
      )}
      {summary.mode === "TUTORIAL" ? (
        <>
          <Link href="/heroes">Play vs bot</Link>
          <TutorialEntry api={api} side="EVIL" label="Learn Ashen Court" />
          <TutorialEntry api={api} side="GOOD" label="Replay tutorial" />
        </>
      ) : (
        <Link href="/heroes">Change deck</Link>
      )}
      {conflict && <Link href={`/matches/${conflict}`}>Resume match</Link>}
      <Link href="/">Back home</Link>
      <p role="status">{message}</p>
    </dialog>
  );
}
export function ResultDetail({
  matchId,
  api,
  catalog,
}: {
  matchId: string;
  api: ApiClient;
  catalog: PublicCatalog;
}) {
  const [summary, setSummary] = useState<MatchSummary | null>(null),
    [failed, setFailed] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void api.summary(matchId).then(
      (value) => {
        if (active) setSummary(value);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [api, matchId, attempt]);
  if (summary?.matchId === matchId && summary.resumable)
    return (
      <section className="status-panel panel">
        <h1>Match in progress</h1>
        <Link href={`/matches/${matchId}`}>Resume match</Link>
      </section>
    );
  if (summary?.matchId === matchId)
    return (
      <ResultDialog
        key={matchId}
        summary={summary}
        api={api}
        catalog={catalog}
      />
    );
  return (
    <section className="status-panel panel">
      <h1>Match result</h1>
      {failed ? (
        <>
          <p>The match result could not be loaded.</p>
          <button
            onClick={() => {
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          >
            Retry result
          </button>
        </>
      ) : (
        <p role="status">Loading result…</p>
      )}
    </section>
  );
}
