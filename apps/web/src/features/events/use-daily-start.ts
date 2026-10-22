import { useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionResponse } from "@oathfront/contracts/browser";
import type { ApiClient } from "../match/api-client";
import { ApiError } from "../match/api-error";
import { PrivateStorageContext, privateStorage } from "../auth/private-storage";
import { pendingDailyKey, readDailyIntent, type DailyIntent } from "./model";
export function useDailyStart(
  api: ApiClient,
  ensureSession: () => Promise<SessionResponse>,
  refresh: () => void,
) {
  const storage = useContext(PrivateStorageContext),
    router = useRouter();
  const [pending, setPending] = useState<DailyIntent | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [conflict, setConflict] = useState<string | null>(null);
  const request = useRef<DailyIntent | null>(null),
    sending = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (sending.current) return;
    request.current = readDailyIntent(storage);
    setPending(request.current);
  }, [storage]);
  async function start(
    scenarioId: string,
    eventSlug: string,
    practice: boolean,
  ) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setMessage("");
    setConflict(null);
    let store: Storage | null = null;
    try {
      const session = await ensureSession();
      if (!alive.current) return;
      try {
        store = privateStorage(sessionStorage, session.principal.id);
      } catch {
        /* Memory retry remains available. */
      }
      const existing = request.current ?? readDailyIntent(store);
      if (!existing && session.activeMatchId) {
        setConflict(session.activeMatchId);
        return;
      }
      const intent = existing ?? {
        request: { commandId: crypto.randomUUID(), scenarioId, practice },
        eventSlug,
      };
      request.current = intent;
      setPending(intent);
      let durable = false;
      try {
        store?.setItem(pendingDailyKey, JSON.stringify(intent));
        durable = !!store;
      } catch {
        /* Keep exact in-memory intent. */
      }
      if (!durable)
        setMessage(
          "Keep this page open: the pending request could not be saved on this device.",
        );
      const result = await api.createDaily(intent.request);
      try {
        store?.removeItem(pendingDailyKey);
      } catch {
        /* Confirmed receipt; navigation is safe. */
      }
      request.current = null;
      setPending(null);
      if (alive.current) router.push(`/matches/${result.view.matchId}`);
    } catch (error) {
      if (!alive.current) return;
      if (
        error instanceof ApiError &&
        error.body.error.code === "SESSION_EXPIRED"
      ) {
        setMessage(
          "Your session has expired. Restore it before starting or retrying this challenge.",
        );
        return;
      }
      if (
        error instanceof ApiError &&
        [
          "ACTIVE_MATCH_EXISTS",
          "DAILY_UNAVAILABLE",
          "FORBIDDEN",
          "NOT_FOUND",
          "VERSION_UNSUPPORTED",
        ].includes(error.body.error.code)
      ) {
        request.current = null;
        setPending(null);
        try {
          store?.removeItem(pendingDailyKey);
        } catch {
          /* Server confirmed rejection. */
        }
        if (error.body.error.code === "ACTIVE_MATCH_EXISTS")
          setConflict(error.body.error.details.matchId);
        else
          setMessage(
            error.body.error.code === "DAILY_UNAVAILABLE"
              ? "This challenge is no longer available in this state. Your progress has been refreshed."
              : "The challenge could not start. Sign in again or refresh your progress.",
          );
        refresh();
      } else
        setMessage(
          "Challenge creation is unconfirmed. Retry the original request; do not start another challenge.",
        );
    } finally {
      sending.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return {
    start,
    busy,
    pending,
    message,
    conflict,
    retry: () => {
      const i = request.current;
      if (i) void start(i.request.scenarioId, i.eventSlug, i.request.practice);
    },
  };
}
