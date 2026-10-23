import { createServer, request } from "node:http";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
/** The standalone server remains untouched; only this ingress owns client-IP attribution. */
export function createIngress(port, secret, options = {}) {
  if (!Number.isInteger(port) || port < 1 || port > 65535 || secret.length < 32)
    throw Error("Invalid UI ingress configuration");
  const server = createServer((req, res) => {
    const headers = { ...req.headers };
    for (const name of [
      "forwarded",
      "x-forwarded-for",
      "x-forwarded-host",
      "x-forwarded-proto",
      "x-real-ip",
      "x-vercel-forwarded-for",
      "x-oathfront-proxy-token",
      "x-oathfront-client-ip",
    ])
      delete headers[name];
    headers["x-forwarded-for"] = req.socket.remoteAddress;
    if (req.url?.startsWith("/api/v1/")) {
      headers["x-oathfront-client-ip"] = req.socket.remoteAddress;
      headers["x-oathfront-proxy-token"] = secret;
    }
    const upstream = request(
      {
        host: "127.0.0.1",
        port,
        path: req.url,
        method: req.method,
        headers,
        timeout: 30000,
      },
      (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(res);
      },
    );
    upstream.on("timeout", () => upstream.destroy());
    upstream.on("error", () => {
      if (!res.headersSent)
        res.writeHead(502, {
          "content-type": "text/plain",
          "cache-control": "no-store",
        });
      res.end("Upstream unavailable");
    });
    req.on("aborted", () => upstream.destroy());
    res.on("close", () => upstream.destroy());
    req.pipe(upstream);
  });
  if (options.realtimeOrigin) {
    const realtime = new URL(options.realtimeOrigin);
    if (
      realtime.protocol !== "http:" ||
      realtime.username ||
      realtime.password ||
      realtime.search ||
      realtime.hash ||
      realtime.pathname !== "/"
    )
      throw Error("Realtime ingress requires an explicit internal HTTP origin");
    const tunnels = new Set();
    let closingRealtime = false;
    server.on("upgrade", (req, socket, head) => {
      socket.on("error", () => socket.destroy());
      if (closingRealtime) {
        socket.destroy();
        return;
      }
      tunnels.add(socket);
      socket.once("close", () => tunnels.delete(socket));
      const reject = (status) =>
        socket.end(
          `HTTP/1.1 ${status} Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
          () => socket.destroy(),
        );
      if (
        req.method !== "GET" ||
        req.url !== "/realtime/matches" ||
        req.headers.upgrade?.toLowerCase() !== "websocket"
      ) {
        reject(404);
        return;
      }
      const headers = {};
      for (const name of [
        "origin",
        "sec-websocket-key",
        "sec-websocket-version",
        "sec-websocket-protocol",
        "sec-websocket-extensions",
      ])
        if (req.headers[name] !== undefined) headers[name] = req.headers[name];
      headers.connection = "Upgrade";
      headers.upgrade = "websocket";
      const upstream = request(new URL("/realtime/matches", realtime), {
        method: "GET",
        headers,
        timeout: 5000,
      });
      let connected = false;
      const unavailable = () => {
        if (!socket.destroyed && !connected) reject(502);
      };
      socket.on("error", () => upstream.destroy());
      socket.on("close", () => upstream.destroy());
      upstream.on("timeout", () => upstream.destroy());
      upstream.on("error", unavailable);
      upstream.on("response", (response) => {
        response.resume();
        if (!socket.destroyed) reject(response.statusCode ?? 502);
      });
      upstream.on("upgrade", (response, remote, remoteHead) => {
        if (socket.destroyed) {
          remote.destroy();
          return;
        }
        connected = true;
        upstream.setTimeout(0);
        remote.setTimeout(0);
        const responseHeaders = [];
        for (let i = 0; i < response.rawHeaders.length; i += 2)
          responseHeaders.push(
            `${response.rawHeaders[i]}: ${response.rawHeaders[i + 1]}`,
          );
        socket.write(
          `HTTP/1.1 101 Switching Protocols\r\n${responseHeaders.join("\r\n")}\r\n\r\n`,
        );
        if (remoteHead.length) socket.write(remoteHead);
        if (head.length) remote.write(head);
        tunnels.add(remote);
        remote.once("close", () => {
          tunnels.delete(remote);
          socket.destroy();
        });
        remote.on("error", () => socket.destroy());
        socket.once("close", () => remote.destroy());
        socket.pipe(remote).pipe(socket);
      });
      upstream.end();
    });
    const closeServer = server.close.bind(server);
    server.close = (callback) => {
      // Node excludes upgraded sockets from closeAllConnections and waits for
      // them before emitting close, so dispose tunnels before starting shutdown.
      closingRealtime = true;
      for (const socket of tunnels) socket.destroy();
      return closeServer(callback);
    };
  }
  return server;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const internal = Number(process.env.NEXT_INTERNAL_PORT ?? 3006),
    port = Number(process.env.PORT ?? 3000),
    secret = process.env.UI_PROXY_SECRET ?? "";
  if (port === internal) throw Error("Ingress and internal ports must differ");
  const server = createIngress(internal, secret, {
    realtimeOrigin: process.env.API_ORIGIN,
  });
  const child = spawn(
    process.execPath,
    [process.env.NEXT_SERVER ?? "apps/web/.next/standalone/apps/web/server.js"],
    {
      env: { ...process.env, PORT: String(internal), HOSTNAME: "127.0.0.1" },
      stdio: "inherit",
    },
  );
  let closing = false;
  const close = () => {
    if (closing) return;
    closing = true;
    server.close();
    child.kill("SIGTERM");
    const deadline = setTimeout(() => {
      child.kill("SIGKILL");
      server.closeAllConnections();
      process.exitCode = 1;
    }, 10000);
    deadline.unref();
    child.once("exit", () => {
      clearTimeout(deadline);
      server.closeAllConnections();
    });
  };
  child.once("exit", (code) => {
    if (!closing) {
      process.exitCode = code ?? 1;
      close();
    }
  });
  child.once("error", () => {
    process.stderr.write("UI child startup failed\n");
    close();
  });
  server.on("error", () => {
    process.stderr.write("UI ingress startup failed\n");
    process.exitCode = 1;
    close();
  });
  process.once("SIGTERM", close);
  process.once("SIGINT", close);
  server.listen(port, process.env.HOSTNAME ?? "0.0.0.0");
}
