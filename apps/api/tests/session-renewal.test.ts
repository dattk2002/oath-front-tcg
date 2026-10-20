import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { harness, origin } from "./http-helpers.js";
let expiry = new Date(Date.now() + 600000);
const h = harness({
  verifyIdentity: async (subject: string) => ({
    subject,
    expiresAt: expiry,
    displayName: "Tài khoản",
  }),
});
it("bounds app expiry to verified JWT and revokes old app cookie on renewal/logout", async () => {
  const body = { commandId: randomUUID(), identityToken: "account" };
  const first = await h.app.inject({
    method: "POST",
    url: "/api/v1/auth/exchange",
    headers: { origin },
    payload: body,
  });
  expect(first.statusCode).toBe(200);
  expect(first.json().sessionExpiresAt).toBe(expiry.toISOString());
  const s = {
    cookie: String(first.headers["set-cookie"]).split(";")[0]!,
    csrf: first.json().csrfToken,
  };
  h.setTime(new Date(expiry.getTime() + 1000));
  expiry = new Date(expiry.getTime() + 3600000);
  const next = await h.app.inject({
    method: "POST",
    url: "/api/v1/auth/exchange",
    headers: h.headers(s),
    payload: body,
  });
  expect(next.statusCode).toBe(200);
  expect(next.json().principal.id).toBe(first.json().principal.id);
  expect(new Date(next.json().sessionExpiresAt).getTime()).toBeLessThan(
    expiry.getTime(),
  );
  const current = {
    cookie: String(next.headers["set-cookie"]).split(";")[0]!,
    csrf: next.json().csrfToken,
  };
  const logout = await h.app.inject({
    method: "POST",
    url: "/api/v1/auth/logout",
    headers: h.headers(current),
    payload: {},
  });
  expect(logout.statusCode).toBe(204);
  expect(
    (
      await h.app.inject({
        url: "/api/v1/session",
        headers: { cookie: current.cookie },
      })
    ).statusCode,
  ).toBe(401);
});
it("recovers a lost renewal response with the same revoked cookie and JWT but forbids silent account switch", async () => {
  const body = { commandId: randomUUID(), identityToken: "owner" };
  const first = await h.app.inject({
    method: "POST",
    url: "/api/v1/auth/exchange",
    headers: { origin },
    payload: body,
  });
  const s = {
    cookie: String(first.headers["set-cookie"]).split(";")[0]!,
    csrf: first.json().csrfToken,
  };
  const next = await h.app.inject({
    method: "POST",
    url: "/api/v1/auth/exchange",
    headers: h.headers(s),
    payload: body,
  });
  expect(next.statusCode).toBe(200);
  const retry = await h.app.inject({
    method: "POST",
    url: "/api/v1/auth/exchange",
    headers: h.headers(s),
    payload: body,
  });
  expect(retry.statusCode).toBe(200);
  expect(retry.json().principal.id).toBe(first.json().principal.id);
  const switched = await h.app.inject({
    method: "POST",
    url: "/api/v1/auth/exchange",
    headers: h.headers(s),
    payload: { ...body, identityToken: "different" },
  });
  expect(switched.statusCode).toBe(403);
});
