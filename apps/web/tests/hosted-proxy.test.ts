import { it, expect } from "vitest";
import { createServer } from "node:http";
import { once } from "node:events";
import { forwardApi } from "../src/server/api-proxy.js";
it("forwards exact command bytes and cookies once, overwrites spoofed proof and rejects unsafe upstream configuration", async () => {
  let requests = 0;
  const upstream = createServer((req, res) => {
    requests++;
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      res.setHeader("set-cookie", ["one=1; HttpOnly", "two=2; Secure"]);
      res.end(JSON.stringify({ path: req.url, headers: req.headers, body }));
    });
  });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  const address = upstream.address();
  if (!address || typeof address === "string") throw Error("No listener");
  const options = {
    upstream: `http://127.0.0.1:${address.port}`,
    secret: "s".repeat(64),
    platform: true,
  };
  try {
    const request = new Request("https://ui.test/api/_forward/matches?q=1", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "session=opaque",
        "x-vercel-forwarded-for": "203.0.113.3",
        "x-oathfront-client-ip": "spoof",
        "x-oathfront-proxy-token": "spoof",
      },
      body: '{ "commandId": "unchanged" }',
    });
    const response = await forwardApi(request, ["matches"], options);
    const received = await response.json();
    expect(received.body).toBe('{ "commandId": "unchanged" }');
    expect(received.path).toBe("/api/v1/matches?q=1");
    expect(received.headers.cookie).toBe("session=opaque");
    expect(received.headers["x-oathfront-client-ip"]).toBe("203.0.113.3");
    expect(received.headers["x-oathfront-proxy-token"]).toBe("s".repeat(64));
    expect(response.headers.getSetCookie()).toHaveLength(2);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(requests).toBe(1);
    expect(
      (
        await forwardApi(
          new Request("https://ui.test"),
          ["..", "health"],
          options,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await forwardApi(new Request("https://ui.test"), [], {
          ...options,
          upstream: "http://external.test",
        })
      ).status,
    ).toBe(503);
  } finally {
    upstream.closeAllConnections();
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
  }
});
