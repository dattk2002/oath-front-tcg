import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { once } from "node:events";
import { randomBytes, randomUUID } from "node:crypto";
import { buildApp } from "../src/app.js";
import { WebSocket } from "ws";
import { Client } from "pg";
import { validateWire } from "@oathfront/contracts";
import { harness, createBody, origin } from "./http-helpers.js";

const h = harness({
  realtime: {
    url: "ws://127.0.0.1:3001/realtime/matches",
    databaseUrl: process.env.TEST_DATABASE_URL!,
  },
});
let address: string;
const sockets = new Set<WebSocket>();
beforeAll(async () => {
  await h.app.listen({ port: 0, host: "127.0.0.1" });
  const bound = h.app.server.address();
  if (!bound || typeof bound === "string") throw Error("No listener");
  address = `ws://127.0.0.1:${bound.port}/realtime/matches`;
});
afterAll(() => {
  for (const socket of sockets) socket.terminate();
});
async function fixture() {
  const guest = await h.guest();
  const created = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(guest),
    payload: createBody(),
  });
  expect(created.statusCode).toBe(201);
  const matchId = created.json().view.matchId as string;
  const ticket = () =>
    h.app.inject({
      method: "POST",
      url: `/api/v1/matches/${matchId}/realtime-ticket`,
      headers: h.headers(guest),
      payload: {},
    });
  return { guest, matchId, ticket };
}
function socket(url = address, allowedOrigin = origin) {
  const connection = new WebSocket(url, { origin: allowedOrigin });
  sockets.add(connection);
  connection.on("close", () => sockets.delete(connection));
  return connection;
}
async function subscribed(token: string) {
  const connection = socket();
  await once(connection, "open");
  const message = once(connection, "message");
  connection.send(JSON.stringify({ type: "subscribe", token }));
  return { connection, ready: JSON.parse(String((await message)[0])) };
}

it("issues a short, schema-closed subscribe ticket only after session, CSRF, Origin and ownership checks", async () => {
  const f = await fixture();
  const issued = await f.ticket();
  expect(issued.statusCode).toBe(200);
  expect(validateWire("RealtimeTicket", issued.json())).toBe(true);
  expect(Object.keys(issued.json()).sort()).toEqual([
    "expiresAt",
    "token",
    "url",
  ]);
  expect(issued.json().url).toBe("ws://127.0.0.1:3001/realtime/matches");
  expect(Date.parse(issued.json().expiresAt) - Date.now()).toBeLessThanOrEqual(
    30000,
  );
  expect(Date.parse(issued.json().expiresAt) - Date.now()).toBeGreaterThan(0);
  const other = await h.guest();
  for (const [headers, payload, status] of [
    [{ origin }, {}, 401],
    [{ ...h.headers(f.guest), origin: "https://evil.test" }, {}, 403],
    [{ ...h.headers(f.guest), "x-csrf-token": "wrong" }, {}, 403],
    [h.headers(other), {}, 404],
    [h.headers(f.guest), { action: "DRAW" }, 400],
  ] as const) {
    const response = await h.app.inject({
      method: "POST",
      url: `/api/v1/matches/${f.matchId}/realtime-ticket`,
      headers,
      payload,
    });
    expect(response.statusCode).toBe(status);
  }
});

it("sends only public ready/revision messages and receives committed changes", async () => {
  const f = await fixture();
  const issued = await f.ticket();
  expect(issued.statusCode).toBe(200);
  const { connection, ready } = await subscribed(issued.json().token);
  expect(ready).toEqual({ type: "ready", matchId: f.matchId, revision: 0 });
  const next = once(connection, "message");
  await h.owner.query(
    "WITH updated AS (UPDATE matches SET revision=revision+1 WHERE id=$1 RETURNING revision) UPDATE match_checkpoints SET revision=(SELECT revision FROM updated) WHERE match_id=$1",
    [f.matchId],
  );
  expect(JSON.parse(String((await next)[0]))).toEqual({
    type: "changed",
    matchId: f.matchId,
    revision: 1,
  });
  connection.terminate();
});

it("closes an authorized stream on owner transfer even if revision stays unchanged", async () => {
  const f = await fixture();
  const other = await h.guest();
  const issued = await f.ticket();
  expect(issued.statusCode).toBe(200);
  const { connection } = await subscribed(issued.json().token);
  const closed = once(connection, "close");
  await h.owner.query("UPDATE matches SET human_principal_id=$1 WHERE id=$2", [
    other.id,
    f.matchId,
  ]);
  expect((await closed)[0]).toBe(1008);
});

