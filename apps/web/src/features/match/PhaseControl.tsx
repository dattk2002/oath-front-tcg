import type { IntentController } from "./intent-controller";
import type { MatchSnapshot } from "./view-store";
export default function PhaseControl({
  snapshot,
  controller,
  disabled,
}: {
  snapshot: MatchSnapshot;
  controller: IntentController;
  disabled: boolean;
}) {
  const view = snapshot.authoritativeView;
  const legal = view.legalActions;
  const keep = legal.some((action) => action.kind === "KEEP_BLOCK_POWER");
  return (
    <div className="phase-controls">
      <button
        className="primary"
        disabled={
          disabled ||
          !legal.some(
            (action) =>
              action.kind === (keep ? "KEEP_BLOCK_POWER" : "PASS_PHASE"),
          )
        }
        onClick={() =>
          void controller.submitIntent({
            kind: keep ? "KEEP_BLOCK_POWER" : "PASS_PHASE",
          })
        }
      >
        {keep
          ? "Để dành"
          : view.tutorial?.stepId === "E01"
            ? "Kết thúc triển khai"
            : view.tutorial?.stepId === "E02"
              ? "Kết thúc trick"
              : "Kết thúc hành động"}
      </button>
      <p className="muted">
        {snapshot.needsAdvance
          ? "Đang xử lý lượt của bot và giao tranh…"
          : snapshot.authoritativeView.activeSide ===
              snapshot.authoritativeView.self.side
            ? "Đến lượt bạn chọn hành động."
            : "Chờ diễn biến tiếp theo."}
      </p>
    </div>
  );
}
