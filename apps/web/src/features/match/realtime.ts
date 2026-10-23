import type { RealtimeTicket } from "@oathfront/contracts";
import { validateBrowserWire } from "@oathfront/contracts/browser";

export const realtimeUnavailableMessage =
  "Live updates are unavailable. Reconnect to refresh the board and retry.";

export interface RealtimeEnvironment {
  available(): boolean;
  subscribe(listener: () => void): () => void;
  createSocket(
    url: string,
  ): Pick<
    WebSocket,
    "send" | "close" | "addEventListener" | "removeEventListener"
  >;
  random(): number;
}

export function browserRealtimeEnvironment(): RealtimeEnvironment {
  return {
    available: () => !document.hidden && navigator.onLine,
    subscribe(listener) {
      document.addEventListener("visibilitychange", listener);
      window.addEventListener("online", listener);
      window.addEventListener("offline", listener);
      return () => {
        document.removeEventListener("visibilitychange", listener);
        window.removeEventListener("online", listener);
        window.removeEventListener("offline", listener);
      };
    },
    createSocket: (url) => new WebSocket(url),
    random: Math.random,
  };
}

/** One HTTP recovery at a time; notifications are revision targets, not a queue. */
export function createRevisionRecovery(options: {
  getRevision(): number;
  recover(force: boolean, signal: AbortSignal): Promise<void>;
  available?(): boolean;
  onError?(error: unknown): void;
  onPending?(pending: boolean): void;
  onRecovered?(): void;
}) {
  let disposed = false;
  let running = false;
  let highestRevision = options.getRevision();
  let catchUpVersion = 0;
  let completedCatchUp = 0;
  let forcePresentation = false;
  const abort = new AbortController();
  const available = () => !disposed && (options.available?.() ?? true);

  async function drain() {
    if (running || !available()) return;
    running = true;
    options.onPending?.(true);
    let recovered = false;
    try {
      while (
        available() &&
        (catchUpVersion > completedCatchUp ||
          highestRevision > options.getRevision())
      ) {
        const requested = highestRevision;
        const version = catchUpVersion;
        const force = forcePresentation;
        forcePresentation = false;
        await options.recover(force, abort.signal);
        if (!available()) return;
        recovered = true;
        completedCatchUp = version;
        // A newly announced revision needs a trailing read. A server repeatedly
        // returning an older snapshot must fail visibly instead of polling.
        if (options.getRevision() < requested && highestRevision <= requested)
          throw new Error("REALTIME_RECOVERY_BEHIND");
      }
      if (recovered && available()) options.onRecovered?.();
    } catch (error) {
      if (!disposed) options.onError?.(error);
    } finally {
      running = false;
      if (!disposed) options.onPending?.(false);
    }
  }
  return {
    invalidate(revision: number) {
      if (
        disposed ||
        revision <= Math.max(highestRevision, options.getRevision())
      )
        return;
      highestRevision = revision;
      void drain();
    },
    catchUp(force = false, revision = options.getRevision()) {
      if (disposed) return;
      highestRevision = Math.max(highestRevision, revision);
      catchUpVersion++;
      forcePresentation ||= force;
      void drain();
    },
    dispose() {
      disposed = true;
      abort.abort();
    },
  };
}