it("revalidates session revocation before sending an invalidation", async () => {
  const f = await fixture();
  const issued = await f.ticket();
  expect(issued.statusCode).toBe(200);
  const { connection } = await subscribed(issued.json().token);
  const messages: unknown[] = [];
  connection.on("message", (data) => messages.push(JSON.parse(String(data))));
  const closed = once(connection, "close");
  await h.owner.query(
    "UPDATE app_sessions SET revoked_at=now() WHERE principal_id=$1",
    [f.guest.id],
  );
  await h.owner.query(
    "WITH updated AS (UPDATE matches SET revision=revision+1 WHERE id=$1 RETURNING revision) UPDATE match_checkpoints SET revision=(SELECT revision FROM updated) WHERE match_id=$1",
    [f.matchId],
  );
  expect((await closed)[0]).toBe(1008);
  expect(messages).toEqual([]);
});

it("rejects expired, tampered and revoked tickets without a ready message", async () => {
  const f = await fixture();
  const issued = await f.ticket();
  expect(issued.statusCode).toBe(200);
  for (const token of [issued.json().token + "x", "garbage"]) {
    const connection = socket();
    await once(connection, "open");
    const closed = once(connection, "close");
    connection.send(JSON.stringify({ type: "subscribe", token }));
    expect((await closed)[0]).toBe(1008);
  }
  h.setTime(new Date(Date.parse(issued.json().expiresAt) + 1));
  const connection = socket();
  await once(connection, "open");
  const closed = once(connection, "close");
  connection.send(
    JSON.stringify({ type: "subscribe", token: issued.json().token }),
  );
  expect((await closed)[0]).toBe(1008);
});

it("rejects wrong Origin and query-token upgrade requests", async () => {
  for (const connection of [
    socket(address, "https://evil.test"),
    socket(address + "?token=never"),
  ]) {
    connection.on("error", () => undefined);
    const [, response] = await once(connection, "unexpected-response");
    expect(response.statusCode).toBe(403);
    connection.terminate();
  }
});

it("notifies after commit only, ignores no-op updates and includes owner changes", async () => {
  const listener = new Client({
    connectionString: process.env.TEST_DATABASE_URL,
  });
  await listener.connect();
  const messages: Record<string, unknown>[] = [];
  listener.on("notification", (notification) =>
    messages.push(JSON.parse(notification.payload!)),
  );
  await listener.query("LISTEN oathfront_match_changed");
  const settle = () => new Promise((resolve) => setTimeout(resolve, 80));
  try {
    const f = await fixture();
    await settle();
    expect(messages).toEqual([
      { matchId: f.matchId, revision: 0, ownerId: f.guest.id },
    ]);
    messages.length = 0;
    const tx = await h.owner.connect();
    try {
      await tx.query("BEGIN");
      await tx.query("UPDATE matches SET status='PAUSED' WHERE id=$1", [
        f.matchId,
      ]);
      await settle();
      expect(messages).toEqual([]);
      await tx.query("ROLLBACK");
      await settle();
      expect(messages).toEqual([]);
      await tx.query("BEGIN");
      await tx.query("UPDATE matches SET status='PAUSED' WHERE id=$1", [
        f.matchId,
      ]);
      await tx.query("COMMIT");
      await settle();
      expect(messages).toEqual([
        { matchId: f.matchId, revision: 0, ownerId: f.guest.id },
      ]);
      messages.length = 0;
      await tx.query(
        "UPDATE matches SET revision=revision,updated_at=now() WHERE id=$1",
        [f.matchId],
      );
      await settle();
      expect(messages).toEqual([]);
      const other = await h.guest();
      await tx.query("UPDATE matches SET human_principal_id=$1 WHERE id=$2", [
        other.id,
        f.matchId,
      ]);
      await settle();
      expect(messages).toEqual([
        { matchId: f.matchId, revision: 0, ownerId: other.id },
      ]);
    } finally {
      tx.release();
    }
  } finally {
    await listener.end();
  }
});

it("rejects revoked tickets at subscription and does not create a database listener", async () => {
  const f = await fixture();
  const issued = await f.ticket();
  await h.owner.query(
    "UPDATE app_sessions SET revoked_at=now() WHERE principal_id=$1",
    [f.guest.id],
  );
  const connection = socket();
  await once(connection, "open");
  const messages: unknown[] = [];
  connection.on("message", (data) => messages.push(data));
  const closed = once(connection, "close");
  connection.send(
    JSON.stringify({ type: "subscribe", token: issued.json().token }),
  );
  expect((await closed)[0]).toBe(1008);
  expect(messages).toEqual([]);
  const active = await h.owner.query(
    "SELECT count(*)::int AS count FROM pg_stat_activity WHERE application_name='oathfront-realtime' AND datname=current_database()",
  );
  expect(active.rows[0].count).toBe(0);
});

