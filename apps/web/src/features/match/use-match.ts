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
import type { ApiClient } from "./api-client";
import { createMatchViewStore } from "./view-store";
import { createIntentController } from "./intent-controller";
export function useLoadedMatch(api: ApiClient, matchId: string) {
  const [initial, setInitial] = useState<CommandResponse | null>(null),
    [failed, setFailed] = useState(false),
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
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [api, matchId, attempt]);
  return {
    initial,
    failed,
    retry: () => {
      setFailed(false);
      setAttempt((value) => value + 1);
    },
  };
}
export function useMatchStore(initial: CommandResponse, api: ApiClient) {
  const presentation = useRef<PresentationController | null>(null);
  const [store] = useState(() => createMatchViewStore(initial));
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const view = snapshot.authoritativeView;
  const [online, setOnline] = useState(true),
    [large, setLarge] = useState(false);
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
          if (envelope) sessionStorage.setItem(key, JSON.stringify(envelope));
          else sessionStorage.removeItem(key);
        },
      }),
    [store, api, initial.view.matchId],
  );
  useEffect(() => {
    const media = window.matchMedia(
      "(min-width: 1024px) and (min-height: 640px)",
    );
    const resize = () => setLarge(media.matches);
    const connectivity = () => setOnline(navigator.onLine);
    resize();
    connectivity();
    media.addEventListener("change", resize);
    window.addEventListener("online", connectivity);
    window.addEventListener("offline", connectivity);
    const key = `oathfront.command.${initial.view.matchId}`;
    try {
      const pending: unknown = JSON.parse(
        sessionStorage.getItem(key) ?? "null",
      );
      if (validateBrowserWire("CommandEnvelope", pending))
        store.setPending({ envelope: pending, status: "UNCERTAIN" });
    } catch {
      /* Ignore damaged local command data. */
    }
    return () => {
      media.removeEventListener("change", resize);
      window.removeEventListener("online", connectivity);
      window.removeEventListener("offline", connectivity);
    };
  }, [initial.view.matchId, store]);
  useEffect(() => {
    if (
      !snapshot.needsAdvance ||
      snapshot.pendingCommand ||
      !online ||
      !large ||
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
    snapshot.needsAdvance,
    snapshot.pendingCommand,
    snapshot.revision,
    online,
    large,
    view.lifecycle,
    controller,
  ]);
  const disabled = !!snapshot.pendingCommand || !online || !large;
  return { store, snapshot, controller, disabled, online, presentation };
}
