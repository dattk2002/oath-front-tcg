import { usePrivateStorage } from "../auth/private-storage";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { CommandResponse } from "@oathfront/contracts";
import { validateBrowserWire } from "@oathfront/contracts/browser";
import type { PresentationController } from "./motion/presentation-controller";
import { ApiError } from "./api-error";
import {
  recoverMatch,
  scanLog,
  latestBoardRecoveryError,
  incompleteLogRecoveryError,
  isRecoveryFailureMessage,
} from "./recovery";
import type { ApiClient } from "./api-client";
import { createMatchViewStore } from "./view-store";
import { createIntentController } from "./intent-controller";
export function useLoadedMatch(api: ApiClient, matchId: string) {
  const [initial, setInitial] = useState<CommandResponse | null>(null),
    [failed, setFailed] = useState(false),
    [expired, setExpired] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void api.match(matchId).then(
      (response) => {
        if (active) {
          setInitial(response);
          setFailed(false);
        }
      },
      (error: unknown) => {
        if (active) {
          setExpired(
            error instanceof ApiError &&
              error.body.error.code === "MATCH_DETAILS_EXPIRED",
          );
          setFailed(true);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [api, matchId, attempt]);
  return {
    initial: initial?.view.matchId === matchId ? initial : null,
    failed,
    expired,
    retry: () => {
      setFailed(false);
      setAttempt((value) => value + 1);
    },
  };
}
export function useMatchStore(initial: CommandResponse, api: ApiClient) {
  const storage = usePrivateStorage();
  const presentation = useRef<PresentationController | null>(null);
  const [store] = useState(() => createMatchViewStore(initial));
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const view = snapshot.authoritativeView;
  const [online, setOnline] = useState(true),
    [recovering, setRecovering] = useState(false),
    [recoveryFailed, setRecoveryFailed] = useState(false),
    [recoveryAttempt, setRecoveryAttempt] = useState(0);
  const controller = useMemo(
    () =>
      createIntentController(store, {
        makeId: () => crypto.randomUUID(),
        fastForward: () =>
          presentation.current?.fastForward(
            store.getSnapshot().authoritativeView,
          ),
        send: (envelope) => api.command(initial.view.matchId, envelope),
        persistPending: (envelope) => {
          const key = `oathfront.command.${initial.view.matchId}`;
          if (envelope) storage.setItem(key, JSON.stringify(envelope));
          else storage.removeItem(key);
        },
      }),
    [store, api, initial.view.matchId, storage],
  );
  useEffect(() => {
    const connectivity = () => setOnline(navigator.onLine);
    connectivity();
    window.addEventListener("online", connectivity);
    window.addEventListener("offline", connectivity);
    const key = `oathfront.command.${initial.view.matchId}`;
    try {
      const pending: unknown = JSON.parse(storage.getItem(key) ?? "null");
      if (validateBrowserWire("CommandEnvelope", pending))
        store.setPending({ envelope: pending, status: "UNCERTAIN" });
    } catch {
      /* Ignore damaged local command data. */
    }
    return () => {
      window.removeEventListener("online", connectivity);
      window.removeEventListener("offline", connectivity);
    };
  }, [initial.view.matchId, store, storage]);
  useEffect(() => {
    let active = true,
      inFlight = false;
    async function reconnect(force = false) {
      if (!active || inFlight || document.hidden || !navigator.onLine) return;
      inFlight = true;
      setRecovering(true);
      try {
        const recovered = await recoverMatch(
          initial.view.matchId,
          store.getSnapshot().logCursor,
          api,
        );
        if (!active) return;
        const before = store.getSnapshot();
        store.acceptResponse(recovered.response);
        const accepted = store.getSnapshot();
        if (
          force ||
          accepted.revision > before.revision ||
          accepted.latestSeq > before.latestSeq
        ) {
          store.setPresentationCursor(accepted.latestSeq);
          presentation.current?.fastForward(accepted.authoritativeView);
          store.setSelection(null);
        }
        setRecoveryFailed(false);
        if (isRecoveryFailureMessage(before.message)) store.setMessage(null);
        store.mergeLog(
          recovered.logEvents,
          recovered.logCursor,
          recovered.logExpired,
        );
      } catch {
        if (active) {
          setRecoveryFailed(true);
          store.setMessage(latestBoardRecoveryError);
        }
      } finally {
        inFlight = false;
        if (active) setRecovering(false);
      }
    }
    const visible = () => {
      if (!document.hidden) void reconnect(true);
    };
    const poll = () => {
      if (!document.hidden) void reconnect();
    };
    // Visible inactive tabs also refresh every five seconds. Hidden tabs do no I/O.
    const timer = setInterval(poll, 5000);
    window.addEventListener("online", visible);
    document.addEventListener("visibilitychange", visible);
    void reconnect(true);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("online", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [api, initial.view.matchId, store, recoveryAttempt]);
  useEffect(() => {
    let active = true,
      scanning = false;
    async function catchUp() {
      const current = store.getSnapshot();
      if (
        !active ||
        scanning ||
        document.hidden ||
        !navigator.onLine ||
        current.logCursor >= current.latestSeq
      )
        return;
      scanning = true;
      try {
        const log = await scanLog(
          initial.view.matchId,
          current.logCursor,
          current.latestSeq,
          api,
        );
        if (active)
          store.mergeLog(log.logEvents, log.logCursor, log.logExpired);
      } catch {
        if (active) store.setMessage(incompleteLogRecoveryError);
      } finally {
        scanning = false;
        if (active && store.getSnapshot().latestSeq > current.latestSeq)
          void catchUp();
      }
    }
    const unsubscribe = store.subscribe(() => void catchUp());
    void catchUp();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [api, initial.view.matchId, store]);
  useEffect(() => {
    if (
      recovering ||
      recoveryFailed ||
      !snapshot.needsAdvance ||
      snapshot.pendingCommand ||
      !online ||
      view.lifecycle !== "ACTIVE"
    )
      return;
    const advance = () => {
      if (document.visibilityState === "visible")
        void controller.submitIntent({ kind: "ADVANCE" });
    };
    const timer = setTimeout(advance, 180);
    document.addEventListener("visibilitychange", advance);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", advance);
    };
  }, [
    recovering,
    recoveryFailed,
    snapshot.needsAdvance,
    snapshot.pendingCommand,
    snapshot.revision,
    online,
    view.lifecycle,
    controller,
  ]);
  const disabled =
    !!snapshot.pendingCommand || !online || recovering || recoveryFailed;
  return {
    store,
    snapshot,
    controller,
    disabled,
    online,
    presentation,
    recovering,
    recover: () => setRecoveryAttempt((value) => value + 1),
  };
}
