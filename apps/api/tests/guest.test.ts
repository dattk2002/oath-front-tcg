import { expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { harness, origin } from "./http-helpers.js";
const h = harness();
it("recovers a dropped bootstrap cookie for the same principal and recomputes stable session CSRF after reload", async () => {
  const first = await h.guest();
  expect(first.r.statusCode).toBe(201);
  const again = await h.guest(first.body);
  expect(again.id).toBe(first.id);
  expect(again.cookie).not.toBe(first.cookie);
  const session = await h.app.inject({
    url: "/api/v1/session",
    headers: { cookie: again.cookie },
  });
  expect(session.json().csrfToken).toBe(again.csrf);
  expect(
    (
      await h.app.inject({
        url: "/api/v1/session",
        headers: { cookie: first.cookie },
      })
    ).statusCode,
  ).toBe(401);
  expect(String(again.r.headers["set-cookie"])).toContain("HttpOnly");
  expect(String(again.r.headers["set-cookie"])).toContain("Secure");
  expect(again.r.body).not.toContain(again.cookie.split("=")[1]!);
  expect(
    (
      await h.guest({
        ...first.body,
        recoverySecret: randomBytes(32).toString("base64url"),
      })
    ).r.statusCode,
  ).toBe(403);
  expect(
    (await h.pool.query("SELECT count(*)::int n FROM principals")).rows[0].n,
  ).toBe(1);
});
it("rejects expired or merged recovery without creating a principal and requires bootstrap origin", async () => {
  const g = await h.guest();
  h.setTime(new Date(Date.now() + 301000));
  expect((await h.guest(g.body)).r.statusCode).toBe(403);
  h.setTime(new Date());
  await h.owner.query(
    "UPDATE principals SET expires_at=now()-interval '1 minute' WHERE id=$1",
    [g.id],
  );
  expect((await h.guest(g.body)).r.statusCode).toBe(403);
  expect(
    (await h.pool.query("SELECT count(*)::int n FROM principals")).rows[0].n,
  ).toBe(1);
  expect(
    (
      await h.app.inject({
        method: "POST",
        url: "/api/v1/guest",
        payload: g.body,
        headers: { origin: origin + ".evil" },
      })
    ).statusCode,
  ).toBe(403);
});
it("durable merged and claimed source markers prevent bootstrap recovery", async () => {
  const g = await h.guest(),
    target = await h.guest();
  await h.owner.query(
    "UPDATE principals SET merged_into_principal_id=$2,merged_at=now() WHERE id=$1",
    [g.id, target.id],
  );
  expect((await h.guest(g.body)).r.statusCode).toBe(403);
  const source = await h.guest();
  const session = (
    await h.pool.query("SELECT id FROM app_sessions WHERE principal_id=$1", [
      source.id,
    ])
  ).rows[0].id;
  await h.owner.query(
    "INSERT INTO auth_claims(source_session_id,command_id,source_principal_id,target_principal_id,auth_subject,request_hash,result,recover_until,expires_at) VALUES($1,$2,$3,$4,'subject',$5,'{}',now()+interval '5 minutes',now()+interval '7 days')",
    [session, source.body.commandId, source.id, target.id, "a".repeat(64)],
  );
  expect((await h.guest(source.body)).r.statusCode).toBe(403);
});
