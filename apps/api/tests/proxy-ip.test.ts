import { it, expect } from "vitest";
import { clientIp } from "../src/client-ip.js";
import { buildApp } from "../src/app.js";
import { harness, origin } from "./http-helpers.js";
import { randomUUID, randomBytes } from "node:crypto";
const h = harness();
it("ignores spoofed forwarded headers in direct mode and requires validated explicit trust in hosted/private modes", () => {
  const headers = {
    "x-forwarded-for": "203.0.113.1",
    "x-oathfront-client-ip": "203.0.113.1",
    "x-vercel-forwarded-for": "203.0.113.2",
    "x-oathfront-proxy-token": "a".repeat(64),
  };
  expect(clientIp("127.0.0.1", headers, { mode: "direct" })).toBe("127.0.0.1");
  expect(
    clientIp("127.0.0.1", headers, {
      mode: "hosted-proxy",
      secret: "a".repeat(64),
    }),
  ).toBe("203.0.113.1");
  expect(
    clientIp("127.0.0.1", headers, {
      mode: "trusted-next",
      secret: "a".repeat(64),
    }),
  ).toBe("203.0.113.1");
  expect(() =>
    clientIp("127.0.0.1", headers, {
      mode: "trusted-next",
      secret: "b".repeat(64),
    }),
  ).toThrow();
  expect(() =>
    clientIp(
      "127.0.0.1",
      { "x-vercel-forwarded-for": "203.0.113.1, 203.0.113.2" },
      { mode: "hosted-proxy", secret: "a".repeat(64) },
    ),
  ).toThrow();
});
it("two API instances share the guest bound despite spoofed forwarding headers and do not store raw IPs", async () => {
  const second = buildApp({ pool: h.pool, origin, secret: "a".repeat(64) });
  const first = buildApp({ pool: h.pool, origin, secret: "a".repeat(64) });
  try {
    await first.ready();
    await second.ready();
    const responses = await Promise.all(
      Array.from({ length: 22 }, (_, i) =>
        (i % 2 ? first : second).inject({
          method: "POST",
          url: "/api/v1/guest",
          headers: { origin, "x-forwarded-for": `203.0.113.${i + 1}` },
          payload: {
            commandId: randomUUID(),
            recoverySecret: randomBytes(32).toString("base64url"),
          },
        }),
      ),
    );
    expect(responses.filter((r) => r.statusCode === 201)).toHaveLength(20);
    expect(responses.filter((r) => r.statusCode === 429)).toHaveLength(2);
    const rows = (await h.owner.query("SELECT * FROM rate_limit_windows")).rows;
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain("203.0.113");
    expect(rows[0].key_hash).toMatch(/^[a-f0-9]{64}$/);
  } finally {
    await first.close();
    await second.close();
  }
});
