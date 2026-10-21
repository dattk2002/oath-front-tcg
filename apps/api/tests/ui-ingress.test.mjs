import { it, expect } from "vitest";
import { createServer } from "node:http";
import { once } from "node:events";
import { createIngress } from "../../../scripts/ui-server.mjs";
it("overwrites client IP/token headers, streams cookies/body and returns bounded generic upstream errors", async () => {
  const backend = createServer((req, res) => {
    res.setHeader("set-cookie", "test=opaque; HttpOnly");
    res.end(JSON.stringify(req.headers));
  });
  backend.listen(0, "127.0.0.1");
  await once(backend, "listening");
  const ingress = createIngress(backend.address().port, "s".repeat(64));
  ingress.listen(0, "127.0.0.1");
  await once(ingress, "listening");
  try {
    const response = await fetch(
      `http://127.0.0.1:${ingress.address().port}/api/v1/guest`,
      {
        headers: {
          "x-forwarded-for": "spoof",
          "x-vercel-forwarded-for": "spoof",
          "x-oathfront-proxy-token": "spoof",
        },
      },
    );
    const headers = await response.json();
    expect(headers["x-forwarded-for"]).toBe("127.0.0.1");
    expect(headers["x-vercel-forwarded-for"]).toBeUndefined();
    expect(headers["x-oathfront-proxy-token"]).toBe("s".repeat(64));
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    const auth = await fetch(
      `http://127.0.0.1:${ingress.address().port}/api/auth/get-session`,
      { headers: { "x-oathfront-proxy-token": "spoof" } },
    );
    expect((await auth.json())["x-oathfront-proxy-token"]).toBeUndefined();
    await new Promise((resolve) => backend.close(resolve));
    const failed = await fetch(`http://127.0.0.1:${ingress.address().port}/`);
    expect(failed.status).toBe(502);
    expect(await failed.text()).toBe("Upstream unavailable");
  } finally {
    ingress.closeAllConnections();
    await new Promise((resolve) => ingress.close(resolve));
    backend.close();
  }
});
