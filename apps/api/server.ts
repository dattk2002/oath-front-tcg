// Recognized Vercel Fastify entrypoint. Its adapter intercepts listen(), so use its Node handler contract.
import "fastify";
import type { IncomingMessage, ServerResponse } from "node:http";
import { waitUntil, attachDatabasePool } from "@vercel/functions";
import { createPool } from "@oathfront/db";
import { buildApp } from "./src/app.js";
export const config = { maxDuration: 30 };
let app: ReturnType<typeof buildApp> | undefined;
function application() {
  if (app) return app;
  const { DATABASE_URL, APP_ORIGIN, SESSION_SECRET, UI_PROXY_SECRET } =
    process.env;
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
  const pool = createPool({
    connectionString: DATABASE_URL,
    purpose: "runtime",
  });
  attachDatabasePool(pool);
  app = buildApp({
    pool,
    origin: APP_ORIGIN,
    secret: SESSION_SECRET,
    logger: true,
    ipTrust: { mode: "hosted-proxy", secret: UI_PROXY_SECRET },
    extendLifetime: waitUntil,
  });
  return app;
}
export default async function handler(
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
