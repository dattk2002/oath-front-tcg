import { it, expect } from "vitest";
import { createServer } from "node:http";
import { once } from "node:events";
import { WebSocket, WebSocketServer } from "ws";
import { createIngress } from "../../../scripts/ui-server.mjs";

it("closes active upgraded tunnels when the ingress shuts down", async () => {
  const api = createServer();
  const sockets = new WebSocketServer({ server: api });
  api.listen(0, "127.0.0.1");
  await once(api, "listening");
  const ingress = createIngress(api.address().port, "s".repeat(64), {
    realtimeOrigin: `http://127.0.0.1:${api.address().port}`,
  });
  ingress.listen(0, "127.0.0.1");
  await once(ingress, "listening");
  const client = new WebSocket(
    `ws://127.0.0.1:${ingress.address().port}/realtime/matches`,
  );
  await once(client, "open");
  const closed = new Promise((resolve) =>
    ingress.close(() => resolve("closed")),
  );
  try {
    expect(
      await Promise.race([
        closed,
        new Promise((resolve) => setTimeout(() => resolve("still-open"), 250)),
      ]),
    ).toBe("closed");
    await expect.poll(() => client.readyState).toBe(WebSocket.CLOSED);
  } finally {
    client.terminate();
    for (const socket of sockets.clients) socket.terminate();
    await closed;
    await new Promise((resolve) => sockets.close(resolve));
    await new Promise((resolve) => api.close(resolve));
  }
});

it("tunnels only the exact realtime path and preserves Origin without forwarding cookies or proxy credentials", async () => {
  const api = createServer();
  const sockets = new WebSocketServer({ server: api });
  let receivedHeaders;
  sockets.on("connection", (socket, request) => {
    receivedHeaders = request.headers;
    socket.on("message", (data) => socket.send(data.toString()));
  });
  api.listen(0, "127.0.0.1");
  await once(api, "listening");
  const ingress = createIngress(api.address().port, "s".repeat(64), {
    realtimeOrigin: `http://127.0.0.1:${api.address().port}`,
  });
  ingress.listen(0, "127.0.0.1");
  await once(ingress, "listening");
  const url = `ws://127.0.0.1:${ingress.address().port}/realtime/matches`;
  const exchange = (address) =>
    new Promise((resolve) => {
      const client = new WebSocket(address, {
        origin: "http://localhost:3300",
        headers: {
          cookie: "private=should-stay-in-ui",
          "x-oathfront-proxy-token": "spoof",
        },
      });
      const timeout = setTimeout(() => {
        client.terminate();
        resolve("timeout");
      }, 1500);
      const finish = (value) => {
        clearTimeout(timeout);
        client.close();
        resolve(value);
      };
      client.once("error", () => finish("rejected"));
      client.once("unexpected-response", (_request, response) => {
        response.resume();
        client.terminate();
        finish("rejected");
      });
      client.once("open", () => client.send("revision-message"));
      client.once("message", (value) => finish(value.toString()));
    });
  try {
    expect(await exchange(url)).toBe("revision-message");
    expect(receivedHeaders.origin).toBe("http://localhost:3300");
    expect(receivedHeaders.cookie).toBeUndefined();
    expect(receivedHeaders["x-oathfront-proxy-token"]).toBeUndefined();
    expect(await exchange(url + "?token=forbidden")).toBe("rejected");
    expect(
      await exchange(url.replace("/realtime/matches", "/api/auth/session")),
    ).toBe("rejected");
  } finally {
    for (const socket of sockets.clients) socket.terminate();
    await new Promise((resolve) => sockets.close(resolve));
    await new Promise((resolve) => api.close(resolve));
    await new Promise((resolve) => ingress.close(resolve));
  }
});
