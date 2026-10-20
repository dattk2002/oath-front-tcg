"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { PublicCatalog, SessionResponse } from "@oathfront/contracts";
import { createApiClient } from "../features/match/api-client";
import { ApiError } from "../features/match/api-error";
import PresetSetup from "../features/setup/PresetSetup";
import { ResultDetail } from "../features/match/ResultDialog";
import { startGuestSession } from "./session";
import { Brand, routes } from "./router";
const MatchScreen = dynamic(() => import("../features/match/MatchScreen"), {
  ssr: false,
  loading: () => (
    <p role="status" className="loading">
      Đang chuẩn bị bàn chơi…
    </p>
  ),
});
export default function App({
  screen = "home",
  matchId,
}: {
  screen?: "home" | "setup" | "match" | "result";
  matchId?: string;
}) {
  const router = useRouter();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [catalog, setCatalog] = useState<PublicCatalog | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const api = useMemo(
    () => createApiClient(session ? { csrfToken: session.csrfToken } : {}),
    [session],
  );
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
          screen === "setup"
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
        if (auth.status === "fulfilled") setSession(auth.value);
        else if (
          !(auth.reason instanceof ApiError) ||
          auth.reason.body.error.code !== "SESSION_EXPIRED"
        )
          setError("Không kết nối được phiên chơi. Hãy thử lại.");
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
      setSession(current);
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
          <Link href={routes.home}>Trang chủ</Link>
          {session?.activeMatchId && (
            <Link href={routes.match(session.activeMatchId)}>
              Tiếp tục trận
            </Link>
          )}
          <span className="session-label">
            {session ? "Phiên khách" : "Chơi không cần tài khoản"}
          </span>
        </nav>
      </header>
      <main id="main">
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
        ) : screen === "match" && matchId && catalog && session ? (
          <MatchScreen key={matchId} api={api} catalog={catalog} matchId={matchId} />
        ) : screen === "result" && matchId && catalog && session ? (
          <ResultDetail
            key={matchId}
            api={api}
            catalog={catalog}
            matchId={matchId}
          />
        ) : screen === "setup" && catalog && session ? (
          <PresetSetup
            catalog={catalog}
            api={api}
            onCreated={(response) =>
              router.push(routes.match(response.view.matchId))
            }
            onResume={(id) => router.push(routes.match(id))}
          />
        ) : (
          <section className="home panel">
            <div className="home-copy">
              <p className="eyebrow">Trận chiến của năm con đường</p>
              <h1>Mỗi lộ là một lời thề.</h1>
              <p>
                Dẫn dắt phe Thiện hoặc phe Ác. Dựng đội hình, giữ năng lượng và
                chọn thời điểm thay đổi cục diện.
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
            <p className="art-note">Minh họa tạm thời · Giao diện nền tảng</p>
          </section>
        )}
      </main>
      <footer className="site-footer">
        OathFront · Ngũ Lộ
        <span>Luật và chỉ số luôn hiển thị bằng văn bản.</span>
      </footer>
    </>
  );
}
