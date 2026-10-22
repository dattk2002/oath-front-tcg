import { contentName } from "../../content/english-content";
import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  MatchList,
  MatchSummary,
  PublicCatalog,
} from "@oathfront/contracts";
import type { ApiClient } from "../match/api-client";
export function historyResultLabel(
  match: Pick<MatchSummary, "resumable" | "lifecycle" | "outcome">,
): string {
  if (match.resumable) return "Resume match";
  if (match.lifecycle === "ABANDONED") return "Closed · no loss recorded";
  if (match.lifecycle === "FAULTED") return "Match error";
  if (match.outcome?.result === "WIN") return "Win";
  if (match.outcome?.result === "LOSS") return "Loss";
  return "Draw";
}
export default function HistoryScreen({
  api,
  catalog,
}: {
  api: ApiClient;
  catalog: PublicCatalog;
}) {
  const [page, setPage] = useState<MatchList | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void api.history().then(
      (v) => {
        if (active) {
          setPage(v);
          setError(false);
        }
      },
      () => {
        if (active) setError(true);
      },
    );
    return () => {
      active = false;
    };
  }, [api, attempt]);
  async function more() {
    if (!page?.nextCursor || busy) return;
    setBusy(true);
    try {
      const next = await api.history(page.nextCursor);
      setPage({
        items: [...page.items, ...next.items],
        nextCursor: next.nextCursor,
      });
      setError(false);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="history-screen">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Your past matches</p>
          <h1>Match history</h1>
        </div>
        <Link href="/heroes">New match</Link>
      </div>
      {error && (
        <p role="alert">
          History could not be loaded.{" "}
          <button
            onClick={() => (page ? void more() : setAttempt((v) => v + 1))}
          >
            Retry
          </button>
        </p>
      )}
      {!page && !error && <p role="status">Loading history…</p>}
      {page?.items.length === 0 && (
        <div className="panel">
          <p>No matches yet.</p>
          <Link href="/heroes">Choose a hero to begin</Link>
        </div>
      )}
      <ol className="history-list">
        {page?.items.map((m) => (
          <li key={m.matchId}>
            <Link
              className="history-row panel"
              href={
                m.resumable ? `/matches/${m.matchId}` : `/history/${m.matchId}`
              }
            >
              <span>
                <strong>
                  {contentName(
                    catalog.heroes.find((h) => h.id === m.humanHeroId)?.id ??
                      "",
                  )}
                </strong>{" "}
                versus{" "}
                {contentName(
                  catalog.heroes.find((h) => h.id === m.opponentHeroId)?.id ??
                    "",
                )}
                <small>
                  {new Date(m.createdAt).toLocaleString("en-US")} ·{" "}
                  {m.mode === "DAILY_CHALLENGE"
                    ? "Daily challenge"
                    : m.difficulty === "NORMAL"
                      ? "Normal"
                      : "Easy"}{" "}
                  · {m.turns} turns
                </small>
              </span>
              <strong>{historyResultLabel(m)}</strong>
            </Link>
          </li>
        ))}
      </ol>
      {page?.nextCursor && (
        <button disabled={busy} onClick={() => void more()}>
          {busy ? "Loading…" : "Load 20 more matches"}
        </button>
      )}
    </section>
  );
}
