import { useEffect, useRef } from "react";
import type { PlayerView, PublicCatalog } from "@oathfront/contracts";
import type { IntentController } from "./intent-controller";
export default function BlockResponse({
  view,
  catalog,
  controller,
  selectedId,
  disabled,
  online,
}: {
  view: PlayerView;
  catalog: PublicCatalog;
  controller: IntentController;
  selectedId: string | null;
  disabled: boolean;
  online: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null),
    useButton = useRef<HTMLButtonElement>(null);
  const response = view.blockResponse;
  const powerId =
    response?.visibility === "OWN" ? response.powerInstanceId : null;
  const targeting = !!powerId && selectedId === powerId;
  const wasTargeting = useRef(false);
  useEffect(() => {
    heading.current?.focus();
  }, [powerId]);
  useEffect(() => {
    if (targeting)
      document
        .querySelector<HTMLElement>('[data-legal-target="true"]')
        ?.focus();
    else if (wasTargeting.current) useButton.current?.focus();
    wasTargeting.current = targeting;
  }, [targeting]);
  if (response?.visibility !== "OWN") return null;
  const card = view.self.reserve.find((card) => card.instanceId === powerId);
  const power = catalog.powers.find((power) => power.id === card?.definitionId);
  const actions = view.legalActions.filter(
    (action) =>
      action.kind === "USE_BLOCK_POWER" && action.powerInstanceId === powerId,
  );
  const keep = view.legalActions.find(
    (action) => action.kind === "KEEP_BLOCK_POWER",
  );
  return (
    <section
      className="block-response panel"
      aria-label="Lựa chọn sau chặn đòn"
    >
      <h2 ref={heading} tabIndex={-1}>
        Đã chặn đòn
      </h2>
      <p>
        Chặn 0 / 8 · Còn {3 - view.players[view.self.side].block.used} lần chặn
      </p>
      <h3>{power?.nameVi}</h3>
      {power?.signatureOwner && <p>Năng lực đặc trưng</p>}
      <p className="free-power">Miễn phí lúc này</p>
      <p>{power?.exactTextVi}</p>
      {!online && <p role="status">Đang kết nối lại</p>}
      {targeting ? (
        <>
          <h3>Chọn mục tiêu</h3>
          <p>Chọn vùng được đánh dấu. Esc để hủy mục tiêu.</p>
          <button onClick={() => controller.cancelSelection()}>
            Hủy chọn mục tiêu
          </button>
        </>
      ) : (
        <>
          {!actions.length && <p>Hiện không có mục tiêu hợp lệ</p>}
          <button
            ref={useButton}
            className="primary"
            disabled={disabled || !actions.length}
            onClick={() => {
              const none = actions.find(
                (action) => "target" in action && action.target.kind === "NONE",
              );
              if (none) void controller.submitIntent(none);
              else controller.selectCard(response.powerInstanceId);
            }}
          >
            Dùng ngay · 0
          </button>
        </>
      )}
      <button
        disabled={disabled || !keep}
        onClick={() => {
          if (keep) void controller.submitIntent(keep);
        }}
      >
        Để dành
      </button>
    </section>
  );
}
