import { it, expect } from "vitest";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { randomBytes, randomUUID } from "node:crypto";
import { root } from "../../../packages/db/tests/helpers.js";
import { harness, origin, createBody } from "./http-helpers.js";
const h = harness();
it("runs compiled Node HTTP, drops a committed response, restarts and returns its one durable receipt without private logs", async () => {
  const secret = randomBytes(32).toString("hex");
  let logs = "";
  async function start() {
    const child = spawn(process.execPath, [root + "apps/api/dist/server.mjs"], {
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL!,
        SESSION_SECRET: secret,
        APP_ORIGIN: origin,
        PORT: "0",
        HOST: "127.0.0.1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const endpoint = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(Error("HTTP startup timeout")),
        10000,
      );
      child.once("exit", () => {
        clearTimeout(timeout);
        reject(Error("HTTP process exited before listening"));
      });
      child.stdout.on("data", (chunk) => {
        logs += String(chunk);
        for (const line of String(chunk).split("\n")) {
          try {
            const entry = JSON.parse(line);
            if (entry.event === "listening") {
              clearTimeout(timeout);
              resolve(`http://127.0.0.1:${entry.port}`);
            }
          } catch {
            /* structured non-ready output */
          }
        }
      });
      child.stderr.on("data", (chunk) => {
        logs += String(chunk);
      });
    });
    return { child, endpoint };
  }
  const first = await start();
  let second: Awaited<ReturnType<typeof start>> | undefined;
  let proxy: ReturnType<typeof createServer> | undefined;
  try {
    const guest = await fetch(first.endpoint + "/api/v1/guest", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({
        commandId: randomUUID(),
        recoverySecret: randomBytes(32).toString("base64url"),
      }),
    });
    expect(guest.status).toBe(201);
    const session = await guest.json(),
      cookie = guest.headers.get("set-cookie")!.split(";")[0]!;
    const headers = {
      origin,
      cookie,
      "x-csrf-token": session.csrfToken,
      "content-type": "application/json",
    };
    const created = await fetch(first.endpoint + "/api/v1/matches", {
      method: "POST",
      headers,
      body: JSON.stringify(createBody()),
    });
    expect(created.status).toBe(201);
    const match = await created.json(),
      id = match.view.matchId;
    const body = {
        commandId: randomUUID(),
        expectedRevision: 0,
        action: { kind: "MULLIGAN", cardInstanceIds: [] },
      },
      path = `/api/v1/matches/${id}/commands`;
    let committed = "";
    proxy = createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const response = await fetch(first.endpoint + path, {
        method: "POST",
        headers,
        body: Buffer.concat(chunks),
      });
      committed = await response.text();
      res.destroy();
    });
    proxy.listen(0, "127.0.0.1");
    await once(proxy, "listening");
    const address = proxy.address();
    if (!address || typeof address === "string")
      throw Error("No proxy address");
    await expect(
      fetch(`http://127.0.0.1:${address.port}`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    ).rejects.toThrow();
    expect(JSON.parse(committed).revision).toBe(1);
    first.child.kill("SIGKILL");
    await once(first.child, "exit");
    second = await start();
    const retry = await fetch(second.endpoint + path, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    expect(retry.status).toBe(200);
    expect(await retry.text()).toBe(committed);
    expect(
      (
        await h.pool.query(
          "SELECT count(*)::int n FROM command_receipts WHERE command_id=$1",
          [body.commandId],
        )
      ).rows[0].n,
    ).toBe(1);
    const snapshot = await fetch(second.endpoint + `/api/v1/matches/${id}`, {
      headers,
    });
    expect((await snapshot.json()).revision).toBe(1);
    const privateRow = (
      await h.pool.query(
        "SELECT private_seed,initial_state FROM match_initializations WHERE match_id=$1",
        [id],
      )
    ).rows[0];
    const canaries = [
      cookie.split("=")[1]!,
      session.csrfToken,
      privateRow.private_seed.toString("hex"),
      privateRow.initial_state.state.random.identityKey,
      ...privateRow.initial_state.state.players.EVIL.hand.map(
        (c: { instanceId: string }) => c.instanceId,
      ),
    ];
    for (const canary of canaries) expect(logs).not.toContain(canary);
    expect((await fetch(second.endpoint + "/health/ready")).status).toBe(200);
  } finally {
    proxy?.close();
    if (first.child.exitCode === null && first.child.signalCode === null) {
      first.child.kill("SIGKILL");
      await once(first.child, "exit");
    }
    if (second && second.child.exitCode === null) {
      second.child.kill("SIGKILL");
      await once(second.child, "exit");
    }
  }
}, 25000);
