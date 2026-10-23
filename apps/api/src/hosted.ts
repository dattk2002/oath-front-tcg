// Bundle workspace packages before Vercel traces the Node handler.
import "fastify";
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Duplex } from "node:stream";
import type { Pool } from "@oathfront/db";
import { waitUntil, attachDatabasePool } from "@vercel/functions";
import { createPool } from "@oathfront/db";
import { buildApp } from "./app.js";
import { guardUpgradeSocket, rejectUpgrade } from "./realtime/upgrade.js";
export const config = { maxDuration: 300 };
let app: ReturnType<typeof buildApp> | undefined;
let pool: Pool | undefined;
let closing = false;
function application() {
  if (closing) throw Error("API closing");
  if (app) return app;
  const {
    DATABASE_URL,
    APP_ORIGIN,
    SESSION_SECRET,
    UI_PROXY_SECRET,
    PUBLIC_REALTIME_URL,
  } = process.env;
  if (
    !DATABASE_URL ||
    !APP_ORIGIN ||
    !SESSION_SECRET ||
    !UI_PROXY_SECRET ||
    UI_PROXY_SECRET.length < 32 ||
    SESSION_SECRET.length < 32 ||
    new URL(APP_ORIGIN).origin !== APP_ORIGIN ||
    process.env.VERCEL !== "1"
  )
    throw Error("Hosted API configuration required");
  pool = createPool({
    connectionString: DATABASE_URL,
    purpose: "runtime",
  });
  attachDatabasePool(pool);
  app = buildApp({
    pool,
    origin: APP_ORIGIN,
    secret: SESSION_SECRET,
    logger: true,
    ...(PUBLIC_REALTIME_URL
      ? { realtime: { url: PUBLIC_REALTIME_URL, databaseUrl: DATABASE_URL } }
      : {}),
    ipTrust: { mode: "hosted-proxy", secret: UI_PROXY_SECRET },
    extendLifetime: waitUntil,
  });
  return app;
}
export async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    const api = application();
    await api.ready();
    api.server.emit("request", request, response);
  } catch {
    response.writeHead(503, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    response.end('{"error":"API_UNAVAILABLE"}');
  }
}

// Vercel's native WebSocket adapter needs the actual Node server export.
const server = createServer(handler);
const upgrades = new Set<Duplex>();
server.on("upgrade", (request, socket, head) => {
  const releaseGuard = guardUpgradeSocket(socket);
  if (socket.destroyed) {
    releaseGuard();
    return;
  }
  if (closing) {
    rejectUpgrade(socket, 503);
    return;
  }
  upgrades.add(socket);
  socket.once("close", () => upgrades.delete(socket));
  void (async () => {
    try {
      const api = application();
      await api.ready();
      if (!api.server.listenerCount("upgrade"))
        throw Error("Realtime unavailable");
      if (socket.destroyed) return;
      api.server.emit("upgrade", request, socket, head);
      releaseGuard();
    } catch {
      rejectUpgrade(socket, 503);
    }
  })();
});
const closeHttp = server.close.bind(server);
let cleanup: Promise<void> | undefined;
server.close = (callback) => {
  closing = true;
  // HTTP close waits for upgraded sockets, so dispose them before waiting for it.
  for (const socket of upgrades) socket.destroy();
  cleanup ??= (async () => {
    try {
      await app?.close();
    } finally {
      await pool?.end();
    }
  })();
  // Cleanup can finish before HTTP drain; handle rejection immediately as well.
  void cleanup.catch(() => undefined);
  closeHttp((error) => {
    void cleanup!.then(
      () => callback?.(error),
      () => callback?.(error ?? Error("API shutdown failed")),
    );
  });
  return server;
};
export default server;
