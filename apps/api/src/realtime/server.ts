import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocket, WebSocketServer } from "ws";
import type { Pool } from "@oathfront/db";
import type { RealtimeMessage } from "@oathfront/contracts";
import { HttpError } from "../http.js";
import type { RealtimeConfig } from "./config.js";
import { realtimeUrl } from "./config.js";
import { MatchListener } from "./listener.js";
import { guardUpgradeSocket, rejectUpgrade } from "./upgrade.js";
import { authorizeSubscription } from "./authorization.js";
import { verifyTicket } from "./tickets.js";
import type { TicketClaims } from "./tickets.js";
interface Dependencies {
  pool: Pool;
  origin: string;
  secret: string;
  realtime: RealtimeConfig;
  now?: () => Date;
}
/** Realtime carries invalidations only; HTTP remains the authoritative state/command surface. */
export function attachMatchRealtime(server: Server, deps: Dependencies) {
  realtimeUrl(deps.realtime.url);
  const listener = new MatchListener(deps.realtime.databaseUrl);
  const now = deps.now ?? (() => new Date());
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 2048,
    perMessageDeflate: false,
  });
  const sessions = new Map<string, number>();
  const alive = new Map<WebSocket, boolean>();
  let unauthenticated = 0;
  let disposed = false;
  const upgrade = (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const releaseGuard = guardUpgradeSocket(socket);
    if (socket.destroyed) {
      releaseGuard();
      return;
    }
    if (
      disposed ||
      request.method !== "GET" ||
      request.url !== "/realtime/matches" ||
      request.headers.origin !== deps.origin ||
      request.headers["sec-websocket-protocol"]
    ) {
      rejectUpgrade(socket);
      return;
    }
    if (wss.clients.size >= 128 || unauthenticated >= 32) {
      rejectUpgrade(socket, 503);
      return;
    }
    try {
      wss.handleUpgrade(request, socket, head, (peer) => {
        releaseGuard();
        connected(peer);
      });
    } catch {
      socket.destroy();
    }
  };
  function connected(peer: WebSocket) {
    unauthenticated++;
    alive.set(peer, true);
    let closed = false,
      started = false,
      ready = false,
      dirty = false,
      draining = false;
    let claims: TicketClaims | undefined;
    let sessionKey: string | undefined;
    let release: (() => void) | undefined;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    let termination: ReturnType<typeof setTimeout> | undefined;
    let revision = -1;
    const handshake = setTimeout(() => close(1008), 5000);
    const rotation = setTimeout(() => close(1000), 240000);
    handshake.unref();
    rotation.unref();
    function cleanup() {
      if (closed) return;
      closed = true;
      clearTimeout(handshake);
      clearTimeout(rotation);
      clearTimeout(expiry);
      alive.delete(peer);
      release?.();
      release = undefined;
      if (sessionKey) {
        const count = (sessions.get(sessionKey) ?? 1) - 1;
        if (count) sessions.set(sessionKey, count);
        else sessions.delete(sessionKey);
      } else unauthenticated--;
    }
    function close(code: number) {
      if (closed) return;
      cleanup();
      peer.close(code);
      termination = setTimeout(() => peer.terminate(), 1000);
      termination.unref();
    }
    function send(type: RealtimeMessage["type"], currentRevision: number) {
      if (closed || peer.readyState !== WebSocket.OPEN) return;
      if (peer.bufferedAmount > 65536) {
        close(1013);
        return;
      }
      const message: RealtimeMessage = {
        type,
        matchId: claims!.matchId,
        revision: currentRevision,
      };
      peer.send(JSON.stringify(message));
      revision = currentRevision;
    }
    async function drain() {
      if (!ready || draining || closed) return;
      draining = true;
      try {
        while (dirty && !closed) {
          dirty = false;
          const authorized = await authorizeSubscription(
            deps.pool,
            claims!,
            now(),
          );
          if (authorized.revision > revision)
            send("changed", authorized.revision);
        }
      } catch (error) {
        close(error instanceof HttpError ? 1008 : 1013);
      } finally {
        draining = false;
      }
    }
    peer.on("pong", () => {
      if (!closed) alive.set(peer, true);
    });
    peer.on("error", () => {
      cleanup();
      peer.terminate();
    });
    peer.on("close", () => {
      cleanup();
      clearTimeout(termination);
    });
    peer.on("message", (data, binary) => {
      if (started || binary) {
        close(1008);
        return;
      }
      started = true;
      try {
        const frame = JSON.parse(data.toString());
        if (
          !frame ||
          Object.keys(frame).sort().join() !== "token,type" ||
          frame.type !== "subscribe"
        )
          throw Error("Invalid subscription");
        claims = verifyTicket(frame.token, deps.secret, now());
      } catch {
        close(1008);
        return;
      }
      void (async () => {
        try {
          // Invalid/revoked sessions must never allocate a LISTEN connection.
          await authorizeSubscription(deps.pool, claims!, now());
          if (closed) return;
          if ((sessions.get(claims!.sessionId) ?? 0) >= 4) {
            close(1013);
            return;
          }
          sessionKey = claims!.sessionId;
          sessions.set(sessionKey, (sessions.get(sessionKey) ?? 0) + 1);
          unauthenticated--;
          // LISTEN ACK -> register -> fresh authorization/read -> ready -> queued notifications.
          const unsubscribe = await listener.subscribe(
            claims!.matchId,
            () => {
              dirty = true;
              void drain();
            },
            () => close(1012),
          );
          if (closed) {
            unsubscribe();
            return;
          }
          release = unsubscribe;
          const authorized = await authorizeSubscription(
            deps.pool,
            claims!,
            now(),
          );
          if (closed) return;
          expiry = setTimeout(
            () => close(1008),
            Math.min(
              240000,
              Math.max(0, authorized.expiresAt.getTime() - now().getTime()),
            ),
          );
          expiry.unref();
          ready = true;
          clearTimeout(handshake);
          send("ready", authorized.revision);
          await drain();
        } catch (error) {
          close(error instanceof HttpError ? 1008 : 1013);
        }
      })();
    });
  }
  server.on("upgrade", upgrade);
  const heartbeat = setInterval(() => {
    for (const [peer, responding] of alive) {
      if (!responding) {
        peer.terminate();
        continue;
      }
      alive.set(peer, false);
      peer.ping();
    }
  }, 30000);
  heartbeat.unref();
  return async function dispose() {
    if (disposed) return;
    disposed = true;
    clearInterval(heartbeat);
    server.removeListener("upgrade", upgrade);
    for (const peer of wss.clients) peer.terminate();
    await listener.dispose();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
  };
}
