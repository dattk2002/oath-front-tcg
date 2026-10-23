import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { once } from "node:events";
import { randomBytes, randomUUID } from "node:crypto";
import { WebSocket } from "ws";
import { Pool } from "pg";
import type { QueryResult } from "pg";
import type { Duplex } from "node:stream";
import server from "../src/hosted.js";
import { harness, createBody, origin } from "./http-helpers.js";

harness();
const proxySecret = "hosted-test-proxy-secret-".repeat(3);
let address: string;
beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", process.env.TEST_DATABASE_URL!);
  vi.stubEnv("APP_ORIGIN", origin);
  vi.stubEnv("SESSION_SECRET", "hosted-test-session-secret-".repeat(3));
  vi.stubEnv("UI_PROXY_SECRET", proxySecret);
  vi.stubEnv("PUBLIC_REALTIME_URL", "ws://127.0.0.1:3001/realtime/matches");
  vi.stubEnv("VERCEL", "1");
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const bound = server.address();
  if (!bound || typeof bound === "string") throw Error("No listener");
  address = `http://127.0.0.1:${bound.port}`;
});
afterAll(() => {
  vi.unstubAllEnvs();
});

it("contains a client reset while hosted readiness is still pending", async () => {
  let releaseReady!: () => void, readinessStarted!: () => void;
  const held = new Promise<void>((resolve) => {
    releaseReady = resolve;
  });
  const started = new Promise<void>((resolve) => {
    readinessStarted = resolve;
  });
  const original = Pool.prototype.query as (
    query: string,
    values?: unknown[],
  ) => Promise<QueryResult>;
  let intercepted = false;
  const query = vi
    .spyOn(Pool.prototype, "query")
    .mockImplementation(async function (
      this: Pool,
      sql: string,
      values?: unknown[],
    ) {
      const result = await original.call(this, sql, values);
      if (!intercepted && sql.startsWith("INSERT INTO content_releases")) {
        intercepted = true;
        readinessStarted();
        await held;
      }
      return result;
    } as typeof Pool.prototype.query);
  let upgraded: Duplex | undefined;
  server.prependOnceListener("upgrade", (_request, socket) => {
    upgraded = socket;
  });
  const connection = new WebSocket(
    address.replace("http:", "ws:") + "/realtime/matches",
    { origin },
  );
  connection.on("error", () => undefined);
  const clientClosed = new Promise<void>((resolve) =>
    connection.once("close", () => resolve()),
  );
  try {
    await started;
    expect(() => upgraded!.emit("error", Error("ECONNRESET"))).not.toThrow();
    expect(upgraded!.destroyed).toBe(true);
    await clientClosed;
    releaseReady();
    expect((await fetch(address + "/health/live")).status).toBe(200);
  } finally {
    releaseReady();
    query.mockRestore();
    connection.terminate();
  }
});

it("closes the exported hosted server while an authorized WebSocket is still open", async () => {
  const ingress = {
    origin,
    "content-type": "application/json",
    "x-oathfront-proxy-token": proxySecret,
    "x-oathfront-client-ip": "127.0.0.1",
  };
  const guest = await fetch(address + "/api/v1/guest", {
    method: "POST",
    headers: ingress,
    body: JSON.stringify({
      commandId: randomUUID(),
      recoverySecret: randomBytes(32).toString("base64url"),
    }),
  });
  expect(guest.status).toBe(201);
  const session = await guest.json();
  const headers = {
    ...ingress,
    cookie: guest.headers.getSetCookie()[0]!.split(";")[0]!,
    "x-csrf-token": session.csrfToken,
  };
  const created = await fetch(address + "/api/v1/matches", {
    method: "POST",
    headers,
    body: JSON.stringify(createBody()),
  });
  expect(created.status).toBe(201);
  const matchId = (await created.json()).view.matchId;
  const ticketResponse = await fetch(
    address + `/api/v1/matches/${matchId}/realtime-ticket`,
    { method: "POST", headers, body: "{}" },
  );
  expect(ticketResponse.status).toBe(200);
  const ticket = await ticketResponse.json();
  const connection = new WebSocket(
    address.replace("http:", "ws:") + "/realtime/matches",
    { origin },
  );
  await once(connection, "open");
  const ready = once(connection, "message");
  connection.send(JSON.stringify({ type: "subscribe", token: ticket.token }));
  expect(JSON.parse(String((await ready)[0]))).toEqual({
    type: "ready",
    matchId,
    revision: 0,
  });
  const closed = new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  try {
    const completed = await Promise.race([
      closed.then(() => true),
      new Promise<false>((resolve) => setTimeout(() => resolve(false), 500)),
    ]);
    expect(completed).toBe(true);
  } finally {
    connection.terminate();
    await closed;
  }
});
