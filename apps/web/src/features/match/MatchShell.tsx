import type { PublicCatalog } from "@oathfront/contracts";
import { useState } from "react";
import SettingsDialog from "../settings/SettingsDialog";
import type { ReactNode } from "react";
import type { MatchSnapshot } from "./view-store";
import type { IntentController } from "./intent-controller";
import { phaseLabel, sideLabel } from "./labels";
import RecoveryControls from "./RecoveryControls";
export default function MatchShell({
  snapshot,
  catalog,
  controller,
  disabled,
  online,
  onCancel,
  recovering,
  onRecover,
  children,
}: {
  snapshot: MatchSnapshot;
  catalog: PublicCatalog;
  controller: IntentController;
  disabled: boolean;
  online: boolean;
  onCancel: () => void;
  recovering: boolean;
  onRecover: () => void;
  children: ReactNode;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const view = snapshot.authoritativeView;
  const enemy = view.self.side === "GOOD" ? "EVIL" : "GOOD";
  return (
    <section
      className="match-screen"
      aria-label="Trận đấu"
      onKeyDown={(event) => {
        if (event.target instanceof Element && event.target.closest("dialog"))
          return;
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
        <button onClick={() => setSettingsOpen(true)}>Cài đặt</button>
        {
          <button
            data-pause-control
            disabled={
              disabled ||
              view.lifecycle !== "ACTIVE" ||
              !view.legalActions.some((action) => action.kind === "PAUSE")
            }
            onClick={() =>
              void controller.submitIntent({
                kind: "PAUSE",
              })
            }
          >
            Tạm dừng
          </button>
        }
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
        <details>
          <summary>Tay bài và siêu năng lực · đọc đầy đủ</summary>
          <ul>
            {[...view.self.hand, ...view.self.reserve].map((card) => {
              const def = [...catalog.cards, ...catalog.powers].find(
                (d) => d.id === card.definitionId,
              );
              return (
                <li key={card.instanceId}>
                  <strong>{def?.nameVi}</strong>
                  <p>{def?.exactTextVi}</p>
                </li>
              );
            })}
          </ul>
        </details>
        <p className="muted">
          Bạn có thể quay về trang chủ. Trận không tự đầu hàng khi đổi kích
          thước màn hình.
        </p>
      </section>
      {settingsOpen && (
        <SettingsDialog onClose={() => setSettingsOpen(false)} />
      )}
      {children}
      {view.lifecycle !== "PAUSED" && (
        <RecoveryControls
          snapshot={snapshot}
          controller={controller}
          online={online}
          recovering={recovering}
          onRecover={onRecover}
        />
      )}
    </section>
  );
}