type RealtimeStatus = "connecting" | "connected" | "disconnected" | "suspended";
export function createMatchSync(options: {
  matchId: string;
  environment?: RealtimeEnvironment;
  ticket(signal: AbortSignal): Promise<RealtimeTicket>;
  subscribeSession?(listener: () => void): () => void;
  getRevision(): number;
  recover(force: boolean, signal: AbortSignal): Promise<void>;
  onPending?(pending: boolean): void;
  onRecovered?(): void;
  onError?(error: unknown): void;
  onStatus?(status: RealtimeStatus): void;
}) {
  const environment = options.environment ?? browserRealtimeEnvironment();
  const recovery = createRevisionRecovery({
    ...options,
    available: environment.available,
  });
  const realtime = createMatchRealtime({
    ...options,
    environment,
    onReady: (revision) => recovery.catchUp(false, revision),
    onChanged: (revision) => recovery.invalidate(revision),
  });
  let disposed = false;
  const unsubscribeSession = options.subscribeSession?.(dispose);
  function dispose() {
    if (disposed) return;
    disposed = true;
    unsubscribeSession?.();
    realtime.dispose();
    recovery.dispose();
  }
  return {
    retry() {
      if (disposed) return;
      // Recovery is useful even when tickets or socket upgrades are unavailable.
      recovery.catchUp(true);
      realtime.retry();
    },
    dispose,
  };
}
/** Socket payloads only invalidate HTTP state; tickets never leave memory. */
export function createMatchRealtime(options: {
  matchId: string;
  environment?: RealtimeEnvironment;
  ticket(signal: AbortSignal): Promise<RealtimeTicket>;
  onReady(revision: number): void;
  onChanged(revision: number): void;
  onStatus?(status: RealtimeStatus): void;
}) {
  const environment = options.environment ?? browserRealtimeEnvironment();
  let disposed = false;
  let failures = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let current: { stop(): void } | undefined;
  const available = () => !disposed && environment.available();
  const clearRetry = () => {
    if (retryTimer !== undefined) clearTimeout(retryTimer);
    retryTimer = undefined;
  };
  const stopAttempt = () => {
    const attempt = current;
    current = undefined;
    attempt?.stop();
  };

  function start() {
    if (!available() || current) return;
    clearRetry();
    const abort = new AbortController();
    let socket: ReturnType<RealtimeEnvironment["createSocket"]> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let ready = false;
    let expiresAt = 0;
    let token: string | undefined;
    const attempt = {
      stop() {
        abort.abort();
        token = undefined;
        if (timeout !== undefined) clearTimeout(timeout);
        timeout = undefined;
        if (socket) {
          socket.removeEventListener("open", opened);
          socket.removeEventListener("message", message);
          socket.removeEventListener("close", failed);
          socket.removeEventListener("error", failed);
          socket.close();
        }
      },
    };
    const active = () => current === attempt && available();

    function failed() {
      if (current !== attempt) return;
      stopAttempt();
      if (!available()) return;
      options.onStatus?.("disconnected");
      const base = Math.min(30_000, 1000 * 2 ** Math.min(failures++, 5));
      const delay = Math.min(
        30_000,
        Math.max(1000, base * (0.8 + environment.random() * 0.4)),
      );
      retryTimer = setTimeout(start, delay);
    }
    function opened() {
      if (!active()) return;
      if (!token || expiresAt <= Date.now()) return failed();
      try {
        socket!.send(JSON.stringify({ type: "subscribe", token }));
        token = undefined;
      } catch {
        failed();
      }
    }
    function message(event: Event) {
      if (!active()) return;
      const data: unknown = (event as MessageEvent<unknown>).data;
      if (typeof data !== "string" || data.length > 1024) return failed();
      let parsed: unknown;
      try {
        parsed = JSON.parse(data);
      } catch {
        return failed();
      }
      if (
        !validateBrowserWire("RealtimeMessage", parsed) ||
        !Number.isSafeInteger(parsed.revision)
      )
        return failed();
      if (parsed.matchId !== options.matchId) return;
      if (parsed.type === "ready") {
        if (ready) return;
        if (token || expiresAt <= Date.now()) return failed();
        ready = true;
        failures = 0;
        if (timeout !== undefined) clearTimeout(timeout);
        timeout = undefined;
        options.onStatus?.("connected");
        options.onReady(parsed.revision);
      } else {
        if (!ready) return failed();
        options.onChanged(parsed.revision);
      }
    }

    current = attempt;
    options.onStatus?.("connecting");
    // Bound even a stalled ticket request, then apply the shorter handshake and
    // ticket deadlines once the authenticated response arrives.
    timeout = setTimeout(failed, 10_000);
    void Promise.resolve()
      .then(() => {
        if (!active()) return;
        return options.ticket(abort.signal);
      })
      .then((ticket) => {
        if (!active() || !ticket) return;
        const url = new URL(ticket.url);
        expiresAt = Date.parse(ticket.expiresAt);
        if (
          !["ws:", "wss:"].includes(url.protocol) ||
          url.username ||
          url.password ||
          url.search ||
          url.hash ||
          url.pathname !== "/realtime/matches" ||
          !Number.isFinite(expiresAt) ||
          expiresAt <= Date.now()
        )
          return failed();
        token = ticket.token;
        socket = environment.createSocket(url.href);
        socket.addEventListener("open", opened);
        socket.addEventListener("message", message);
        socket.addEventListener("close", failed);
        socket.addEventListener("error", failed);
        if (timeout !== undefined) clearTimeout(timeout);
        timeout = setTimeout(failed, Math.min(5000, expiresAt - Date.now()));
      })
      .catch(failed);
  }

  const unsubscribe = environment.subscribe(() => {
    if (!available()) {
      clearRetry();
      stopAttempt();
      if (!disposed) options.onStatus?.("suspended");
    } else start();
  });
  start();
  return {
    retry() {
      if (disposed) return;
      clearRetry();
      stopAttempt();
      failures = 0;
      start();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearRetry();
      stopAttempt();
      unsubscribe();
    },
  };
}
