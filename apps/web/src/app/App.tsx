"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { PublicCatalog, SessionResponse } from "@oathfront/contracts";
import { createApiClient } from "../features/match/api-client";
import { ApiError } from "../features/match/api-error";
import DeckScreen from "../features/deck/DeckScreen";
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
const MatchScreen = dynamic(() => import("../features/match/MatchScreen"), {
  ssr: false,
  loading: () => (
    <p role="status" className="loading">
      Đang chuẩn bị bàn chơi…
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
          "Đã lưu tài khoản; bản nháp chỉ được giữ trên trang này vì bộ nhớ thiết bị bị lỗi. Không tải lại trang.",
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
        "Phiên được giữ trên trang này vì bộ nhớ thiết bị không truy cập được. Không tải lại trang.",
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
              setError("Không tải được bộ bài mẫu. Hãy thử lại.");
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
          setError("Không kết nối được phiên chơi. Hãy thử lại.");
        else {
          const remembered = readRememberedSession(sessionStorage);
          if (remembered) {
            setSession(remembered);
            api.bindSession(remembered);
            setExpired(true);
          }
        }
        if (currentCatalog) setCatalog(currentCatalog);
        else setError("Không tải được dữ liệu bài. Hãy thử lại.");
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
        "Không thể bắt đầu phiên chơi. Thử lại sẽ khôi phục cùng yêu cầu.",
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
      setError("Không thể mở phiên hướng dẫn. Hãy thử lại.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <header
        className={screen === "match" ? "site-header in-match" : "site-header"}
      >
        <Brand />
        <nav aria-label="Điều hướng chính">
          <button onClick={() => setSettingsOpen(true)}>Cài đặt</button>
          <Link href={routes.home}>Trang chủ</Link>
          {session?.activeMatchId && (
            <Link href={routes.match(session.activeMatchId)}>
              Tiếp tục trận
            </Link>
          )}
          {session && <Link href="/history">Lịch sử</Link>}
          <span className="session-label">
            {session?.principal.kind === "ACCOUNT"
              ? "Tài khoản"
              : session
                ? "Phiên khách"
                : "Chơi không cần tài khoản"}
          </span>
        </nav>
      </header>
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
              label="Mở hướng dẫn"
              autoStart
              onDismiss={() => setTutorialSide(null)}
            />
          )}
          {storageWarning && (
            <p className="notice" role="alert">
              {storageWarning}
            </p>
          )}
          <main id="main" key={ownerEpoch}>
            {error ? (
              <section className="status-panel panel" role="alert">
                <h1>Chưa thể kết nối</h1>
                <p>{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    setAttempt((value) => value + 1);
                  }}
                >
                  Thử lại
                </button>
              </section>
            ) : loading ? (
              <section className="status-panel panel" aria-busy="true">
                <h1>OathFront · Ngũ Lộ</h1>
                <p role="status">Đang tải dữ liệu trò chơi…</p>
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
              <section className="home panel">
                <div className="home-copy">
                  <p className="eyebrow">Trận chiến của năm con đường</p>
                  <h1>Mỗi lộ là một lời thề.</h1>
                  <p>
                    Dẫn dắt phe Thiện hoặc phe Ác. Dựng đội hình, giữ năng lượng
                    và chọn thời điểm thay đổi cục diện.
                  </p>
                  <button
                    className="primary"
                    disabled={busy || !catalog}
                    onClick={() => void start()}
                  >
                    {busy
                      ? "Đang kết nối…"
                      : session?.activeMatchId
                        ? "Tiếp tục trận"
                        : "Chơi với bot"}
                  </button>
                  <button
                    disabled={busy || !catalog}
                    onClick={() => void startTutorial("GOOD")}
                  >
                    Học cách chơi
                  </button>
                  <p className="muted">
                    Sáu hero · Sáu bộ bài mẫu · Bot Dễ và Thường
                  </p>
                </div>
                <div className="home-board" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((lane) => (
                    <div key={lane}>
                      <span>{lane}</span>
                      <i className="silhouette" />
                    </div>
                  ))}
                </div>
                <p className="art-note">
                  Minh họa tạm thời · Giao diện nền tảng
                </p>
              </section>
            )}
          </main>
        </PrivateStorageContext.Provider>
      </SessionRecoveryContext.Provider>
      <footer className="site-footer">
        OathFront · Ngũ Lộ
        <span>Luật và chỉ số luôn hiển thị bằng văn bản.</span>
      </footer>
    </>
  );
}
