"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useUiMotion } from "../features/motion/use-ui-motion";
import { CampaignHeader } from "../features/campaign/CampaignHeader";
import { CampaignHome } from "../features/campaign/CampaignHome";
import { CampaignPage } from "../features/campaign/CampaignPage";
import {
  gameEntryDestination,
  type CampaignView,
} from "../features/campaign/model";
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
  campaign,
}: {
  screen?:
    | "campaign"
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
  campaign?: CampaignView;
}) {
  const router = useRouter();
  const main = useRef<HTMLElement>(null);
  const publicPage = screen === "home" || screen === "campaign";
  const [accountOpen, setAccountOpen] = useState(false);
  const accountArea = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    if (accountOpen) {
      accountArea.current?.scrollIntoView({ block: "nearest" });
      accountArea.current?.querySelector<HTMLButtonElement>("button")?.focus();
    }
  }, [accountOpen]);
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
  async function start(selectedHeroId?: string) {
    if (busy || loading) return;
    if (!catalog) {
      setError("Game data is unavailable. Retry the connection to play.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const current = session ?? (await startGuestSession(api, sessionStorage));
      adoptSession(current);
      router.push(gameEntryDestination(current.activeMatchId, selectedHeroId));
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
  useUiMotion(
    main,
    "home",
    ownerEpoch,
    false, // The Pen campaign owns its scoped entrance choreography.
  );
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
      {publicPage ? (
        <CampaignHeader
          active={
            screen === "home"
              ? "home"
              : campaign?.kind === "hero"
                ? "heroes"
                : (campaign?.kind ?? "home")
          }
          onPlay={() => void start()}
          busy={busy || loading}
          accountLabel={
            session?.principal.kind === "ACCOUNT"
              ? session.principal.displayName
              : "Sign in"
          }
          onAccount={() => setAccountOpen((value) => !value)}
        />
      ) : (
        <header
          className={
            screen === "match" ? "site-header in-match" : "site-header"
          }
        >
          <Brand />
          <nav aria-label="Main navigation">
            <button onClick={() => setSettingsOpen(true)}>Settings</button>
            <Link href={routes.home}>Home</Link>
            {session?.activeMatchId && (
              <Link href={routes.match(session.activeMatchId)}>
                Resume match
              </Link>
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
      )}
      {screen !== "match" &&
        (publicPage ? (
          <div
            ref={accountArea}
            className="campaign-account-area"
            data-open={accountOpen}
          >
            {authPanel}
          </div>
        ) : (
          authPanel
        ))}
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
          {publicPage && error && (
            <div className="campaign-feedback" role="alert">
              <p>{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  setAttempt((value) => value + 1);
                }}
              >
                Retry connection
              </button>
            </div>
          )}
          <main
            ref={main}
            id="main"
            className={publicPage ? "campaign-page" : undefined}
            data-screen={screen}
            key={ownerEpoch}
          >
            {publicPage ? (
              campaign ? (
                <CampaignPage
                  view={campaign}
                  onPlay={() => void start()}
                  onChooseHero={(id) => void start(id)}
                  busy={busy || loading}
                  resume={!!session?.activeMatchId}
                />
              ) : (
                <CampaignHome
                  onPlay={() => void start()}
                  onLearn={() => void startTutorial("GOOD")}
                  busy={busy || loading}
                  resume={!!session?.activeMatchId}
                />
              )
            ) : error ? (
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
              <section className="status-panel panel">
                <h1>Ready to enter the Fivefold?</h1>
                <p>Start a guest session to choose your hero.</p>
                <button
                  className="primary"
                  onClick={() => void start()}
                  disabled={busy || loading}
                >
                  Play now · Play vs bot
                </button>
              </section>
            )}
          </main>
        </PrivateStorageContext.Provider>
      </SessionRecoveryContext.Provider>
      {screen === "match" && authPanel}
      {publicPage ? (
        <footer className="campaign-footer">
          <span>OathFront · The Fivefold</span>
          <nav aria-label="Player options">
            <button onClick={() => setSettingsOpen(true)}>Settings</button>
            {session && <Link href="/history">History</Link>}
            {session?.activeMatchId && (
              <Link href={routes.match(session.activeMatchId)}>
                Resume match
              </Link>
            )}
            <button onClick={() => setAccountOpen((value) => !value)}>
              {accountOpen ? "Close account controls" : "Account"}
            </button>
          </nav>
        </footer>
      ) : (
        <footer className="site-footer">
          OathFront · The Fivefold
          <span>Rules and stats are always available as text.</span>
        </footer>
      )}
    </>
  );
}
