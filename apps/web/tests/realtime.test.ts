import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMatchRealtime,
  createMatchSync,
  createRevisionRecovery,
  type RealtimeEnvironment,
} from "../src/features/match/realtime.js";
import { createApiClient } from "../src/features/match/api-client.js";

const matchId = "10000000-0000-4000-8000-000000000001";
const otherMatchId = "10000000-0000-4000-8000-000000000002";
const ticket = () => ({
  url: "wss://api.example.test/realtime/matches",
  token: "short-lived-subscribe-ticket",
  expiresAt: new Date(Date.now() + 30_000).toISOString(),
});
const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
class Socket extends EventTarget {
  sent: string[] = [];
  closed = false;
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
  }
  open() {
    this.dispatchEvent(new Event("open"));
  }
  message(value: unknown) {
    this.dispatchEvent(
      new MessageEvent("message", { data: JSON.stringify(value) }),
    );
  }
  ready(revision = 1) {
    this.message({ type: "ready", matchId, revision });
  }
  changed(revision: number) {
    this.message({ type: "changed", matchId, revision });
  }
}
function environment() {
  let visible = true;
  let online = true;
  const listeners = new Set<() => void>();
  const sockets: Socket[] = [];
  const urls: string[] = [];
  const value: RealtimeEnvironment = {
    available: () => visible && online,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    createSocket(url) {
      urls.push(url);
      const socket = new Socket();
      sockets.push(socket);
      return socket;
    },
    random: () => 0.5,
  };
  return {
    value,
    sockets,
    urls,
    listeners,
    socket(index: number) {
      const socket = sockets[index];
      expect(socket, `socket ${index} exists`).toBeDefined();
      if (!socket) throw new Error("Missing test socket");
      return socket;
    },
    visibility(value: boolean) {
      visible = value;
      listeners.forEach((listener) => listener());
    },
    connectivity(value: boolean) {
      online = value;
      listeners.forEach((listener) => listener());
    },
  };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-23T00:00:00.000Z"));
});
afterEach(() => vi.useRealTimers());

describe("revision recovery", () => {
  it("retains the highest in-flight invalidation and fetches its trailing snapshot once", async () => {
    let revision = 1;
    const first = deferred<void>();
    const fetched: number[] = [];
    const recovery = createRevisionRecovery({
      getRevision: () => revision,
      recover: async () => {
        fetched.push(revision);
        if (fetched.length === 1) await first.promise;
        revision = fetched.length === 1 ? 2 : 6;
      },
    });
    recovery.invalidate(2);
    recovery.invalidate(4);
    recovery.invalidate(6);
    recovery.invalidate(5);
    expect(fetched).toEqual([1]);
    first.resolve();
    await flush();
    expect(fetched).toEqual([1, 2]);
    expect(revision).toBe(6);
    recovery.invalidate(6);
    recovery.invalidate(2);
    await flush();
    expect(fetched).toEqual([1, 2]);
    recovery.dispose();
  });

  it("retains an invalidation emitted synchronously while a snapshot is being accepted", async () => {
    let revision = 1;
    let fetches = 0;
    const recovery = createRevisionRecovery({
      getRevision: () => revision,
      recover: async () => {
        fetches++;
        revision++;
        if (fetches === 1) recovery.invalidate(3);
      },
    });
    recovery.invalidate(2);
    await flush();
    expect(fetches).toBe(2);
    expect(revision).toBe(3);
    recovery.dispose();
  });

  it("skips revisions already accepted by immediate HTTP commands", async () => {
    let revision = 4;
    let fetches = 0;
    const recovery = createRevisionRecovery({
      getRevision: () => revision,
      recover: async () => {
        fetches++;
      },
    });
    recovery.invalidate(4);
    revision = 5;
    recovery.invalidate(5);
    await flush();
    expect(fetches).toBe(0);
    recovery.dispose();
  });

  it("fails without HTTP polling and lets explicit retry recover after a failed request", async () => {
    let revision = 1;
    let fetches = 0;
    const errors: unknown[] = [];
    const pending: boolean[] = [];
    const recovery = createRevisionRecovery({
      getRevision: () => revision,
      recover: async () => {
        fetches++;
        if (fetches === 1) throw new Error("offline");
        revision = 2;
      },
      onError: (error) => errors.push(error),
      onPending: (value) => pending.push(value),
    });
    recovery.invalidate(2);
    await flush();
    recovery.invalidate(2);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetches).toBe(1);
    expect(errors).toHaveLength(1);
    recovery.catchUp(true);
    await flush();
    expect(fetches).toBe(2);
    expect(revision).toBe(2);
    expect(pending).toEqual([true, false, true, false]);
    recovery.dispose();
  });

  it("stops a stale snapshot from spinning a recovery loop and discards trailing work on dispose", async () => {
    const errors: unknown[] = [];
    let fetches = 0;
    const recovery = createRevisionRecovery({
      getRevision: () => 1,
      recover: async () => {
        fetches++;
      },
      onError: (error) => errors.push(error),
    });
    recovery.invalidate(2);
    await flush();
    expect(fetches).toBe(1);
    expect(errors).toHaveLength(1);
    recovery.dispose();
    recovery.invalidate(3);
    recovery.catchUp();
    await flush();
    expect(fetches).toBe(1);
  });
});

