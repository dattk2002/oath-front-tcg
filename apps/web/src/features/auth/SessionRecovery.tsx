import { useContext } from "react";
import { SessionRecoveryContext } from "./private-storage";
export default function SessionRecovery({
  online = true,
}: {
  online?: boolean;
}) {
  const expired = useContext(SessionRecoveryContext);
  if (!expired) return null;
  return (
    <div className="session-recovery">
      <p>
        Your session expired. Restore it and retry; your pending request is
        unchanged.
      </p>
      <button
        disabled={!online}
        onClick={() => window.dispatchEvent(new Event("oathfront:renew"))}
      >
        Restore session
      </button>
      <button
        disabled={!online}
        onClick={() => window.dispatchEvent(new Event("oathfront:login"))}
      >
        Sign in with Google
      </button>
    </div>
  );
}
