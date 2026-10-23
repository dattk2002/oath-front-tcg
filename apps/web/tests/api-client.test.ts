import { it, expect } from "vitest";
import { createApiClient } from "../src/features/match/api-client.js";
import { ApiError } from "../src/features/match/api-error.js";
it("strict client rejects private/unknown server data and keeps API requests same-origin", async () => {
  let url: RequestInfo | URL = "";
  let init: RequestInit | undefined;
  const api = createApiClient({
    csrfToken: "csrf-public",
    fetcher: async (input, options) => {
      url = input;
      init = options;
      return Response.json({ seed: "private" });
    },
  });
  await expect(
    api.command("10000000-0000-4000-8000-000000000001", {
      commandId: "20000000-0000-4000-8000-000000000001",
      expectedRevision: 2,
      action: { kind: "PASS_PHASE" },
    }),
  ).rejects.toThrow("INVALID_SERVER_RESPONSE");
  expect(url).toBe(
    "/api/v1/matches/10000000-0000-4000-8000-000000000001/commands",
  );
  expect(init?.credentials).toBe("same-origin");
  expect(init?.cache).toBe("no-store");
  expect(init?.headers).toEqual({
    "Content-Type": "application/json",
    "X-CSRF-Token": "csrf-public",
  });
});
it("canonical server errors preserve typed stale and uncertain distinctions", async () => {
  const api = createApiClient({
    fetcher: async () =>
      Response.json(
        {
          error: {
            code: "SESSION_EXPIRED",
            messageKey: "auth",
            requestId: "20000000-0000-4000-8000-000000000001",
            retryable: false,
            details: {},
          },
        },
        { status: 401 },
      ),
  });
  await expect(api.session()).rejects.toBeInstanceOf(ApiError);
});
it("requests a short-lived realtime ticket with bound CSRF, empty body and cancellation", async () => {
  const calls: { url: RequestInfo | URL; init: RequestInit | undefined }[] = [];
  const ticket = {
    url: "wss://api.example.test/realtime/matches",
    token: "short-lived-ticket",
    expiresAt: "2026-10-23T00:00:30.000Z",
  };
  const api = createApiClient({
    fetcher: async (url, init) => {
      calls.push({ url, init });
      return Response.json(ticket);
    },
  });
  api.bindSession({ csrfToken: "current-session-csrf" });
  const controller = new AbortController();
  await expect(
    api.realtimeTicket("match/id", controller.signal),
  ).resolves.toEqual(ticket);
  expect(calls).toHaveLength(1);
  expect(calls[0]!.url).toBe("/api/v1/matches/match%2Fid/realtime-ticket");
  expect(calls[0]!.init).toMatchObject({
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    body: "{}",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": "current-session-csrf",
    },
    signal: controller.signal,
  });
});
it("realtime ticket validation rejects unknown private data and reports session expiry", async () => {
  let unauthorized = 0;
  let expired = false;
  const api = createApiClient({
    onUnauthorized: () => {
      unauthorized++;
    },
    fetcher: async () =>
      expired
        ? Response.json(
            {
              error: {
                code: "SESSION_EXPIRED",
                messageKey: "auth",
                requestId: "20000000-0000-4000-8000-000000000001",
                retryable: false,
                details: {},
              },
            },
            { status: 401 },
          )
        : Response.json({
            url: "wss://api.example.test/realtime/matches",
            token: "ticket",
            expiresAt: "2026-10-23T00:00:30.000Z",
            seed: "private",
          }),
  });
  await expect(api.realtimeTicket("match")).rejects.toThrow(
    "INVALID_SERVER_RESPONSE",
  );
  expect(unauthorized).toBe(0);
  expired = true;
  await expect(api.realtimeTicket("match")).rejects.toBeInstanceOf(ApiError);
  expect(unauthorized).toBe(1);
});
it("cancels recovery snapshots and event scans with the owning match lifecycle", async () => {
  const signals: (AbortSignal | null | undefined)[] = [];
  const api = createApiClient({
    fetcher: async (_url, options) => {
      signals.push(options?.signal);
      throw new DOMException("Request aborted", "AbortError");
    },
  });
  const lifecycle = new AbortController();
  await expect(api.match("match", lifecycle.signal)).rejects.toMatchObject({
    name: "AbortError",
  });
  await expect(
    api.events("match", 0, 0, lifecycle.signal),
  ).rejects.toMatchObject({ name: "AbortError" });
  lifecycle.abort();
  expect(signals).toEqual([lifecycle.signal, lifecycle.signal]);
  expect(signals.every((signal) => signal?.aborted)).toBe(true);
});
it("notifies session generation changes once per new binding and supports unsubscribe", () => {
  const api = createApiClient({ csrfToken: "session-one" });
  const generations: number[] = [];
  const unsubscribe = api.subscribeSession(() =>
    generations.push(api.getSessionGeneration()),
  );
  expect(api.getSessionGeneration()).toBe(0);
  api.bindSession({ csrfToken: "session-one" });
  expect(generations).toEqual([]);
  api.bindSession({ csrfToken: "session-two" });
  api.bindSession(null);
  api.bindSession(null);
  expect(generations).toEqual([1, 2]);
  unsubscribe();
  api.bindSession({ csrfToken: "session-three" });
  expect(api.getSessionGeneration()).toBe(3);
  expect(generations).toEqual([1, 2]);
});

it("a delayed previous-session expiry cannot expire the newly bound session", async () => {
  let finish!: (value: Response) => void;
  let unauthorized = 0;
  let held = true;
  const expired = () =>
    Response.json(
      {
        error: {
          code: "SESSION_EXPIRED",
          messageKey: "auth",
          requestId: "20000000-0000-4000-8000-000000000001",
          retryable: false,
          details: {},
        },
      },
      { status: 401 },
    );
  const api = createApiClient({
    csrfToken: "old-session",
    onUnauthorized: () => {
      unauthorized++;
    },
    fetcher: async () =>
      held
        ? new Promise<Response>((resolve) => {
            finish = resolve;
          })
        : expired(),
  });
  const previousRequest = api.realtimeTicket("match");
  api.bindSession({ csrfToken: "renewed-session" });
  finish(expired());
  await expect(previousRequest).rejects.toBeInstanceOf(ApiError);
  expect(unauthorized).toBe(0);
  held = false;
  await expect(api.realtimeTicket("match")).rejects.toBeInstanceOf(ApiError);
  expect(unauthorized).toBe(1);
});
it("listeners installed for the new session do not receive the previous binding transition", () => {
  const api = createApiClient({ csrfToken: "session-one" });
  const notifications: string[] = [];
  api.subscribeSession(() => {
    notifications.push("previous");
    api.subscribeSession(() => notifications.push("new"));
  });
  api.bindSession({ csrfToken: "session-two" });
  expect(notifications).toEqual(["previous"]);
});
