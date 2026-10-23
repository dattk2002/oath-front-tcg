import { expect, it } from "vitest";
import { createServer, IncomingMessage } from "node:http";
import { Socket } from "node:net";
import { Duplex } from "node:stream";
import type { Pool } from "@oathfront/db";
import { attachMatchRealtime } from "../src/realtime/server.js";

it("absorbs client reset errors while rejecting an upgrade before WebSocket takes ownership", async () => {
  const server = createServer();
  const dispose = attachMatchRealtime(server, {
    pool: {} as Pool,
    secret: "test-server-secret-".repeat(3),
    origin: "https://oathfront.test",
    realtime: {
      url: "ws://localhost:3001/realtime/matches",
      databaseUrl: "postgresql://runtime:test@localhost/game_test",
    },
  });
  const socket = new Duplex({
    read() {},
    write(_data, _encoding, callback) {
      callback();
    },
  });
  const request = new IncomingMessage(new Socket());
  request.method = "GET";
  request.url = "/realtime/matches";
  request.headers.origin = "https://evil.test";
  try {
    server.emit("upgrade", request, socket, Buffer.alloc(0));
    expect(() => socket.emit("error", Error("ECONNRESET"))).not.toThrow();
    expect(socket.destroyed).toBe(true);
  } finally {
    socket.destroy();
    request.destroy();
    await dispose();
  }
});
