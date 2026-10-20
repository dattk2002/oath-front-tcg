import SessionRecovery from "../auth/SessionRecovery";
import { useContext } from "react";
import { SessionRecoveryContext } from "../auth/private-storage";
import type { MatchSnapshot } from "./view-store";
import type { IntentController } from "./intent-controller";

export interface RecoveryControlsProps {
  snapshot: MatchSnapshot;
  controller: IntentController;
  online: boolean;
  recovering: boolean;
  onRecover: () => void;
}

export default function RecoveryControls({
  snapshot,
  controller,
  online,
  recovering,
  onRecover,
}: RecoveryControlsProps) {
  const expired = useContext(SessionRecoveryContext);
  return (
    <div
      className="command-status"
      data-testid="command-status"
      role="status"
      aria-live="polite"
    >
      {!online
        ? "Mất kết nối. Bàn chơi được giữ; kết nối lại để tiếp tục."
        : recovering
          ? "Đang kết nối lại…"
          : snapshot.pendingCommand?.status === "SENDING"
            ? "Đang xác nhận…"
            : (snapshot.message ??
              (snapshot.pendingCommand?.status === "UNCERTAIN"
                ? "Có yêu cầu chưa được xác nhận. Hãy thử lại cùng yêu cầu."
                : ""))}
      <SessionRecovery online={online} />
      {online && snapshot.message?.includes("Kết nối lại") && (
        <button disabled={recovering} onClick={onRecover}>
          Kết nối lại
        </button>
      )}
      {snapshot.pendingCommand?.status === "UNCERTAIN" && (
        <button
          disabled={!online || expired}
          onClick={() => void controller.retryPending()}
        >
          Thử lại yêu cầu
        </button>
      )}
    </div>
  );
}
