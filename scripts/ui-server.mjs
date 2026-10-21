import { createServer, request } from "node:http";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
/** The standalone server remains untouched; only this ingress owns client-IP attribution. */
export function createIngress(port, secret) {
  if (!Number.isInteger(port) || port < 1 || port > 65535 || secret.length < 32)
    throw Error("Invalid UI ingress configuration");
  return createServer((req, res) => {
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
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const internal = Number(process.env.NEXT_INTERNAL_PORT ?? 3006),
    port = Number(process.env.PORT ?? 3000),
    secret = process.env.UI_PROXY_SECRET ?? "";
  if (port === internal) throw Error("Ingress and internal ports must differ");
  const server = createIngress(internal, secret);
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
