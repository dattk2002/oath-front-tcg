import { useEffect, useState } from "react";
import Link from "next/link";
import type { MatchList, PublicCatalog } from "@oathfront/contracts";
import type { ApiClient } from "../match/api-client";
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
          <p className="eyebrow">Những trận đã chơi</p>
          <h1>Lịch sử trận đấu</h1>
        </div>
        <Link href="/heroes">Chơi trận mới</Link>
      </div>
      {error && (
        <p role="alert">
          Chưa tải được lịch sử.{" "}
          <button
            onClick={() => (page ? void more() : setAttempt((v) => v + 1))}
          >
            Thử lại
          </button>
        </p>
      )}
      {!page && !error && <p role="status">Đang tải lịch sử…</p>}
      {page?.items.length === 0 && (
        <div className="panel">
          <p>Chưa có trận đấu.</p>
          <Link href="/heroes">Chọn hero để bắt đầu</Link>
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
                  {catalog.heroes.find((h) => h.id === m.humanHeroId)?.nameVi}
                </strong>{" "}
                gặp{" "}
                {catalog.heroes.find((h) => h.id === m.opponentHeroId)?.nameVi}
                <small>
                  {new Date(m.createdAt).toLocaleString("vi-VN")} ·{" "}
                  {m.difficulty === "NORMAL" ? "Thường" : "Dễ"} · {m.turns} lượt
                </small>
              </span>
              <strong>
                {m.resumable
                  ? "Tiếp tục trận"
                  : m.lifecycle === "ABANDONED"
                    ? "Đã đóng · không tính thua"
                    : m.lifecycle === "FAULTED"
                      ? "Trận lỗi"
                      : m.outcome?.result === "WIN"
                        ? "Thắng"
                        : m.outcome?.result === "LOSS"
                          ? "Thua"
                          : "Hòa"}
              </strong>
            </Link>
          </li>
        ))}
      </ol>
      {page?.nextCursor && (
        <button disabled={busy} onClick={() => void more()}>
          {busy ? "Đang tải…" : "Tải thêm 20 trận"}
        </button>
      )}
    </section>
  );
}
