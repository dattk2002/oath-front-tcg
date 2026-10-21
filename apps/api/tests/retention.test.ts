import { it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { harness, createBody } from "./http-helpers.js";
import { runRetention } from "../src/maintenance/retention.js";
import { hashState } from "@oathfront/game-engine";
const h = harness();
const days = (d: Date, n: number) => new Date(+d + n * 86400000);
async function fixture(account = false) {
  const g = await h.guest();
  if (account)
    await h.owner.query(
      "UPDATE principals SET kind='ACCOUNT',auth_subject=$2,expires_at=NULL WHERE id=$1",
      [g.id, randomUUID()],
    );
  const r = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: createBody(),
  });
  expect(r.statusCode).toBe(201);
  return { g, id: r.json().view.matchId };
}
it("keeps active details and receipts, expires account inactivity through a replayable EXPIRED transition, then retains summary until day180", async () => {
  const { g, id } = await fixture(true);
  const before = await h.app.services.repository.loadMatch(g.id, id);
  const expiry = (
    await h.owner.query("SELECT expires_at FROM matches WHERE id=$1", [id])
  ).rows[0].expires_at;
  await h.owner.query(
    "UPDATE command_receipts SET expires_at=now()-interval '1 day' WHERE resource_id=$1",
    [id],
  );
  await runRetention(h.owner, days(expiry, -1));
  expect((await h.app.services.repository.loadMatch(g.id, id)).state).toEqual(
    before.state,
  );
  expect(
    (
      await h.owner.query(
        "SELECT * FROM command_receipts WHERE resource_id=$1",
        [id],
      )
    ).rowCount,
  ).toBe(1);
  await runRetention(h.owner, expiry);
  const expired = await h.app.services.repository.loadMatch(g.id, id);
  expect(expired.state.lifecycle).toBe("ABANDONED");
  expect(expired.state.outcome?.reason).toBe("EXPIRED");
  expect(
    hashState(
      (await h.app.services.repository.replayMatch(g.id, id)).finalState,
    ),
  ).toBe(hashState(expired.state));
  expect(
    (
      await h.owner.query(
        "SELECT command_id FROM match_action_journal WHERE match_id=$1",
        [id],
      )
    ).rows,
  ).toEqual([{ command_id: null }]);
  await runRetention(h.owner, days(expiry, 31));
  for (const table of [
    "match_initializations",
    "match_checkpoints",
    "match_action_journal",
    "match_events",
  ])
    expect(
      (await h.owner.query(`SELECT * FROM ${table} WHERE match_id=$1`, [id]))
        .rowCount,
    ).toBe(0);
  expect(
    (
      await h.owner.query(
        "SELECT outcome FROM match_results WHERE match_id=$1",
        [id],
      )
    ).rows,
  ).toEqual([{ outcome: "ABANDONED" }]);
  await runRetention(h.owner, days(expiry, 181));
  expect(
    (await h.owner.query("SELECT * FROM matches WHERE id=$1", [id])).rowCount,
  ).toBe(0);
});
it("purges unclaimed guests only at absolute day7 and leaves account owners intact", async () => {
  const { g, id } = await fixture();
  const expiry = new Date(g.r.json().principal.expiresAt);
  await runRetention(h.owner, new Date(+expiry - 1));
  expect(
    (await h.owner.query("SELECT * FROM matches WHERE id=$1", [id])).rowCount,
  ).toBe(1);
  await runRetention(h.owner, expiry);
  expect(
    (await h.owner.query("SELECT * FROM principals WHERE id=$1", [g.id]))
      .rowCount,
  ).toBe(0);
});
it("serializes concurrent cleanup and retains claim/bootstrap tombstones and referenced sessions for their audit lifetime", async () => {
  const g = await h.guest();
  const now = new Date();
  await h.owner.query(
    "UPDATE app_sessions SET expires_at=$2,revoked_at=$2 WHERE principal_id=$1",
    [g.id, days(now, -8)],
  );
  await h.owner.query(
    "UPDATE guest_bootstraps SET expires_at=$2 WHERE principal_id=$1",
    [g.id, days(now, 1)],
  );
  await Promise.all([runRetention(h.owner, now), runRetention(h.owner, now)]);
  expect(
    (
      await h.owner.query("SELECT * FROM app_sessions WHERE principal_id=$1", [
        g.id,
      ])
    ).rowCount,
  ).toBe(1);
  await h.owner.query("UPDATE rate_limit_windows SET expires_at=$1", [
    days(now, -1),
  ]);
  await runRetention(h.owner, now);
  expect(
    (await h.owner.query("SELECT * FROM rate_limit_windows")).rowCount,
  ).toBe(0);
});
it("retains converted account and real claim tombstone through day7, then removes audit/session rows without account deletion", async () => {
  const now = new Date();
  // Use a real application exchange with the fixture identity verifier in its own instance.
  const { buildApp } = await import("../src/app.js");
  const app = buildApp({
    pool: h.pool,
    origin: "https://oathfront.test",
    secret: "a".repeat(64),
    verifyIdentity: async () => ({
      subject: randomUUID(),
      displayName: "Kiểm thử",
      expiresAt: days(now, 1),
    }),
  });
  try {
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/guest",
      headers: { origin: "https://oathfront.test" },
      payload: {
        commandId: randomUUID(),
        recoverySecret: Buffer.alloc(32, 7).toString("base64url"),
      },
    });
    const cookie = String(created.headers["set-cookie"]).split(";")[0]!;
    const id = created.json().principal.id;
    const claimed = await app.inject({
      method: "POST",
      url: "/api/v1/auth/claim-guest",
      headers: {
        origin: "https://oathfront.test",
        cookie,
        "x-csrf-token": created.json().csrfToken,
      },
      payload: {
        commandId: randomUUID(),
        identityToken: "server-fixture",
        keepMatchId: null,
      },
    });
    expect(claimed.statusCode).toBe(200);
    const expiry = (
      await h.owner.query(
        "SELECT expires_at FROM auth_claims WHERE source_principal_id=$1",
        [id],
      )
    ).rows[0].expires_at;
    await runRetention(h.owner, new Date(+expiry - 1));
    expect(
      (
        await h.owner.query(
          "SELECT * FROM auth_claims WHERE source_principal_id=$1",
          [id],
        )
      ).rowCount,
    ).toBe(1);
    await runRetention(h.owner, days(expiry, 1));
    expect(
      (
        await h.owner.query(
          "SELECT * FROM auth_claims WHERE source_principal_id=$1",
          [id],
        )
      ).rowCount,
    ).toBe(0);
    expect(
      (await h.owner.query("SELECT kind FROM principals WHERE id=$1", [id]))
        .rows,
    ).toEqual([{ kind: "ACCOUNT" }]);
  } finally {
    await app.close();
  }
});
it("removes revoked sessions seven days after revocation even if their original expiry was later", async () => {
  const g = await h.guest(),
    now = new Date();
  await h.owner.query(
    "UPDATE principals SET kind='ACCOUNT',auth_subject=$2,expires_at=NULL WHERE id=$1",
    [g.id, randomUUID()],
  );
  await h.owner.query(
    "UPDATE app_sessions SET revoked_at=$2 WHERE principal_id=$1",
    [g.id, now],
  );
  await runRetention(h.owner, days(now, 8));
  expect(
    (
      await h.owner.query("SELECT * FROM app_sessions WHERE principal_id=$1", [
        g.id,
      ])
    ).rowCount,
  ).toBe(0);
});