it("closes subscribers on LISTEN loss so reconnects read the latest revision", async () => {
  const f = await fixture();
  const issued = await f.ticket();
  const { connection } = await subscribed(issued.json().token);
  const closed = once(connection, "close");
  await h.owner.query(
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name='oathfront-realtime' AND datname=current_database()",
  );
  expect((await closed)[0]).toBe(1012);
  await h.owner.query(
    "WITH updated AS (UPDATE matches SET revision=revision+1 WHERE id=$1 RETURNING revision) UPDATE match_checkpoints SET revision=(SELECT revision FROM updated) WHERE match_id=$1",
    [f.matchId],
  );
  const renewed = await f.ticket();
  const next = await subscribed(renewed.json().token);
  expect(next.ready).toEqual({
    type: "ready",
    matchId: f.matchId,
    revision: 1,
  });
  const nextClosed = once(next.connection, "close");
  next.connection.close();
  await nextClosed;
  await new Promise((resolve) => setTimeout(resolve, 80));
  const active = await h.owner.query(
    "SELECT count(*)::int AS count FROM pg_stat_activity WHERE application_name='oathfront-realtime' AND datname=current_database()",
  );
  expect(active.rows[0].count).toBe(0);
});

it("bounds active sockets per session and refuses application commands and oversized frames", async () => {
  const f = await fixture();
  const issued = await f.ticket();
  const active: WebSocket[] = [];
  try {
    for (let i = 0; i < 4; i++)
      active.push((await subscribed(issued.json().token)).connection);
    const extra = socket();
    await once(extra, "open");
    const closed = once(extra, "close");
    extra.send(
      JSON.stringify({ type: "subscribe", token: issued.json().token }),
    );
    expect((await closed)[0]).toBe(1013);
    const command = once(active[0]!, "close");
    active[0]!.send(JSON.stringify({ type: "DRAW", commandId: "not-http" }));
    expect((await command)[0]).toBe(1008);
    const oversized = once(active[1]!, "close");
    active[1]!.send("x".repeat(2049));
    await oversized;
    expect(
      (
        await h.owner.query("SELECT revision FROM matches WHERE id=$1", [
          f.matchId,
        ])
      ).rows[0].revision,
    ).toBe("0");
  } finally {
    for (const connection of active) connection.terminate();
  }
});

it("closes a socket when its authenticated session expires", async () => {
  const f = await fixture();
  const expiresAt = new Date(Date.now() + 500);
  h.setTime(new Date());
  await h.owner.query(
    "UPDATE app_sessions SET expires_at=$1 WHERE principal_id=$2",
    [expiresAt, f.guest.id],
  );
  const issued = await f.ticket();
  expect(issued.json().expiresAt).toBe(expiresAt.toISOString());
  const { connection } = await subscribed(issued.json().token);
  expect((await once(connection, "close"))[0]).toBe(1008);
});

it("times out an unauthenticated socket after the short handshake deadline", async () => {
  const connection = socket();
  await once(connection, "open");
  expect((await once(connection, "close"))[0]).toBe(1008);
}, 8000);

it("rate limits ticket issuance separately from authoritative commands", async () => {
  const f = await fixture();
  for (let i = 0; i < 30; i++) expect((await f.ticket()).statusCode).toBe(200);
  const limited = await f.ticket();
  expect(limited.statusCode).toBe(429);
  expect(limited.json().error.code).toBe("RATE_LIMITED");
  expect(
    (
      await h.app.inject({
        url: `/api/v1/matches/${f.matchId}`,
        headers: h.headers(f.guest),
      })
    ).statusCode,
  ).toBe(200);
}, 15000);

it("queues a committed change between the fresh authorization read and ready", async () => {
  const f = await fixture();
  const issued = await f.ticket();
  let releaseRead!: () => void, readStarted!: () => void;
  const held = new Promise<void>((resolve) => {
    releaseRead = resolve;
  });
  const started = new Promise<void>((resolve) => {
    readStarted = resolve;
  });
  const original = h.pool.query.bind(h.pool);
  let reads = 0;
  const intercept = vi.spyOn(h.pool, "query").mockImplementation((async (
    query: string,
    values?: unknown[],
  ) => {
    const result = await original(query, values);
    if (query.includes("LEAST(s.expires_at") && ++reads === 2) {
      readStarted();
      await held;
    }
    return result;
  }) as typeof h.pool.query);
  const connection = socket();
  try {
    await once(connection, "open");
    const messages: unknown[] = [];
    const received = new Promise<void>((resolve) =>
      connection.on("message", (data) => {
        messages.push(JSON.parse(String(data)));
        if (messages.length === 2) resolve();
      }),
    );
    connection.send(
      JSON.stringify({ type: "subscribe", token: issued.json().token }),
    );
    await started;
    await h.owner.query(
      "WITH updated AS (UPDATE matches SET revision=revision+1 WHERE id=$1 RETURNING revision) UPDATE match_checkpoints SET revision=(SELECT revision FROM updated) WHERE match_id=$1",
      [f.matchId],
    );
    await new Promise((resolve) => setTimeout(resolve, 80));
    releaseRead();
    await received;
    expect(messages).toEqual([
      { type: "ready", matchId: f.matchId, revision: 0 },
      { type: "changed", matchId: f.matchId, revision: 1 },
    ]);
  } finally {
    releaseRead();
    intercept.mockRestore();
    connection.terminate();
  }
});

