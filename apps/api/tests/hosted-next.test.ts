import { it, expect } from "vitest";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { randomBytes, randomUUID } from "node:crypto";
import { buildApp } from "../src/app.js";
import { harness, origin, createBody } from "./http-helpers.js";
import { root } from "../../../packages/db/tests/helpers.js";
const h = harness();
it("real Next hosted rewrite preserves API/auth separation, proof, cookies, CSRF and duplicate command bytes", async () => {
  const secret = randomBytes(32).toString("hex");
  const api = buildApp({
    pool: h.pool,
    origin,
    secret: randomBytes(32).toString("hex"),
    ipTrust: { mode: "hosted-proxy", secret },
  });
  await api.listen({ host: "127.0.0.1", port: 0 });
  const addr = api.server.address();
  if (!addr || typeof addr === "string") throw Error("No API listener");
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const nextAddr = probe.address();
  if (!nextAddr || typeof nextAddr === "string")
    throw Error("No free test port");
  await new Promise<void>((r) => probe.close(() => r()));
  const url = `http://127.0.0.1:${nextAddr.port}`;
  const child = spawn(
    "pnpm",
    [
      "--filter",
      "@oathfront/web",
      "exec",
      "next",
      "dev",
      "--webpack",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(nextAddr.port),
    ],
    {
      cwd: root,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        VERCEL: "1",
        NEXT_TELEMETRY_DISABLED: "1",
        OATHFRONT_TEST_DEV: "1",
        OATHFRONT_HOSTED_PROXY: "1",
        API_UPSTREAM_ORIGIN: `http://127.0.0.1:${addr.port}`,
        UI_PROXY_SECRET: secret,
      },
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    },
  );
  let log = "";
  child.stdout.on("data", (c) => {
    log += String(c);
  });
  child.stderr.on("data", (c) => {
    log += String(c);
  });
  try {
    for (let i = 0; i < 100 && !log.includes("Ready in"); i++) {
      if (child.exitCode !== null) throw Error("Next fixture exited");
      await new Promise((r) => setTimeout(r, 100));
    }
    const headers: Record<string, string> = {
      origin,
      "content-type": "application/json",
      "x-vercel-forwarded-for": "203.0.113.99",
      "x-oathfront-client-ip": "spoof",
      "x-oathfront-proxy-token": "spoof",
    };
    const guest = await fetch(url + "/api/v1/guest", {
      method: "POST",
      headers,
      body: JSON.stringify({
        commandId: randomUUID(),
        recoverySecret: randomBytes(32).toString("base64url"),
      }),
      signal: AbortSignal.timeout(30000),
    });
    expect(guest.status).toBe(201);
    const session = await guest.json();
    headers.cookie = guest.headers.get("set-cookie")!.split(";")[0]!;
    headers["x-csrf-token"] = session.csrfToken;
    const body = JSON.stringify(createBody());
    const create = await fetch(url + "/api/v1/matches", {
      method: "POST",
      headers,
      body,
    });
    expect(create.status).toBe(201);
    const first = await create.text();
    const retry = await fetch(url + "/api/v1/matches", {
      method: "POST",
      headers,
      body,
    });
    expect(retry.status).toBe(201);
    expect(await retry.text()).toBe(first);
    expect((await fetch(url + "/api/v1/session", { headers })).status).toBe(
      200,
    );
    const auth = await fetch(url + "/api/auth/get-session");
    expect(auth.status).toBe(503);
    expect((await auth.json()).error).toBe("AUTH_UNAVAILABLE");
    expect(log).not.toContain(secret);
  } finally {
    if (child.exitCode === null) {
      process.kill(-child.pid!, "SIGTERM");
      await once(child, "exit");
    }
    await api.close();
  }
}, 60000);
