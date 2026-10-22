import { useCallback, useEffect, useRef, useState } from "react";
/** Identity-bound reads: an old owner/route response cannot replace the current one. */
export function useLiveRead<T>(
  identity: unknown,
  load: () => Promise<T>,
  enabled = true,
) {
  const loader = useRef(load);
  loader.current = load;
  const [state, setState] = useState<{
    identity: unknown;
    data: T | null;
    error: unknown;
  }>({ identity, data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => setAttempt((n) => n + 1), []);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void loader.current().then(
      (data) => {
        if (active) setState({ identity, data, error: null });
      },
      (error) => {
        if (active)
          setState((s) => ({
            identity,
            data: s.identity === identity ? s.data : null,
            error,
          }));
      },
    );
    return () => {
      active = false;
    };
  }, [identity, attempt, enabled]);
  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("focus", refresh);
    const visible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [enabled, refresh]);
  return {
    data: enabled && state.identity === identity ? state.data : null,
    error: enabled && state.identity === identity ? state.error : null,
    refresh,
  };
}