it("shares committed invalidations across two independent API instances", async () => {
  const secret = "cross-instance-session-secret-".repeat(2);
  const config = {
    pool: h.pool,
    origin,
    secret,
    realtime: {
      url: "ws://127.0.0.1:3001/realtime/matches",
      databaseUrl: process.env.TEST_DATABASE_URL!,
    },
  };
  const first = buildApp(config),
    second = buildApp(config);
  const active: WebSocket[] = [];
  try {
    await first.listen({ port: 0, host: "127.0.0.1" });
    await second.listen({ port: 0, host: "127.0.0.1" });
    const bootstrapped = await first.inject({
      method: "POST",
      url: "/api/v1/guest",
      headers: { origin },
      payload: {
        commandId: randomUUID(),
        recoverySecret: randomBytes(32).toString("base64url"),
      },
    });
    const headers = {
      origin,
      cookie: String(bootstrapped.headers["set-cookie"]).split(";")[0]!,
      "x-csrf-token": bootstrapped.json().csrfToken,
    };
    const created = await first.inject({
      method: "POST",
      url: "/api/v1/matches",
      headers,
      payload: createBody(),
    });
    const matchId = created.json().view.matchId;
    const issued = await first.inject({
      method: "POST",
      url: `/api/v1/matches/${matchId}/realtime-ticket`,
      headers,
      payload: {},
    });
    for (const instance of [first, second]) {
      const bound = instance.server.address();
      if (!bound || typeof bound === "string") throw Error("No listener");
      const connection = socket(
        `ws://127.0.0.1:${bound.port}/realtime/matches`,
      );
      active.push(connection);
      await once(connection, "open");
      const ready = once(connection, "message");
      connection.send(
        JSON.stringify({ type: "subscribe", token: issued.json().token }),
      );
      expect(JSON.parse(String((await ready)[0]))).toEqual({
        type: "ready",
        matchId,
        revision: 0,
      });
    }
    const pending = active.map((connection) => once(connection, "message"));
    await h.owner.query(
      "WITH updated AS (UPDATE matches SET revision=revision+1 WHERE id=$1 RETURNING revision) UPDATE match_checkpoints SET revision=(SELECT revision FROM updated) WHERE match_id=$1",
      [matchId],
    );
    for (const received of await Promise.all(pending))
      expect(JSON.parse(String(received[0]))).toEqual({
        type: "changed",
        matchId,
        revision: 1,
      });
  } finally {
    for (const connection of active) connection.terminate();
    await first.close();
    await second.close();
  }
});

it("does not overflow the session timer for credentials valid beyond the stream lifetime", async () => {
  const f = await fixture();
  const expiresAt = new Date(Date.now() + 40 * 86400000);
  await h.owner.query("UPDATE principals SET expires_at=$1 WHERE id=$2", [
    expiresAt,
    f.guest.id,
  ]);
  await h.owner.query(
    "UPDATE app_sessions SET expires_at=$1 WHERE principal_id=$2",
    [expiresAt, f.guest.id],
  );
  const issued = await f.ticket();
  const { connection } = await subscribed(issued.json().token);
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(connection.readyState).toBe(WebSocket.OPEN);
  connection.terminate();
});

it("caps unauthenticated upgrades without allocating LISTEN connections", async () => {
  const waiting: WebSocket[] = [];
  try {
    for (let i = 0; i < 32; i++) {
      const connection = socket();
      waiting.push(connection);
      await once(connection, "open");
    }
    const excess = socket();
    excess.on("error", () => undefined);
    const [, response] = await once(excess, "unexpected-response");
    expect(response.statusCode).toBe(503);
    excess.terminate();
    const active = await h.owner.query(
      "SELECT count(*)::int AS count FROM pg_stat_activity WHERE application_name='oathfront-realtime' AND datname=current_database()",
    );
    expect(active.rows[0].count).toBe(0);
  } finally {
    for (const connection of waiting) connection.terminate();
  }
});
