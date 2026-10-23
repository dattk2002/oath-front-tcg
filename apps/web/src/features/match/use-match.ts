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
import { createMatchSync, realtimeUnavailableMessage } from "./realtime";
function useSessionGeneration(api: ApiClient) {
  return useSyncExternalStore(
    api.subscribeSession,
    api.getSessionGeneration,
    api.getSessionGeneration,
  );
}
export function useLoadedMatch(api: ApiClient, matchId: string) {
  const sessionGeneration = useSessionGeneration(api);
  const [initial, setInitial] = useState<CommandResponse | null>(null),
    [failed, setFailed] = useState(false),
    [expired, setExpired] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    const unsubscribeSession = api.subscribeSession(() => abort.abort());
    void api.match(matchId, abort.signal).then(
      (response) => {
        if (active && api.getSessionGeneration() === sessionGeneration) {
          setInitial(response);
          setFailed(false);
        }
      },
      (error: unknown) => {
        if (active && api.getSessionGeneration() === sessionGeneration) {
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
      abort.abort();
      unsubscribeSession();
    };
  }, [api, matchId, attempt, sessionGeneration]);
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
  const sessionGeneration = useSessionGeneration(api);
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
    [realtimeUnavailable, setRealtimeUnavailable] = useState(false);
  const retryRecovery = useRef<() => void>(() => {});
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
    let active = true;
    const current = () =>
      active && api.getSessionGeneration() === sessionGeneration;
    setRecovering(false);
    const sync = createMatchSync({
      matchId: initial.view.matchId,
      subscribeSession: api.subscribeSession,
      ticket: (signal) => api.realtimeTicket(initial.view.matchId, signal),
      getRevision: () => store.getSnapshot().revision,
      onPending: (pending) => {
        if (current()) setRecovering(pending);
      },
      onRecovered: () => {
        if (current()) setRecoveryFailed(false);
      },
      recover: async (force, signal) => {
        const recovered = await recoverMatch(
          initial.view.matchId,
          store.getSnapshot().logCursor,
          {
            match: (id) => api.match(id, signal),
            events: (id, after, through) =>
              api.events(id, after, through, signal),
          },
        );
        if (!current()) return;
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
        if (isRecoveryFailureMessage(before.message)) store.setMessage(null);
        store.mergeLog(
          recovered.logEvents,
          recovered.logCursor,
          recovered.logExpired,
        );
      },
      onError: () => {
        if (current()) {
          setRecoveryFailed(true);
        }
      },
      onStatus: (status) => {
        if (!current()) return;
        if (status === "disconnected") setRealtimeUnavailable(true);
        else if (status === "connected") setRealtimeUnavailable(false);
      },
    });
    retryRecovery.current = sync.retry;
    return () => {
      active = false;
      retryRecovery.current = () => {};
      sync.dispose();
    };
  }, [api, initial.view.matchId, store, sessionGeneration]);
  useEffect(() => {
    let active = true,
      scanning = false;
    const abort = new AbortController();
    const unsubscribeSession = api.subscribeSession(() => abort.abort());
    async function catchUp() {
      const current = store.getSnapshot();
      if (
        !active ||
        api.getSessionGeneration() !== sessionGeneration ||
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
          {
            events: (id, after, through) =>
              api.events(id, after, through, abort.signal),
          },
        );
        if (active && api.getSessionGeneration() === sessionGeneration)
          store.mergeLog(log.logEvents, log.logCursor, log.logExpired);
      } catch {
        if (active && api.getSessionGeneration() === sessionGeneration)
          store.setMessage(incompleteLogRecoveryError);
      } finally {
        scanning = false;
        if (
          active &&
          api.getSessionGeneration() === sessionGeneration &&
          store.getSnapshot().latestSeq > current.latestSeq
        )
          void catchUp();
      }
    }
    const unsubscribe = store.subscribe(() => void catchUp());
    void catchUp();
    return () => {
      active = false;
      abort.abort();
      unsubscribeSession();
      unsubscribe();
    };
  }, [api, initial.view.matchId, store, sessionGeneration]);
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
    recoveryMessage: recoveryFailed
      ? latestBoardRecoveryError
      : realtimeUnavailable
        ? realtimeUnavailableMessage
        : null,
    recover: () => retryRecovery.current(),
  };
}
