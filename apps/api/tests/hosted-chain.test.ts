import { it, expect } from "vitest";
import { randomUUID, randomBytes } from "node:crypto";
import { buildApp } from "../src/app.js";
import { forwardApi } from "../../web/src/server/api-proxy.js";
import { harness, origin, createBody } from "./http-helpers.js";
const h = harness();
it("real hosted forwarding chain rejects direct proof spoofing and preserves cookie/CSRF/create receipt", async () => {
  const secret = "proxy-credential-".repeat(4),
    api = buildApp({
      pool: h.pool,
      origin,
      secret: "session-secret-".repeat(4),
      ipTrust: { mode: "hosted-proxy", secret },
    });
  await api.listen({ port: 0, host: "127.0.0.1" });
  const address = api.server.address();
  if (!address || typeof address === "string") throw Error("No listener");
  const upstream = `http://127.0.0.1:${address.port}`;
  try {
    for (const headers of [
      {},
      {
        "x-oathfront-proxy-token": "wrong",
        "x-oathfront-client-ip": "203.0.113.1",
      },
    ])
      expect(
        (await fetch(upstream + "/api/v1/session", { headers })).status,
      ).toBe(403);
    async function forward(
      path: string,
      body?: unknown,
      proof?: { cookie: string; csrf: string },
    ) {
      const headers: Record<string, string> = {
        origin,
        "x-vercel-forwarded-for": "203.0.113.10",
        "x-oathfront-client-ip": "spoof",
        "x-oathfront-proxy-token": "spoof",
        ...(proof ? { cookie: proof.cookie, "x-csrf-token": proof.csrf } : {}),
      };
      if (body) headers["content-type"] = "application/json";
      return forwardApi(
        new Request("https://ui.test/api/_forward/" + path, {
          method: body ? "POST" : "GET",
          headers,
          ...(body ? { body: JSON.stringify(body) } : {}),
        }),
        path.split("/"),
        { upstream, secret, platform: true },
      );
    }
    const guest = await forward("guest", {
      commandId: randomUUID(),
      recoverySecret: randomBytes(32).toString("base64url"),
    });
    expect(guest.status).toBe(201);
    const session = await guest.json(),
      proof = {
        cookie: guest.headers.getSetCookie()[0]!.split(";")[0]!,
        csrf: session.csrfToken,
      };
    expect((await forward("session", undefined, proof)).status).toBe(200);
    const body = createBody(),
      created = await forward("matches", body, proof);
    expect(created.status).toBe(201);
    const original = await created.json(),
      retry = await forward("matches", body, proof);
    expect(await retry.json()).toEqual(original);
    expect(JSON.stringify(original)).not.toContain(secret);
    expect(
      (await forward("matches", createBody(), { ...proof, csrf: "wrong" }))
        .status,
    ).toBe(403);
  } finally {
    await api.close();
  }
});
