import { registerProgressionRoutes } from "./events/routes.js";
import { registerLiveReadRoutes } from "./editorial/read.js";
import { catalogForVersion } from "@oathfront/game-content";
import { clientIp } from "./client-ip.js";
import type { IpTrust } from "./client-ip.js";
import { inspectSupportedVersions } from "./maintenance/versions.js";
import type { VersionRegistry } from "./maintenance/versions.js";
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
import { deckService } from "./decks/service.js";
import { registerDeckRoutes } from "./decks/routes.js";
import { publicCatalog } from "./content/registry.js";
import type { Scheduler } from "./matches/commands.js";
import { mutationLifetime } from "./deadline.js";
import { PersistenceError } from "./matches/checkpoint.js";
import { verifyNeonJwt } from "./auth/neon-jwt.js";
import type { VerifiedIdentity } from "./auth/neon-jwt.js";
import { exchangeIdentity } from "./auth/exchange.js";
import { claimGuest } from "./auth/claim.js";
import { logout } from "./auth/logout.js";
export interface AppDependencies {
  ipTrust?: IpTrust;
  versionRegistry?: VersionRegistry;
  extendLifetime?: (work: Promise<unknown>) => void;
  verifyIdentity?: (token: string) => Promise<VerifiedIdentity>;
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
  const deadline = mutationLifetime(
    deps.commandDeadlineMs,
    deps.extendLifetime,
  );
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
    if (
      !(await inspectSupportedVersions(deps.pool, deps.versionRegistry))
        .canRelease
    )
      throw new PersistenceError("VERSION_UNSUPPORTED");
  });
  app.addHook("onRequest", async (req, reply) => {
    reply.header("Cache-Control", "no-store");
    if (
      req.url.startsWith("/api/v1/") &&
      deps.ipTrust &&
      deps.ipTrust.mode !== "direct"
    )
      clientIp(req.ip, req.headers, deps.ipTrust);
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
          req.routeOptions.url === "/api/v1/matches"
            ? "MATCH_CREATE"
            : "COMMAND",
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
    await limit(
      "GUEST_BOOTSTRAP",
      clientIp(req.ip, req.headers, deps.ipTrust ?? { mode: "direct" }),
    );
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
  async function authReply(
    reply: import("fastify").FastifyReply,
    issued: Awaited<ReturnType<typeof exchangeIdentity>>,
  ) {
    const value = await authenticate(
      deps.pool,
      `${cookieName}=${issued.token}`,
      deps.secret,
      now(),
    );
    return reply
      .header("Set-Cookie", cookie(issued.token, issued.expiresAt))
      .send(await sessionResponse(deps.pool, value, deps.secret));
  }
  app.post("/api/v1/auth/exchange", async (req, reply) => {
    const body = checked("AuthExchangeRequest", req.body);
    const identity = await (deps.verifyIdentity ?? verifyNeonJwt)(
      body.identityToken,
    );
    await limit("COMMAND", identity.subject);
    return authReply(
      reply,
      await exchangeIdentity(
        deps.pool,
        identity,
        body.commandId,
        deps.secret,
        now(),
        req.headers.cookie?.includes(cookieName + "=")
          ? { cookie: req.headers.cookie, csrf: req.headers["x-csrf-token"] }
          : undefined,
      ),
    );
  });
  app.post("/api/v1/auth/claim-guest", async (req, reply) => {
    const body = checked("ClaimGuestRequest", req.body);
    const identity = await (deps.verifyIdentity ?? verifyNeonJwt)(
      body.identityToken,
    );
    await limit("COMMAND", identity.subject);
    return authReply(
      reply,
      await claimGuest(
        deps.pool,
        { cookie: req.headers.cookie, csrf: req.headers["x-csrf-token"] },
        identity,
        body,
        deps.secret,
        now(),
      ),
    );
  });
  app.post("/api/v1/auth/logout", async (req, reply) => {
    checked("EmptyBody", req.body);
    const s = await session(req);
    requireCsrf(req.headers["x-csrf-token"], s.csrfHash);
    await logout(deps.pool, s, now());
    return reply
      .header("Set-Cookie", cookie("", new Date(0)))
      .code(204)
      .send();
  });
  app.get("/api/v1/session", async (req) =>
    sessionResponse(deps.pool, await session(req), deps.secret),
  );
  app.get("/api/v1/catalog/:version", async (req, reply) => {
    const params = checked("CatalogParams", req.params);
    if (!catalogForVersion(params.version))
      throw new HttpError(404, "NOT_FOUND");
    return reply
      .header("Cache-Control", "public, max-age=31536000, immutable")
      .send(publicCatalog(params.version));
  });
  registerProgressionRoutes(
    app,
    deps.pool,
    now,
    async (req, mutation) => {
      const s = await session(req);
      if (mutation) {
        requireCsrf(req.headers["x-csrf-token"], s.csrfHash);
        await limit("COMMAND", s.principal.id);
        await limit("MATCH_CREATE", s.principal.id);
      }
      return s.principal;
    },
    deadline,
    deps.scheduler,
  );
  registerLiveReadRoutes(app, deps.pool, now);
  registerDeckRoutes(
    app,
    deckService(deps.pool, now),
    async (req, mutation) => {
      const s = await session(req);
      if (mutation) {
        requireCsrf(req.headers["x-csrf-token"], s.csrfHash);
        await limit("COMMAND", s.principal.id);
      }
      return s.principal;
    },
    deadline,
  );
  app.get("/health/live", async () => ({ status: "ok" }));
  app.get("/health/ready", async (_req, reply) => {
    try {
      await deps.pool.query("SELECT 1");
      await services.repository.registerRelease();
      if (
        !(await inspectSupportedVersions(deps.pool, deps.versionRegistry))
          .canRelease
      )
        throw new PersistenceError("VERSION_UNSUPPORTED");
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
