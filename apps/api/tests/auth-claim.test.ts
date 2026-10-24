import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { harness, origin, createBody } from "./http-helpers.js";
const identity = {
  subject: "google-user-a",
  expiresAt: new Date(Date.now() + 600000),
  displayName: "Người chơi",
};
const h = harness({
  verifyIdentity: async (token: string) => ({ ...identity, subject: token }),
});
const claimBody = (subject = identity.subject) => ({
  commandId: randomUUID(),
  identityToken: subject,
  keepMatchId: null as string | null,
});
async function claim(g: { cookie: string; csrf: string }, body = claimBody()) {
  return h.app.inject({
    method: "POST",
    url: "/api/v1/auth/claim-guest",
    headers: h.headers(g),
    payload: body,
  });
}
function session(r: Awaited<ReturnType<typeof claim>>) {
  return {
    cookie: String(r.headers["set-cookie"]).split(";")[0]!,
    csrf: r.json().csrfToken,
    id: r.json().principal.id,
  };
}
it("issues a 30-day account session when a guest signs in", async () => {
  h.setTime(new Date("2026-10-22T00:00:00Z"));
  const g = await h.guest();
  const result = await claim(g);
  expect(result.statusCode).toBe(200);
  expect(result.json().sessionExpiresAt).toBe("2026-11-21T00:00:00.000Z");
  h.setTime(new Date("2026-11-20T00:00:00Z"));
  expect(
    (
      await h.app.inject({
        url: "/api/v1/session",
        headers: { cookie: session(result).cookie },
      })
    ).statusCode,
  ).toBe(200);
});
it("converts guest and recovers only the completed same-subject claim without granting revoked-cookie gameplay/bootstrap", async () => {
  const g = await h.guest();
  const match = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: createBody(),
  });
  const body = claimBody();
  const first = await claim(g, body);
  expect(first.statusCode).toBe(200);
  expect(first.json().principal).toMatchObject({ id: g.id, kind: "ACCOUNT" });
  expect(first.json().activeMatchId).toBe(match.json().view.matchId);
  const retry = await claim(g, body);
  expect(retry.statusCode).toBe(200);
  expect(retry.json().principal.id).toBe(g.id);
  expect(
    (
      await h.app.inject({
        url: "/api/v1/session",
        headers: { cookie: g.cookie },
      })
    ).statusCode,
  ).toBe(401);
  expect(
    (
      await h.app.inject({
        url: "/api/v1/session",
        headers: { cookie: session(first).cookie },
      })
    ).statusCode,
  ).toBe(401);
  expect((await h.guest(g.body)).r.statusCode).toBe(403);
  expect(
    (await claim(g, { ...body, identityToken: "another-user" })).statusCode,
  ).toBe(403);
  expect((await claim({ ...g, csrf: "wrong" }, body)).statusCode).toBe(403);
  expect((await claim(g, claimBody())).statusCode).toBe(401);
  h.setTime(new Date(Date.now() + 301000));
  expect((await claim(g, body)).statusCode).toBe(401);
});
it("merges decks and history once; resolves two active matches with replayable abandonment, never a loss", async () => {
  const a = await h.guest();
  const account = session(await claim(a));
  const g = await h.guest();
  const create = async (s: typeof g | typeof account) =>
    h.app.inject({
      method: "POST",
      url: "/api/v1/matches",
      headers: h.headers(s),
      payload: createBody(),
    });
  const am = (await create(account)).json(),
    gm = (await create(g)).json();
  const body = claimBody();
  const conflict = await claim(g, body);
  expect(conflict.statusCode).toBe(409);
  expect(conflict.json().error.code).toBe("MERGE_MATCH_CONFLICT");
  const choice = {
    ...body,
    commandId: randomUUID(),
    keepMatchId: gm.view.matchId,
  };
  const merged = await claim(g, choice);
  expect(merged.statusCode).toBe(200);
  expect(merged.json().activeMatchId).toBe(gm.view.matchId);
  expect(merged.json().principal.id).toBe(account.id);
  const repeated = await claim(g, choice);
  expect(repeated.statusCode).toBe(200);
  const abandoned = await h.app.services.repository.loadMatch(
    account.id,
    am.view.matchId,
  );
  expect(abandoned.state.lifecycle).toBe("ABANDONED");
  expect(abandoned.state.outcome).toMatchObject({
    result: "NONE",
    reason: "ACCOUNT_MERGE",
  });
  expect(
    (await h.app.services.repository.replayMatch(account.id, am.view.matchId))
      .ok,
  ).toBe(true);
  const history = await h.app.inject({
    url: "/api/v1/matches",
    headers: { cookie: session(repeated).cookie },
  });
  expect(history.statusCode).toBe(200);
  expect(history.json().items).toHaveLength(2);
  expect(
    history
      .json()
      .items.find((v: { matchId: string }) => v.matchId === am.view.matchId)
      .outcome.result,
  ).toBe("NONE");
  expect(
    (
      await h.pool.query(
        "SELECT count(*)::int n FROM auth_claims WHERE source_principal_id=$1",
        [g.id],
      )
    ).rows[0].n,
  ).toBe(1);
});
it("requires CSRF and origin and prevents exchange from silently discarding an active guest", async () => {
  const g = await h.guest();
  expect(
    (
      await h.app.inject({
        method: "POST",
        url: "/api/v1/auth/exchange",
        headers: h.headers(g),
        payload: { commandId: randomUUID(), identityToken: identity.subject },
      })
    ).statusCode,
  ).toBe(403);
  expect(
    (
      await h.app.inject({
        method: "POST",
        url: "/api/v1/auth/claim-guest",
        headers: { ...h.headers(g), origin: origin + ".evil" },
        payload: claimBody(),
      })
    ).statusCode,
  ).toBe(403);
});
it("rolls back receipt collisions without changing either owner or revoking guest access", async () => {
  const a = await h.guest(),
    account = session(await claim(a)),
    g = await h.guest();
  const body = createBody();
  const old = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(account),
    payload: body,
  });
  const recent = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: body,
  });
  const result = await claim(g);
  expect(result.statusCode).toBe(409);
  expect(result.json().error.code).toBe("IDEMPOTENCY_CONFLICT");
  expect(
    (
      await h.app.inject({
        url: "/api/v1/session",
        headers: { cookie: g.cookie },
      })
    ).statusCode,
  ).toBe(200);
  const receipts = (
    await h.pool.query(
      "SELECT principal_id,resource_id FROM command_receipts WHERE command_id=$1 ORDER BY principal_id",
      [body.commandId],
    )
  ).rows;
  expect(receipts).toEqual(
    expect.arrayContaining([
      { principal_id: account.id, resource_id: old.json().view.matchId },
      { principal_id: g.id, resource_id: recent.json().view.matchId },
    ]),
  );
  expect(
    (
      await h.pool.query(
        "SELECT count(*)::int n FROM auth_claims WHERE source_principal_id=$1",
        [g.id],
      )
    ).rows[0].n,
  ).toBe(0);
});
it("serializes a concurrent guest command and merge without a missing transition or deadlock", async () => {
  const a = await h.guest(),
    account = session(await claim(a)),
    g = await h.guest();
  const match = (
    await h.app.inject({
      method: "POST",
      url: "/api/v1/matches",
      headers: h.headers(g),
      payload: createBody(),
    })
  ).json();
  const command = {
    commandId: randomUUID(),
    expectedRevision: 0,
    action: { kind: "PAUSE" },
  };
  const [mutation, merged] = await Promise.all([
    h.app.inject({
      method: "POST",
      url: `/api/v1/matches/${match.view.matchId}/commands`,
      headers: h.headers(g),
      payload: command,
    }),
    claim(g),
  ]);
  expect(merged.statusCode).toBe(200);
  expect([200, 401, 404]).toContain(mutation.statusCode);
  const record = await h.app.services.repository.loadMatch(
    account.id,
    match.view.matchId,
  );
  expect(record.revision).toBe(mutation.statusCode === 200 ? 1 : 0);
  expect(
    (
      await h.app.services.repository.replayMatch(
        account.id,
        match.view.matchId,
      )
    ).ok,
  ).toBe(true);
});
it("recovers completed merge with the already-issued live account cookie only, never an unrelated account session", async () => {
  const account = session(await claim(await h.guest())),
    g = await h.guest(),
    body = claimBody();
  const merged = await claim(g, body);
  expect(merged.statusCode).toBe(200);
  const issued = session(merged);
  const recovered = await claim(issued, body);
  expect(recovered.statusCode).toBe(200);
  expect(recovered.json().principal.id).toBe(account.id);
  expect((await claim(account, body)).statusCode).toBe(401);
  expect(
    (
      await claim(session(recovered), {
        ...body,
        identityToken: "wrong-subject",
      })
    ).statusCode,
  ).toBe(403);
  expect(
    (await claim(session(recovered), { ...body, keepMatchId: randomUUID() }))
      .statusCode,
  ).toBe(409);
  h.setTime(new Date(Date.now() + 301000));
  expect((await claim(session(recovered), body)).statusCode).toBe(401);
});
it("moves saved decks and their exact pending receipt to the account without copying on retry", async () => {
  const { coreCatalog } = await import("@oathfront/game-content");
  const preset = coreCatalog.presets[0]!;
  const account = session(await claim(await h.guest())),
    g = await h.guest();
  const saveBody = {
    commandId: randomUUID(),
    deck: {
      name: "Bộ bài của tôi",
      heroId: preset.heroId,
      entries: preset.entries,
      contentVersion: "core_v1",
    },
  };
  const first = await h.app.inject({
    method: "POST",
    url: "/api/v1/decks",
    headers: h.headers(g),
    payload: saveBody,
  });
  expect(first.statusCode).toBe(201);
  const body = claimBody();
  const moved = await claim(g, body);
  expect(moved.statusCode).toBe(200);
  const recovered = await claim(g, body);
  expect(recovered.statusCode).toBe(200);
  const retry = await h.app.inject({
    method: "POST",
    url: "/api/v1/decks",
    headers: h.headers(session(recovered)),
    payload: saveBody,
  });
  expect(retry.statusCode).toBe(201);
  expect(retry.json()).toEqual(first.json());
  expect(
    (
      await h.pool.query(
        "SELECT count(*)::int n FROM decks WHERE owner_id=$1",
        [account.id],
      )
    ).rows[0].n,
  ).toBe(1);
});
it("history pages contain only twenty owned skirmishes and reject another owner cursor", async () => {
  const account = session(await claim(await h.guest()));
  const principal = {
    id: account.id,
    kind: "ACCOUNT" as const,
    expiresAt: null,
  };
  for (let i = 0; i < 21; i++) {
    const created = await h.app.services.createMatch(
      principal,
      createBody() as import("@oathfront/contracts").CreateMatchRequest,
    );
    await h.app.services.executeCommand(principal, created.view.matchId, {
      commandId: randomUUID(),
      expectedRevision: 0,
      action: { kind: "SURRENDER" },
    });
  }
  const first = await h.app.inject({
    url: "/api/v1/matches",
    headers: h.headers(account),
  });
  expect(first.statusCode).toBe(200);
  expect(first.json().items).toHaveLength(20);
  const second = await h.app.inject({
    url:
      "/api/v1/matches?cursor=" + encodeURIComponent(first.json().nextCursor),
    headers: h.headers(account),
  });
  expect(second.json().items).toHaveLength(1);
  expect(second.json().nextCursor).toBeNull();
  expect(
    new Set(
      [...first.json().items, ...second.json().items].map(
        (m: { matchId: string }) => m.matchId,
      ),
    ).size,
  ).toBe(21);
  const other = await h.guest();
  expect(
    (
      await h.app.inject({
        url:
          "/api/v1/matches?cursor=" +
          encodeURIComponent(first.json().nextCursor),
        headers: h.headers(other),
      })
    ).statusCode,
  ).toBe(400);
});
