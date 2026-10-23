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
  recoveryMessage: string | null;
  onRecover: () => void;
}

export default function RecoveryControls({
  snapshot,
  controller,
  online,
  recovering,
  recoveryMessage,
  onRecover,
}: RecoveryControlsProps) {
  const expired = useContext(SessionRecoveryContext);
  return (
    <div
      className="command-status"
      data-testid="command-status"
      data-active={
        !!(
          !online ||
          recovering ||
          recoveryMessage ||
          snapshot.pendingCommand ||
          snapshot.message ||
          expired
        )
      }
      role="status"
      aria-live="polite"
    >
      {!online
        ? "Connection lost. Your match is saved. Reconnect to continue."
        : recovering
          ? "Reconnecting…"
          : snapshot.pendingCommand?.status === "SENDING"
            ? "Checking…"
            : (recoveryMessage ??
              snapshot.message ??
              (snapshot.pendingCommand?.status === "UNCERTAIN"
                ? "A request is unconfirmed. Retry the same request."
                : ""))}
      <SessionRecovery online={online} />
      {online &&
        (recoveryMessage || snapshot.message?.includes("Reconnect")) && (
          <button disabled={recovering} onClick={onRecover}>
            Reconnect
          </button>
        )}
      {snapshot.pendingCommand?.status === "UNCERTAIN" && (
        <button
          disabled={!online || expired}
          onClick={() => void controller.retryPending()}
        >
          Retry request
        </button>
      )}
    </div>
  );
}
