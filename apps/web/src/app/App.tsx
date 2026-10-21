"use client";
import { useEffect, useMemo, useState } from "react";
import ArtImage from "../features/match/ArtImage";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { PublicCatalog, SessionResponse } from "@oathfront/contracts";
import { createApiClient } from "../features/match/api-client";
import { ApiError } from "../features/match/api-error";
import { ResultDetail } from "../features/match/ResultDialog";
import AuthPanel from "../features/auth/AuthPanel";
import HistoryScreen from "../features/history/HistoryScreen";
import {
  SessionRecoveryContext,
  PrivateStorageContext,
  privateStorage,
  moveClaimDrafts,
} from "../features/auth/private-storage";
import { readRememberedSession, rememberSession } from "./session";
import { startGuestSession } from "./session";
import { Brand, routes } from "./router";
import SettingsDialog, {
  SettingsProvider,
} from "../features/settings/SettingsDialog";
import { TutorialEntry } from "../features/tutorial/tutorial-controller";
const DeckScreen = dynamic(() => import("../features/deck/DeckScreen"), {
  loading: () => <p role="status">Loading decks…</p>,
});
const MatchScreen = dynamic(() => import("../features/match/MatchScreen"), {
  ssr: false,
  loading: () => (
    <p role="status" className="loading">
      Preparing the battlefield…
    </p>
  ),
});
export default function App(props: Parameters<typeof AppContent>[0]) {
  return (
    <SettingsProvider match={props.screen === "match"}>
      <AppContent {...props} />
    </SettingsProvider>
  );
}
function AppContent({
  screen = "home",
  matchId,
  heroId,
  deckId,
  presetId,
  reviewMatchId,
}: {
  screen?:
    | "history"
    | "home"
    | "setup"
    | "match"
    | "result"
    | "decks"
    | "builder"
    | "review";
  heroId?: string;
  deckId?: string;
  presetId?: string;
  reviewMatchId?: string;
  matchId?: string;
}) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tutorialSide, setTutorialSide] = useState<"GOOD" | "EVIL" | null>(
    null,
  );
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [catalog, setCatalog] = useState<PublicCatalog | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [storageWarning, setStorageWarning] = useState("");
  const [storageOwner, setStorageOwner] = useState<string | null>(null);
  const [expired, setExpired] = useState(false),
    [ownerEpoch, setOwnerEpoch] = useState(0);
  const [api] = useState(() =>
    createApiClient({ onUnauthorized: () => setExpired(true) }),
  );
  const storage = useMemo(
    () =>
      typeof window !== "undefined" && session
        ? privateStorage(sessionStorage, storageOwner ?? session.principal.id)
        : null,
    [session?.principal.id, storageOwner],
  );
  function adoptSession(next: SessionResponse, sourceId?: string) {
    let nextStorageOwner = next.principal.id;
    if (sourceId && sourceId !== next.principal.id) {
      try {
        moveClaimDrafts(sessionStorage, sourceId, next.principal.id);
      } catch {
        nextStorageOwner = sourceId;
        setStorageWarning(
          "Account saved; drafts are kept only on this page because device storage failed. Do not reload this page.",
        );
      }
    }
    if (session && session.principal.id !== next.principal.id && !sourceId)
      setOwnerEpoch((v) => v + 1);
    setStorageOwner(nextStorageOwner);
    api.bindSession(next);
    try {
      rememberSession(sessionStorage, next);
    } catch {
      setStorageWarning(
        "Your session is kept only on this page because device storage is unavailable. Do not reload this page.",
      );
    }
    setSession(next);
    setExpired(false);
  }
  useEffect(() => {
    let active = true;
    const client = createApiClient();
    void Promise.allSettled([client.session(), client.catalog()]).then(
      async ([auth, content]) => {
        let currentCatalog =
          content.status === "fulfilled" ? content.value : null;
        if (
          auth.status === "fulfilled" &&
          currentCatalog &&
          (screen === "setup" || screen === "decks")
        ) {
          try {
            const decks = await client.decks();
            currentCatalog = { ...currentCatalog, presets: decks.presets };
          } catch {
            if (active) {
              setError("Preset decks could not be loaded. Try again.");
              setLoading(false);
            }
            return;
          }
        }
        if (!active) return;
        if (auth.status === "fulfilled") adoptSession(auth.value);
        else if (
          !(auth.reason instanceof ApiError) ||
          auth.reason.body.error.code !== "SESSION_EXPIRED"
        )
          setError("Your session could not connect. Try again.");
        else {
          const remembered = readRememberedSession(sessionStorage);
          if (remembered) {
            setSession(remembered);
            api.bindSession(remembered);
            setExpired(true);
          }
        }
        if (currentCatalog) setCatalog(currentCatalog);
        else setError("Card data could not be loaded. Try again.");
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [attempt, screen]);
  async function start() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const current = session ?? (await startGuestSession(api, sessionStorage));
      adoptSession(current);
      router.push(
        current.activeMatchId
          ? routes.match(current.activeMatchId)
          : routes.heroes,
      );
    } catch {
      setError(
        "Your session could not start. Retrying restores the same request.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function startTutorial(side: "GOOD" | "EVIL") {
    if (busy) return;
    setBusy(true);
    try {
      const current = session ?? (await startGuestSession(api, sessionStorage));
      adoptSession(current);
      setTutorialSide(side);
    } catch {
      setError("The tutorial session could not open. Try again.");
    } finally {
      setBusy(false);
    }
  }
  const authPanel = (
    <AuthPanel
      api={api}
      session={session}
      catalog={catalog}
      expired={expired}
      ready={!loading}
      onSession={adoptSession}
      onLogout={() => {
        api.bindSession(null);
        setSession(null);
        setExpired(false);
        setOwnerEpoch((v) => v + 1);
        router.push("/");
      }}
    />
  );
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header
        className={screen === "match" ? "site-header in-match" : "site-header"}
      >
        <Brand />
        <nav aria-label="Main navigation">
          <button onClick={() => setSettingsOpen(true)}>Settings</button>
          <Link
            href={routes.home}
            aria-current={screen === "home" ? "page" : undefined}
          >
            Home
          </Link>
          {session?.activeMatchId && (
            <Link href={routes.match(session.activeMatchId)}>Resume match</Link>
          )}
          {session && (
            <Link
              href="/history"
              aria-current={screen === "history" ? "page" : undefined}
            >
              History
            </Link>
          )}
          <span className="session-label">
            {session?.principal.kind === "ACCOUNT"
              ? "Account"
              : session
                ? "Guest session"
                : "Play without an account"}
          </span>
        </nav>
      </header>
      {screen !== "match" && authPanel}
      <SessionRecoveryContext.Provider value={expired}>
        <PrivateStorageContext.Provider value={storage}>
          {settingsOpen && (
            <SettingsDialog
              onClose={() => setSettingsOpen(false)}
              onTutorial={(side) => void startTutorial(side)}
            />
          )}
          {tutorialSide && session && (
            <TutorialEntry
              key={tutorialSide}
              api={api}
              side={tutorialSide}
              label="Open tutorial"
              autoStart
              onDismiss={() => setTutorialSide(null)}
            />
          )}
          {storageWarning && (
            <p className="notice" role="alert">
              {storageWarning}
            </p>
          )}
          <main id="main" data-screen={screen} key={ownerEpoch}>
            {error ? (
              <section className="status-panel panel" role="alert">
                <h1>Unable to connect</h1>
                <p>{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    setAttempt((value) => value + 1);
                  }}
                >
                  Retry
                </button>
              </section>
            ) : loading ? (
              <section
                key="app-loading"
                className="status-panel panel"
                aria-busy="true"
              >
                <h1>OathFront · The Fivefold</h1>
                <p role="status">Loading game data…</p>
              </section>
            ) : screen === "history" && catalog && session ? (
              <HistoryScreen
                key={session.csrfToken}
                api={api}
                catalog={catalog}
              />
            ) : screen === "match" && matchId && catalog && session ? (
              <MatchScreen
                key={matchId}
                api={api}
                catalog={catalog}
                matchId={matchId}
              />
            ) : screen === "result" && matchId && catalog && session ? (
              <ResultDetail
                key={matchId}
                api={api}
                catalog={catalog}
                matchId={matchId}
              />
            ) : ["setup", "decks", "builder", "review"].includes(screen) &&
              catalog &&
              session ? (
              <DeckScreen
                screen={screen as "setup" | "decks" | "builder" | "review"}
                catalog={catalog}
                api={api}
                {...(heroId ? { heroId } : {})}
                {...(deckId ? { deckId } : {})}
                {...(presetId ? { presetId } : {})}
                {...(reviewMatchId ? { reviewMatchId } : {})}
              />
            ) : (
              <section className="home panel" data-home-stage>
                <div className="home-copy">
                  <p className="eyebrow">
                    A tactical card game in the Fivefold
                  </p>
                  <h1 data-home-headline>
                    FIVE LANES.
                    <br />
                    ONE OATH.
                  </h1>
                  <p>
                    Lead Dawnward or the Ashen Court. Deploy your units,
                    conserve energy and choose the moment to turn the battle.
                  </p>
                  <button
                    className="primary"
                    aria-label={
                      session?.activeMatchId
                        ? "Continue match"
                        : "Play now · Play vs bot"
                    }
                    disabled={busy || !catalog}
                    onClick={() => void start()}
                  >
                    {busy
                      ? "Connecting…"
                      : session?.activeMatchId
                        ? "Continue match"
                        : "Play now"}
                  </button>
                  <button
                    disabled={busy || !catalog}
                    onClick={() => void startTutorial("GOOD")}
                  >
                    Learn to play
                  </button>
                  <p className="muted">
                    Six heroes · Six preset decks · Easy and Normal bots
                  </p>
                </div>
                <div
                  className="home-art-stage"
                  aria-hidden="true"
                  data-home-art
                >
                  <span className="home-faction-word">THE FIVEFOLD</span>
                  <div className="home-hero home-hero-evil">
                    <ArtImage
                      artKey="heroes/h_e_fx/portrait.webp"
                      name="Cinder"
                      variant="bust"
                      eager
                      retry={false}
                    />
                  </div>
                  <div className="home-hero home-hero-good">
                    <ArtImage
                      artKey="heroes/h_g_bv/portrait.webp"
                      name="Briar"
                      variant="bust"
                      eager
                      retry={false}
                    />
                  </div>
                  <div className="home-factions">
                    <span>Dawnward</span>
                    <span>Ashen Court</span>
                  </div>
                </div>
              </section>
            )}
          </main>
        </PrivateStorageContext.Provider>
      </SessionRecoveryContext.Provider>
      {screen === "match" && authPanel}
      <footer className="site-footer">
        OathFront · The Fivefold
        <span>Rules and stats are always available as text.</span>
      </footer>
    </>
  );
}
