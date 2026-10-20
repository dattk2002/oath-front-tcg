import { useEffect, useRef } from "react";
import type { MatchSummary, PublicCatalog } from "@oathfront/contracts";
import { openDialog } from "../match/keyboard";
export default function MergeConflictDialog({
  guestMatch,
  accountMatch,
  catalog,
  busy,
  onChoose,
  onClose,
}: {
  guestMatch: MatchSummary;
  accountMatch: MatchSummary;
  catalog: PublicCatalog;
  busy: boolean;
  onChoose: (id: string) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(
    () =>
      openDialog(dialog.current!, heading.current, () =>
        document.querySelector<HTMLButtonElement>(".auth-panel button"),
      ),
    [],
  );
  return (
    <dialog
      ref={dialog}
      className="match-dialog panel"
      aria-labelledby="merge-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h2 id="merge-title" ref={heading} tabIndex={-1}>
        Chọn trận muốn tiếp tục
      </h2>
      <p>
        Cả phiên khách và tài khoản đều có trận đang chơi. Trận còn lại sẽ đóng,
        không tính là thua. Bộ bài và lịch sử của cả hai được giữ.
      </p>
      <div className="merge-choices">
        {[
          { match: guestMatch, label: "Trận của khách" },
          { match: accountMatch, label: "Trận của tài khoản" },
        ].map(({ match: m, label }) => {
          return (
            <button
              key={m.matchId}
              disabled={busy}
              onClick={() => onChoose(m.matchId)}
            >
              <strong>{label}</strong>
              <span>
                {catalog.heroes.find((h) => h.id === m.humanHeroId)?.nameVi} ·
                Lượt {m.turns}
              </span>
              <span>
                Gặp{" "}
                {catalog.heroes.find((h) => h.id === m.opponentHeroId)?.nameVi}{" "}
                · {m.difficulty === "NORMAL" ? "Thường" : "Dễ"}
              </span>
              <span>{new Date(m.createdAt).toLocaleString("vi-VN")}</span>
              <span>
                {m.lifecycle === "PAUSED" ? "Đang tạm dừng" : "Đang diễn ra"}
              </span>
            </button>
          );
        })}
      </div>
      <button disabled={busy} onClick={onClose}>
        Quay lại phiên khách
      </button>
    </dialog>
  );
}
