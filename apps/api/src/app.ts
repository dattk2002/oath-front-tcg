import Fastify, { LogController } from "fastify";
import { canonicalJson } from "@oathfront/game-engine";
import type { Pool } from "@oathfront/db";
import { consumeRateLimit, rateLimitKey } from "@oathfront/db";
import { randomUUID } from "node:crypto";
import { HttpError, checked, output } from "./http.js";
import { bootstrapGuest } from "./auth/guest.js";
import {
  authenticate,
  cookie,
  sessionResponse,
  cookieName,
} from "./auth/sessions.js";
import { requireOrigin, requireCsrf } from "./auth/csrf.js";
import { matchService } from "./matches/service.js";
import { registerMatchRoutes } from "./matches/routes.js";
import { publicCatalog } from "./content/registry.js";
import type { Scheduler } from "./matches/commands.js";
import { mutationLifetime } from "./deadline.js";
import { PersistenceError } from "./matches/checkpoint.js";
export interface AppDependencies {
  pool: Pool;
  origin: string;
  secret: string;
  now?: () => Date;
  scheduler?: Scheduler;
  cpuClock?: () => number;
  logger?: boolean;
  commandDeadlineMs?: number;
}
export function buildApp(deps: AppDependencies) {
  if (deps.secret.length < 32 || new URL(deps.origin).origin !== deps.origin)
    throw new Error("Explicit origin and strong server secret required");
  const now = deps.now ?? (() => new Date());
  const app = Fastify({
    bodyLimit: 32768,
    logger: deps.logger ?? false,
    logController: new LogController({ disableRequestLogging: true }),
    genReqId: () => randomUUID(),
    requestTimeout: 5000,
  });
  const deadline = mutationLifetime(deps.commandDeadlineMs);
  app.addHook("onClose", async () => {
    await deadline.drain();
  });
  app.setReplySerializer((payload) => canonicalJson(payload));
  const services = matchService(deps.pool, {
    now,
    ...(deps.scheduler ? { scheduler: deps.scheduler } : {}),
    ...(deps.cpuClock ? { cpuClock: deps.cpuClock } : {}),
  });
  app.addHook("onReady", async () => {
    await services.repository.registerRelease();
  });
  app.addHook("onRequest", async (req, reply) => {
    reply.header("Cache-Control", "no-store");
    reply.header("X-Content-Type-Options", "nosniff");
    if (
      req.url.startsWith("/api/v1/") &&
      !["GET", "HEAD", "OPTIONS"].includes(req.method)
    )
      requireOrigin(req.headers.origin, deps.origin);
  });
  async function limit(
    scope: "COMMAND" | "MATCH_CREATE" | "GUEST_BOOTSTRAP",
    identity: string,
  ) {
    const r = await consumeRateLimit(
      deps.pool,
      scope,
      rateLimitKey(scope, identity, deps.secret),
      { now },
    );
    if (!r.allowed)
      throw new HttpError(429, "RATE_LIMITED", {
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((r.resetAt.getTime() - now().getTime()) / 1000),
        ),
      });
  }
  async function session(req: import("fastify").FastifyRequest) {
    return authenticate(deps.pool, req.headers.cookie, deps.secret, now());
  }
  registerMatchRoutes(
    app,
    services,
    async (req, mutation) => {
      const s = await session(req);
      if (mutation) {
        requireCsrf(req.headers["x-csrf-token"], s.csrfHash);
        await limit(
          req.url === "/api/v1/matches" ? "MATCH_CREATE" : "COMMAND",
          s.principal.id,
        );
      }
      return s.principal;
    },
    deadline,
  );
  app.post("/api/v1/guest", async (req, reply) => {
    const body = checked("GuestRequest", req.body);
    if (req.headers.cookie?.includes(cookieName + "=")) {
      const s = await session(req);
      requireCsrf(req.headers["x-csrf-token"], s.csrfHash);
      throw new HttpError(403, "FORBIDDEN");
    }
    await limit("GUEST_BOOTSTRAP", req.ip);
    const issued = await bootstrapGuest(deps.pool, body, deps.secret, now());
    const value = await authenticate(
      deps.pool,
      `${cookieName}=${issued.token}`,
      deps.secret,
      now(),
    );
    return reply
      .header("Set-Cookie", cookie(issued.token, issued.expiresAt))
      .code(201)
      .send(await sessionResponse(deps.pool, value, deps.secret));
  });
  app.get("/api/v1/session", async (req) =>
    sessionResponse(deps.pool, await session(req), deps.secret),
  );
  app.get("/api/v1/catalog/:version", async (req, reply) => {
    const params = checked("CatalogParams", req.params);
    if (params.version !== "core_v1") throw new HttpError(404, "NOT_FOUND");
    return reply
      .header("Cache-Control", "public, max-age=31536000, immutable")
      .send(publicCatalog());
  });
  app.get("/api/v1/decks", async (req) => {
    await session(req);
    return output("DeckList", {
      items: [],
      presets: publicCatalog().presets,
      nextCursor: null,
    });
  });
  app.get("/health/live", async () => ({ status: "ok" }));
  app.get("/health/ready", async (_req, reply) => {
    try {
      await deps.pool.query("SELECT 1");
      await services.repository.registerRelease();
      return { status: "ready" };
    } catch {
      return reply.code(503).send({ status: "not_ready" });
    }
  });
  app.setNotFoundHandler(async () => {
    throw new HttpError(404, "NOT_FOUND");
  });
  app.setErrorHandler((error, req, reply) => {
    let err = error instanceof HttpError ? error : null;
    if (!err && error instanceof PersistenceError) {
      if (error.code === "NOT_FOUND") err = new HttpError(404, "NOT_FOUND");
      else if (error.code === "MATCH_DETAILS_EXPIRED")
        err = new HttpError(410, "MATCH_DETAILS_EXPIRED", {
          summaryAvailable: true,
        });
      else if (error.code === "VERSION_UNSUPPORTED")
        err = new HttpError(409, "VERSION_UNSUPPORTED");
    }
    if (
      !err &&
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "FST_ERR_HANDLER_TIMEOUT"
    )
      err = new HttpError(503, "TEMPORARILY_UNAVAILABLE");
    if (
      !err &&
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      error.statusCode === 400
    )
      err = new HttpError(400, "VALIDATION_FAILED", {
        issues: [{ path: "/", rule: "json" }],
      });
    if (
      !err &&
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      error.statusCode === 413
    )
      err = new HttpError(400, "VALIDATION_FAILED", {
        issues: [{ path: "/", rule: "bodySize" }],
      });
    err ??= new HttpError(500, "INTERNAL");
    // Deliberately no request/body/headers/raw exception serialization.
    req.log.info({ requestId: req.id, code: err.code }, "request rejected");
    const response = output("ErrorResponse", {
      error: {
        code: err.code,
        messageKey: `error.${err.code}`,
        requestId: req.id,
        retryable: err.status >= 500 || err.status === 429,
        details: err.details,
      },
    });
    void reply.code(err.status).send(response);
  });
  return Object.assign(app, {
    services,
    inFlightMutations: deadline.inFlightMutations,
  });
}