describe("match socket lifecycle", () => {
  it("sends tickets only in the first frame, recovers after ready, and performs no idle five-second HTTP reads", async () => {
    const env = environment();
    let revision = 1;
    let fetches = 0;
    const recovery = createRevisionRecovery({
      getRevision: () => revision,
      recover: async () => {
        fetches++;
        revision = 2;
      },
    });
    const client = createMatchRealtime({
      matchId,
      environment: env.value,
      ticket: async () => ticket(),
      onReady: (value) => recovery.catchUp(false, value),
      onChanged: (value) => recovery.invalidate(value),
    });
    await flush();
    expect(env.urls).toEqual(["wss://api.example.test/realtime/matches"]);
    const socket = env.socket(0);
    expect(fetches).toBe(0);
    socket.open();
    expect(socket.sent).toEqual([
      '{"type":"subscribe","token":"short-lived-subscribe-ticket"}',
    ]);
    expect(fetches).toBe(0);
    socket.ready();
    await flush();
    expect(fetches).toBe(1);
    socket.changed(2);
    socket.changed(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetches).toBe(1);
    expect(env.sockets).toHaveLength(1);
    client.dispose();
    recovery.dispose();
    expect(socket.closed).toBe(true);
    expect(env.listeners.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rotates a closed stream using a fresh ticket and catches up once after confirmed ready", async () => {
    const env = environment();
    let tickets = 0;
    const ready: number[] = [];
    const statuses: string[] = [];
    const client = createMatchRealtime({
      matchId,
      environment: env.value,
      ticket: async () => ({ ...ticket(), token: `ticket-${++tickets}` }),
      onReady: (revision) => ready.push(revision),
      onChanged: () => {},
      onStatus: (status) => statuses.push(status),
    });
    await flush();
    env.socket(0).open();
    env.socket(0).ready(4);
    env.socket(0).dispatchEvent(new Event("close"));
    expect(ready).toEqual([4]);
    expect(statuses.at(-1)).toBe("disconnected");
    await vi.advanceTimersByTimeAsync(1000);
    expect(tickets).toBe(2);
    env.socket(1).open();
    expect(env.socket(1).sent[0]).toContain('"ticket-2"');
    env.socket(1).ready(6);
    env.socket(1).ready(6);
    expect(ready).toEqual([4, 6]);
    client.dispose();
  });

  it("suspends on hidden/offline and ignores stale ticket completion after resume or disposal", async () => {
    const env = environment();
    const first = deferred<ReturnType<typeof ticket>>();
    const signals: AbortSignal[] = [];
    const client = createMatchRealtime({
      matchId,
      environment: env.value,
      ticket: (signal) => {
        signals.push(signal);
        return signals.length === 1 ? first.promise : Promise.resolve(ticket());
      },
      onReady: () => {},
      onChanged: () => {},
    });
    await flush();
    env.visibility(false);
    expect(signals[0]!.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(signals).toHaveLength(1);
    env.visibility(true);
    await flush();
    expect(env.sockets).toHaveLength(1);
    first.resolve(ticket());
    await flush();
    expect(env.sockets).toHaveLength(1);
    env.connectivity(false);
    expect(env.socket(0).closed).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    env.connectivity(true);
    await flush();
    expect(env.sockets).toHaveLength(2);
    client.dispose();
    env.visibility(false);
    env.visibility(true);
    expect(env.listeners.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    { type: "changed", matchId, revision: 2, seed: "private" },
    { type: "changed", matchId, revision: -1 },
    { type: "changed", matchId, revision: 1.5 },
    { type: "changed", matchId, revision: Number.MAX_SAFE_INTEGER + 1 },
    { type: "unknown", matchId, revision: 2 },
  ])(
    "closes malformed socket messages without issuing a board fetch: %j",
    async (message) => {
      const env = environment();
      const changes: number[] = [];
      const client = createMatchRealtime({
        matchId,
        environment: env.value,
        ticket: async () => ticket(),
        onReady: () => {},
        onChanged: (revision) => changes.push(revision),
      });
      await flush();
      const socket = env.socket(0);
      socket.open();
      socket.ready();
      socket.message({ type: "changed", matchId: otherMatchId, revision: 2 });
      expect(socket.closed).toBe(false);
      socket.message(message);
      expect(socket.closed).toBe(true);
      expect(changes).toEqual([]);
      client.dispose();
    },
  );

  it("bounds missing readiness and ticket expiration without accepting a late handshake", async () => {
    const env = environment();
    const ready: number[] = [];
    const client = createMatchRealtime({
      matchId,
      environment: env.value,
      ticket: async () => ({
        ...ticket(),
        expiresAt: new Date(Date.now() + 2000).toISOString(),
      }),
      onReady: (revision) => ready.push(revision),
      onChanged: () => {},
    });
    await flush();
    const socket = env.socket(0);
    socket.open();
    await vi.advanceTimersByTimeAsync(2000);
    expect(socket.closed).toBe(true);
    socket.ready();
    expect(ready).toEqual([]);
    client.dispose();

    const waiting = createMatchRealtime({
      matchId,
      environment: env.value,
      ticket: async () => ticket(),
      onReady: (revision) => ready.push(revision),
      onChanged: () => {},
    });
    await flush();
    env.socket(1).open();
    await vi.advanceTimersByTimeAsync(4999);
    expect(env.socket(1).closed).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(env.socket(1).closed).toBe(true);
    waiting.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bounds a stalled ticket request and ignores its eventual response", async () => {
    const env = environment();
    const stalled = deferred<ReturnType<typeof ticket>>();
    const signals: AbortSignal[] = [];
    const client = createMatchRealtime({
      matchId,
      environment: env.value,
      ticket: (signal) => {
        signals.push(signal);
        return stalled.promise;
      },
      onReady: () => {},
      onChanged: () => {},
    });
    await flush();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(signals[0]?.aborted).toBe(true);
    stalled.resolve(ticket());
    await flush();
    expect(env.sockets).toHaveLength(0);
    client.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("backs off ticket failures up to thirty seconds while explicit HTTP retry remains independent", async () => {
    const env = environment();
    const attempts: number[] = [];
    const signals: AbortSignal[] = [];
    const client = createMatchRealtime({
      matchId,
      environment: env.value,
      ticket: async (signal) => {
        signals.push(signal);
        attempts.push(Date.now());
        throw new Error("unavailable");
      },
      onReady: () => {
        throw new Error("not ready");
      },
      onChanged: () => {},
    });
    let fetches = 0;
    const recovery = createRevisionRecovery({
      getRevision: () => 1,
      recover: async () => {
        fetches++;
      },
    });
    await flush();
    recovery.catchUp(true);
    client.retry();
    await flush();
    expect(fetches).toBe(1);
    expect(env.sockets).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(125_000);
    const gaps = attempts
      .slice(2)
      .map((time, index) => time - attempts[index + 1]!);
    expect(gaps.slice(0, 5)).toEqual([1000, 2000, 4000, 8000, 16000]);
    expect(gaps.at(-1)).toBe(30000);
    expect(fetches).toBe(1);
    client.dispose();
    recovery.dispose();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("match synchronization", () => {
  it("successful manual catch-up clears board failure while realtime remains unavailable", async () => {
    const env = environment();
    let boardFailed = false;
    let transportUnavailable = false;
    let fetches = 0;
    const sync = createMatchSync({
      matchId,
      environment: env.value,
      ticket: async () => {
        throw new Error("no websocket service");
      },
      getRevision: () => 1,
      recover: async () => {
        if (++fetches === 1) throw new Error("HTTP unavailable");
      },
      onError: () => {
        boardFailed = true;
      },
      onRecovered: () => {
        boardFailed = false;
      },
      onStatus: (status) => {
        if (status === "disconnected") transportUnavailable = true;
      },
    });
    await flush();
    sync.retry();
    await flush();
    expect(boardFailed).toBe(true);
    expect(transportUnavailable).toBe(true);
    sync.retry();
    await flush();
    expect(boardFailed).toBe(false);
    expect(transportUnavailable).toBe(true);
    sync.dispose();
  });

  it("a new session binding disposes old sockets, HTTP reads and listeners without replaying commands", async () => {
    const env = environment();
    const api = createApiClient({ csrfToken: "original-session" });
    const read = deferred<void>();
    let recoverySignal: AbortSignal | undefined;
    let reads = 0;
    const sync = createMatchSync({
      matchId,
      environment: env.value,
      subscribeSession: api.subscribeSession,
      ticket: async () => ticket(),
      getRevision: () => 1,
      recover: async (_force, signal) => {
        reads++;
        recoverySignal = signal;
        await read.promise;
      },
    });
    await flush();
    env.socket(0).open();
    env.socket(0).ready(1);
    await flush();
    api.bindSession({ csrfToken: "original-session" });
    expect(env.socket(0).closed).toBe(false);
    api.bindSession({ csrfToken: "renewed-session" });
    expect(env.socket(0).closed).toBe(true);
    expect(recoverySignal?.aborted).toBe(true);
    expect(env.listeners.size).toBe(0);
    read.resolve();
    await flush();
    sync.retry();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(reads).toBe(1);
    expect(env.sockets).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("manual retry performs HTTP recovery even when ticket creation can never succeed", async () => {
    const env = environment();
    const fetches: boolean[] = [];
    const pending: boolean[] = [];
    const statuses: string[] = [];
    const sync = createMatchSync({
      matchId,
      environment: env.value,
      ticket: async () => {
        throw new Error("no websocket service");
      },
      getRevision: () => 1,
      recover: async (force) => {
        fetches.push(force);
      },
      onPending: (value) => pending.push(value),
      onStatus: (status) => statuses.push(status),
    });
    await flush();
    expect(pending).toEqual([]);
    expect(statuses.at(-1)).toBe("disconnected");
    sync.retry();
    await flush();
    expect(fetches).toEqual([true]);
    expect(pending).toEqual([true, false]);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetches).toEqual([true]);
    sync.dispose();
  });

  it("readiness coalesces its announced revision and disconnects never mark HTTP recovery pending", async () => {
    const env = environment();
    let revision = 1;
    const fetches: boolean[] = [];
    const pending: boolean[] = [];
    const sync = createMatchSync({
      matchId,
      environment: env.value,
      ticket: async () => ticket(),
      getRevision: () => revision,
      recover: async (force) => {
        fetches.push(force);
        revision = 4;
      },
      onPending: (value) => pending.push(value),
    });
    await flush();
    env.socket(0).open();
    env.socket(0).ready(4);
    await flush();
    expect(fetches).toEqual([false]);
    expect(pending).toEqual([true, false]);
    env.socket(0).dispatchEvent(new Event("close"));
    expect(pending).toEqual([true, false]);
    sync.dispose();
  });

  it("does not start trailing HTTP reads when hidden; visible readiness catches up again", async () => {
    const env = environment();
    const initial = deferred<void>();
    let revision = 1;
    let fetches = 0;
    const sync = createMatchSync({
      matchId,
      environment: env.value,
      ticket: async () => ticket(),
      getRevision: () => revision,
      recover: async () => {
        fetches++;
        if (fetches === 1) await initial.promise;
        revision = fetches === 1 ? 2 : 3;
      },
    });
    await flush();
    env.socket(0).open();
    env.socket(0).ready(2);
    env.socket(0).changed(3);
    env.visibility(false);
    initial.resolve();
    await flush();
    expect(fetches).toBe(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetches).toBe(1);
    env.visibility(true);
    await flush();
    env.socket(1).open();
    env.socket(1).ready(3);
    await flush();
    expect(fetches).toBe(2);
    sync.dispose();
  });
});
