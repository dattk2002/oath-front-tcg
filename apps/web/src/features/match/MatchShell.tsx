import type { ReactNode } from "react";
import type { MatchSnapshot } from "./view-store";
import type { IntentController } from "./intent-controller";
import { phaseLabel, sideLabel } from "./labels";
export default function MatchShell({
  snapshot,
  controller,
  disabled,
  online,
  onCancel,
  children,
}: {
  snapshot: MatchSnapshot;
  controller: IntentController;
  disabled: boolean;
  online: boolean;
  onCancel: () => void;
  children: ReactNode;
}) {
  const view = snapshot.authoritativeView;
  const enemy = view.self.side === "GOOD" ? "EVIL" : "GOOD";
  return (
    <section
      className="match-screen"
      aria-label="Trận đấu"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <h1 className="sr-only">Trận OathFront</h1>
      <div className="match-heading">
        <p data-testid="phase-label" aria-live="polite" aria-atomic="true">
          <strong>Lượt {view.turn}</strong>
          <span>
            · {phaseLabel[view.phase]}
            {view.activeSide ? ` · Phe ${sideLabel[view.activeSide]}` : ""}
          </span>
        </p>
        <button
          disabled={
            disabled ||
            !view.legalActions.some(
              (action) =>
                action.kind ===
                (view.lifecycle === "PAUSED" ? "RESUME" : "PAUSE"),
            )
          }
          onClick={() =>
            void controller.submitIntent({
              kind: view.lifecycle === "PAUSED" ? "RESUME" : "PAUSE",
            })
          }
        >
          {view.lifecycle === "PAUSED" ? "Tiếp tục" : "Tạm dừng"}
        </button>
      </div>
      <section className="small-fallback panel">
        <h1>Xoay ngang hoặc dùng màn hình lớn để vào trận</h1>
        <p>
          Trận đang được giữ. Bàn chơi cần ít nhất 1024 × 640 điểm ảnh để thao
          tác.
        </p>
        <details>
          <summary>Đọc bàn hiện tại</summary>
          <p>
            Hero bạn: {view.players[view.self.side].hp} HP · Hero bot:{" "}
            {view.players[enemy].hp} HP
          </p>
          <ol>
            {view.board.map((lane) => (
              <li key={lane.laneId}>
                Lộ {lane.laneId}: Thiện{" "}
                {lane.good
                  ? `${lane.good.current.attack} công / ${lane.good.current.hp} HP`
                  : "trống"}
                ; Ác{" "}
                {lane.evil
                  ? `${lane.evil.current.attack} công / ${lane.evil.current.hp} HP`
                  : "trống"}
              </li>
            ))}
          </ol>
        </details>
        <p className="muted">
          Bạn có thể quay về trang chủ. Trận không tự đầu hàng khi đổi kích
          thước màn hình.
        </p>
      </section>
      {children}
      <div
        className="command-status"
        data-testid="command-status"
        role="status"
        aria-live="polite"
      >
        {!online
          ? "Mất kết nối. Bàn chơi được giữ; kết nối lại để tiếp tục."
          : snapshot.pendingCommand?.status === "SENDING"
            ? "Đang xác nhận…"
            : (snapshot.message ??
              (snapshot.pendingCommand?.status === "UNCERTAIN"
                ? "Có yêu cầu chưa được xác nhận. Hãy thử lại cùng yêu cầu."
                : ""))}
        {snapshot.pendingCommand?.status === "UNCERTAIN" && (
          <button
            disabled={!online}
            onClick={() => void controller.retryPending()}
          >
            Thử lại yêu cầu
          </button>
        )}
      </div>
      {["COMPLETED", "ABANDONED", "FAULTED"].includes(view.lifecycle) && (
        <section className="notice" role="status">
          <h2>
            {view.lifecycle === "FAULTED"
              ? "Trận bị gián đoạn"
              : view.outcome?.result === "WIN"
                ? "Chiến thắng"
                : view.outcome?.result === "LOSS"
                  ? "Thất bại"
                  : "Trận đã kết thúc"}
          </h2>
          <p>
            {view.lifecycle === "FAULTED"
              ? "Không tính thắng hoặc thua."
              : "Kết quả đã được máy chủ ghi nhận."}
          </p>
        </section>
      )}
    </section>
  );
}
