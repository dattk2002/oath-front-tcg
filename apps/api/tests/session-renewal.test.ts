import { beforeEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { harness, origin } from "./http-helpers.js";
const loginTime = new Date("2026-10-22T12:00:00Z");
let expiry: Date;
const h = harness({
  verifyIdentity: async (subject: string) => ({
    subject,
    expiresAt: expiry,
    displayName: "Account",
  }),
});
beforeEach(() => {
  h.setTime(loginTime);
  expiry = new Date("2026-10-22T12:15:00Z");
});
const exchangeBody = (subject = "account") => ({
  commandId: randomUUID(),
  identityToken: subject,
});
const exchange = (
  body = exchangeBody(),
  headers: Record<string, string> = { origin },
) =>
  h.app.inject({
    method: "POST",
    url: "/api/v1/auth/exchange",
    headers,
    payload: body,
  });
function session(r: Awaited<ReturnType<typeof exchange>>) {
  return {
    cookie: String(r.headers["set-cookie"]).split(";")[0]!,
    csrf: r.json().csrfToken,
  };
}
const readSession = (s: { cookie: string }) =>
  h.app.inject({ url: "/api/v1/session", headers: { cookie: s.cookie } });

it("keeps an account signed in for 30 days after login, independently of identity JWT expiry", async () => {
  const first = await exchange();
  expect(first.statusCode).toBe(200);
  expect(first.json().sessionExpiresAt).toBe("2026-11-21T12:00:00.000Z");
  expect(first.headers["set-cookie"]).toContain(
    "Expires=Sat, 21 Nov 2026 12:00:00 GMT",
  );
  expect(first.headers["set-cookie"]).toContain(
    "Secure; HttpOnly; SameSite=Lax",
  );
  const current = session(first);
  h.setTime(new Date("2026-10-23T12:00:00Z"));
  expect((await readSession(current)).statusCode).toBe(200);
  h.setTime(new Date("2026-11-21T11:59:59.999Z"));
  expect((await readSession(current)).statusCode).toBe(200);
  h.setTime(new Date("2026-11-21T12:00:00Z"));
  expect((await readSession(current)).statusCode).toBe(401);
});

it.each([
  ["2026-10-23T12:00:00Z", "2026-11-22T12:00:00.000Z"],
  ["2026-11-22T12:00:00Z", "2026-12-22T12:00:00.000Z"],
])(
  "rotates token and CSRF on re-login at %s and starts a fresh 30-day lifetime",
  async (time, expectedExpiry) => {
    const first = await exchange();
    const old = session(first);
    const now = new Date(time);
    h.setTime(now);
    expiry = new Date(now.getTime() + 600000);
    const next = await exchange(exchangeBody(), h.headers(old));
    expect(next.statusCode).toBe(200);
    expect(next.json().principal.id).toBe(first.json().principal.id);
    expect(next.json().sessionExpiresAt).toBe(expectedExpiry);
    const current = session(next);
    expect(current.cookie).not.toBe(old.cookie);
    expect(current.csrf).not.toBe(old.csrf);
    expect((await readSession(old)).statusCode).toBe(401);
    expect((await readSession(current)).statusCode).toBe(200);
    const logout = await h.app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: h.headers(current),
      payload: {},
    });
    expect(logout.statusCode).toBe(204);
    expect((await readSession(current)).statusCode).toBe(401);
  },
);

it.each([
  "__Host-ngulo-session=" + "a".repeat(64),
  "__Host-ngulo-session=obsolete",
])(
  "replaces an unrecognized cookie after fresh identity verification: %s",
  async (cookie) => {
    const first = await exchange();
    const next = await exchange(exchangeBody(), { origin, cookie });
    expect(next.statusCode).toBe(200);
    expect(next.json().principal.id).toBe(first.json().principal.id);
    expect(next.json().sessionExpiresAt).toBe("2026-11-21T12:00:00.000Z");
    expect((await readSession(session(next))).statusCode).toBe(200);
    expect((await readSession({ cookie })).statusCode).toBe(401);
  },
);

it("does not let a stale cookie bypass expired identity or origin validation", async () => {
  const headers = { origin, cookie: "__Host-ngulo-session=" + "a".repeat(64) };
  expiry = loginTime;
  expect((await exchange(exchangeBody(), headers)).statusCode).toBe(401);
  expiry = new Date("2026-10-22T12:15:00Z");
  expect(
    (
      await exchange(exchangeBody(), {
        ...headers,
        origin: "https://evil.test",
      })
    ).statusCode,
  ).toBe(403);
});

it("requires matching CSRF for recognized sessions without revoking them on failure", async () => {
  const first = await exchange();
  const old = session(first);
  for (const headers of [
    { origin, cookie: old.cookie },
    h.headers({ ...old, csrf: "wrong" }),
  ]) {
    expect((await exchange(exchangeBody(), headers)).statusCode).toBe(403);
    expect((await readSession(old)).statusCode).toBe(200);
  }
});

it("recovers a lost renewal response with the same revoked cookie and JWT but forbids silent account switch", async () => {
  const body = exchangeBody("owner");
  const first = await exchange(body);
  const old = session(first);
  const next = await exchange(body, h.headers(old));
  expect(next.statusCode).toBe(200);
  const retry = await exchange(body, h.headers(old));
  expect(retry.statusCode).toBe(200);
  expect(retry.json().principal.id).toBe(first.json().principal.id);
  const switched = await exchange(
    { ...body, identityToken: "different" },
    h.headers(old),
  );
  expect(switched.statusCode).toBe(403);
});
