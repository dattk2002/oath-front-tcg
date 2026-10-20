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
  SIMULTANEOUS_LETHAL: "Hòa",
  TURN_LIMIT: "Hòa",
  SURRENDER: "Đã đầu hàng",
  EXPIRED: "Trận đã đóng",
  ACCOUNT_MERGE: "Trận đã đóng",
  ENGINE_FAULT: "Trận bị gián đoạn",
  TUTORIAL_COMPLETED: "Đã hoàn thành hướng dẫn",
  TUTORIAL_SKIPPED: "Đã bỏ qua hướng dẫn",
};
export function resultCopy(summary: MatchSummary) {
  const outcome = summary.outcome;
  const heading = outcome
    ? (outcome.reason === "SURRENDER" && outcome.result === "WIN"
        ? "Chiến thắng"
        : titles[outcome.reason]) ||
      (outcome.result === "WIN"
        ? "Chiến thắng"
        : outcome.result === "LOSS"
          ? "Thất bại"
          : "Hòa")
    : "Trận đã kết thúc";
  const reason = outcome?.reason;
  const body =
    reason === "HERO_DEFEATED"
      ? outcome?.result === "WIN"
        ? "Hero đối phương đã bị hạ."
        : "Hero của bạn đã bị hạ."
      : reason === "SIMULTANEOUS_LETHAL"
        ? "Hai hero cùng bị hạ trong một chuỗi hiệu ứng."
        : reason === "TURN_LIMIT"
          ? "Đã kết thúc lượt 20."
          : reason === "ENGINE_FAULT"
            ? "Không tính thắng hoặc thua."
            : reason === "EXPIRED"
              ? "Trận đã hết hạn; không tính thua."
              : reason === "ACCOUNT_MERGE"
                ? "Trận đã đóng khi hợp nhất phiên chơi; không tính thua."
                : reason === "TUTORIAL_SKIPPED"
                  ? "Bạn có thể học lại trong phần Cài đặt."
                  : "Trận đấu đã kết thúc.";
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
  useEffect(() => {
    alive.current = true;
    const close = openDialog(dialog.current!, heading.current);
    try {
      const data: unknown = JSON.parse(sessionStorage.getItem(key) ?? "null");
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
    if (summary.rematch.expectedContentVersion !== catalog.version) {
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
    try {
      sessionStorage.setItem(key, JSON.stringify(request));
    } catch {
      setMessage(
        "Không lưu được yêu cầu. Giữ trang này để thử lại cùng yêu cầu.",
      );
    }
    try {
      const response = await api.createMatch(request);
      try {
        sessionStorage.removeItem(key);
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
          sessionStorage.removeItem(key);
        } catch {
          /* Ignore unavailable storage. */
        }
      } else
        setMessage(
          "Chưa xác định kết quả tạo trận. Thử lại Chơi lại sẽ gửi cùng yêu cầu.",
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
      <p>
        {catalog.heroes.find((hero) => hero.id === summary.humanHeroId)?.nameVi}
      </p>
      <dl className="result-stats">
        <div>
          <dt>Lượt</dt>
          <dd>{summary.turns}</dd>
        </div>
        <div>
          <dt>Thời gian hoạt động</dt>
          <dd>{Math.round(summary.activeDurationMs / 1000)} giây</dd>
        </div>
        <div>
          <dt>Sát thương lên hero địch</dt>
          <dd title="Tổng sát thương có thể lớn hơn 20 nếu hero được hồi máu.">
            {summary.damageDealt}
          </dd>
        </div>
        <div>
          <dt>Đã chặn</dt>
          <dd>{summary.blocksUsed}</dd>
        </div>
      </dl>
      {summary.lifecycle === "FAULTED" && <p>Mã trận: {summary.matchId}</p>}
      {review ? (
        <section className="deck-review" aria-label="Xem lại bộ bài">
          <h3>Xem lại bộ bài</h3>
          <p>
            Nội dung hoặc bộ bài đã thay đổi. Hãy kiểm tra bộ bài hiện hành
            trước khi bắt đầu trận mới.
          </p>
          <p>
            Nguồn bộ bài:{" "}
            {summary.rematch?.deck.kind === "PRESET"
              ? summary.rematch.deck.presetId
              : summary.rematch?.deck.kind === "SAVED"
                ? `${summary.rematch.deck.deckId} · phiên bản ${summary.rematch.deck.deckRevision}`
                : "Không có"}
          </p>
          <p>
            Nội dung gốc: {summary.rematch?.expectedContentVersion} · Hiện hành:{" "}
            {catalog.version}
          </p>
          <Link href="/heroes">Chọn bộ bài khác</Link>
        </section>
      ) : (
        summary.rematch &&
        summary.lifecycle !== "FAULTED" && (
          <button
            className="primary"
            disabled={busy}
            onClick={() => void rematch()}
          >
            {busy ? "Đang tạo trận…" : "Chơi lại"}
          </button>
        )
      )}
      {summary.mode === "TUTORIAL" ? (
        <Link href="/heroes">Chơi với bot</Link>
      ) : (
        <Link href="/heroes">Đổi bộ bài</Link>
      )}
      {conflict && (
        <Link href={`/matches/${conflict}`}>Tiếp tục trận đang chơi</Link>
      )}
      <Link href="/">Về trang chủ</Link>
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
        <h1>Trận đang diễn ra</h1>
        <Link href={`/matches/${matchId}`}>Tiếp tục trận</Link>
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
      <h1>Kết quả trận</h1>
      {failed ? (
        <>
          <p>Không tải được kết quả trận.</p>
          <button
            onClick={() => {
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          >
            Thử lại kết quả
          </button>
        </>
      ) : (
        <p role="status">Đang tải kết quả…</p>
      )}
    </section>
  );
}
