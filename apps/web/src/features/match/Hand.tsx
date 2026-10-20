import { useRef } from "react";
import type { PlayerView, PublicCatalog } from "@oathfront/contracts";
import { validateBrowserWire } from "@oathfront/contracts/browser";
import type { IntentController } from "./intent-controller";
import { groupArrows } from "./Board";
export default function Hand({
  view,
  catalog,
  controller,
  selectedId,
  disabled,
  mulligan,
  onMulligan,
}: {
  view: PlayerView;
  catalog: PublicCatalog;
  controller: IntentController;
  selectedId: string | null;
  disabled: boolean;
  mulligan: readonly string[] | null;
  onMulligan: (id: string) => void;
}) {
  const drag = useRef<{
    id: string;
    x: number;
    y: number;
    active: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  return (
    <section
      className="hand-region"
      aria-label={mulligan ? "Bài đầu trận" : "Tay bài"}
    >
      <div className="region-heading">
        <h2>{mulligan ? "Chọn lá muốn đổi" : "Tay bài"}</h2>
        <span>{view.self.hand.length} / 10 lá</span>
      </div>
      <div className="hand" onKeyDown={groupArrows}>
        {view.self.hand.map((card) => {
          const def = catalog.cards.find(
            (item) => item.id === card.definitionId,
          )!;
          const playable = view.legalActions.some(
            (action) =>
              action.kind === "PLAY_UNIT" &&
              action.cardInstanceId === card.instanceId,
          );
          const selected = mulligan
            ? mulligan.includes(card.instanceId)
            : card.instanceId === selectedId;
          return (
            <button
              key={card.instanceId}
              className={`hand-card ${def.faction.toLowerCase()}`}
              data-card-id={card.instanceId}
              data-playable-unit={playable && !disabled && !mulligan}
              aria-pressed={selected}
              aria-label={`${def.nameVi}, ${def.cost} năng lượng, ${def.type === "UNIT" ? "Nhân vật" : "Phép"}${mulligan ? (selected ? ", sẽ đổi" : ", giữ lại") : playable ? ", có thể chơi" : ", xem chi tiết"}`}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                if (mulligan) onMulligan(card.instanceId);
                else controller.selectCard(card.instanceId);
              }}
              onPointerDown={(event) => {
                if (disabled || mulligan) return;
                drag.current = {
                  id: card.instanceId,
                  x: event.clientX,
                  y: event.clientY,
                  active: false,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                const current = drag.current;
                if (!current || current.id !== card.instanceId) return;
                if (
                  !current.active &&
                  Math.hypot(
                    event.clientX - current.x,
                    event.clientY - current.y,
                  ) >= 6
                ) {
                  current.active = true;
                  controller.selectCard(current.id);
                }
              }}
              onPointerUp={(event) => {
                const current = drag.current;
                drag.current = null;
                if (!current?.active) return;
                suppressClick.current = true;
                const element = document
                  .elementFromPoint(event.clientX, event.clientY)
                  ?.closest<HTMLElement>(
                    '[data-target][data-legal-target="true"]',
                  );
                if (element?.dataset.target) {
                  const target: unknown = JSON.parse(element.dataset.target);
                  if (validateBrowserWire("Target", target)) {
                    void controller.selectTarget(target);
                    return;
                  }
                }
                controller.cancelSelection();
              }}
              onPointerCancel={() => {
                drag.current = null;
                controller.cancelSelection();
              }}
            >
              <span className="card-cost">
                {def.cost}
                <span className="sr-only"> năng lượng</span>
              </span>
              <strong>{def.nameVi}</strong>
              <span className="card-kind">
                {def.type === "UNIT" ? "Nhân vật" : "Phép"}
              </span>
              <span className="card-summary">
                {def.printed
                  ? `${def.printed.attack} công / ${def.printed.hp} HP`
                  : "Chọn để đọc hiệu ứng"}
              </span>
              {mulligan && <span>{selected ? "Sẽ đổi" : "Giữ lại"}</span>}
            </button>
          );
        })}
      </div>
      {!view.self.hand.length && (
        <p className="muted">
          Tay bài trống. Bạn vẫn có thể xem bàn và kết thúc hành động.
        </p>
      )}
    </section>
  );
}
