import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { harness, createBody } from "./http-helpers.js";
const h = harness();
it("atomically creates initialization and receipt, retries before revision, conflicts on different bodies", async () => {
  const g = await h.guest(),
    body = createBody(),
    headers = h.headers(g);
  const create = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers,
    payload: body,
  });
  expect(create.statusCode).toBe(201);
  expect(
    (
      await h.app.inject({
        method: "POST",
        url: "/api/v1/matches",
        headers,
        payload: body,
      })
    ).body,
  ).toBe(create.body);
  const id = create.json().view.matchId,
    command = {
      commandId: randomUUID(),
      expectedRevision: 0,
      action: { kind: "MULLIGAN", cardInstanceIds: [] },
    };
  const first = await h.app.inject({
    method: "POST",
    url: `/api/v1/matches/${id}/commands`,
    headers,
    payload: command,
  });
  expect(first.statusCode).toBe(200);
  expect(
    (
      await h.app.inject({
        method: "POST",
        url: `/api/v1/matches/${id}/commands`,
        headers,
        payload: command,
      })
    ).body,
  ).toBe(first.body);
  expect(
    (
      await h.app.inject({
        method: "POST",
        url: `/api/v1/matches/${id}/commands`,
        headers,
        payload: { ...command, action: { kind: "PAUSE" } },
      })
    ).statusCode,
  ).toBe(409);
  const concurrent = await Promise.all(
    ["PAUSE", "SURRENDER"].map((kind) =>
      h.app.inject({
        method: "POST",
        url: `/api/v1/matches/${id}/commands`,
        headers,
        payload: {
          commandId: randomUUID(),
          expectedRevision: 1,
          action: { kind },
        },
      }),
    ),
  );
  expect(concurrent.map((r) => r.statusCode).sort()).toEqual([200, 409]);
  expect(
    (
      await h.pool.query(
        "SELECT count(*)::int n FROM command_receipts WHERE command_id=$1",
        [command.commandId],
      )
    ).rows[0].n,
  ).toBe(1);
});
it("rejects version mismatch before creating durable match", async () => {
  const g = await h.guest();
  const r = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: { ...createBody(), expectedContentVersion: "future_v2" },
  });
  expect(r.statusCode).toBe(409);
  expect(
    (await h.pool.query("SELECT count(*)::int n FROM matches")).rows[0].n,
  ).toBe(0);
});
it("fails closed for corrupted durable receipt and defers tutorial scenario setup to its registry", async () => {
  const g = await h.guest(),
    body = createBody(),
    headers = h.headers(g);
  expect(
    (
      await h.app.inject({
        method: "POST",
        url: "/api/v1/matches",
        headers,
        payload: {
          commandId: randomUUID(),
          mode: "TUTORIAL",
          scenarioId: "tutorial_v1",
        },
      })
    ).statusCode,
  ).toBe(409);
  const first = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers,
    payload: body,
  });
  expect(first.statusCode).toBe(201);
  await h.owner.query(
    'UPDATE command_receipts SET response=response||\'{"seed":"DO_NOT_EXPOSE"}\'::jsonb WHERE command_id=$1',
    [body.commandId],
  );
  const retry = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers,
    payload: body,
  });
  expect(retry.statusCode).toBe(500);
  expect(retry.body).not.toContain("DO_NOT_EXPOSE");
});
it("enforces shared fixed windows for guest, create and command attempts", async () => {
  const g = await h.guest(),
    headers = h.headers(g);
  // Saturate actual shared counters through accepted attempts; distinct app instances share PostgreSQL.
  const create = createBody();
  for (let i = 0; i < 10; i++)
    expect(
      (
        await h.app.inject({
          method: "POST",
          url: "/api/v1/matches",
          headers,
          payload: create,
        })
      ).statusCode,
    ).toBe(201);
  expect(
    (
      await h.app.inject({
        method: "POST",
        url: "/api/v1/matches",
        headers,
        payload: create,
      })
    ).statusCode,
  ).toBe(429);
  const id = (await h.app.inject({ url: "/api/v1/matches", headers })).json()
    .items[0].matchId;
  // HMAC domain separates command from create keys; populate by making one command then saturating its own row.
  const cmd = {
    commandId: randomUUID(),
    expectedRevision: 0,
    action: { kind: "PAUSE" },
  };
  expect(
    (
      await h.app.inject({
        method: "POST",
        url: `/api/v1/matches/${id}/commands`,
        headers,
        payload: cmd,
      })
    ).statusCode,
  ).toBe(200);
  await h.owner.query(
    "UPDATE rate_limit_windows SET count=120 WHERE scope='COMMAND'",
  );
  expect(
    (
      await h.app.inject({
        method: "POST",
        url: `/api/v1/matches/${id}/commands`,
        headers,
        payload: cmd,
      })
    ).statusCode,
  ).toBe(429);
  await h.owner.query(
    "UPDATE rate_limit_windows SET count=20 WHERE scope='GUEST_BOOTSTRAP'",
  );
  expect((await h.guest()).r.statusCode).toBe(429);
});
it("reloads a durable zero-mana block response and resumes its precise combat lane", async () => {
  const { pierceVolcano } =
    await import("../../../packages/game-engine/tests/fixtures/combat-pierce-volcano.js");
  const { advanceAutomatic, hashState } =
    await import("@oathfront/game-engine");
  const { encodeCheckpoint } = await import("../src/matches/checkpoint.js");
  const g = await h.guest();
  const created = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: createBody(),
  });
  const id = created.json().view.matchId;
  // Install a named combat checkpoint fixture; exercise actual DB decode + HTTP commands from that checkpoint.
  const state = advanceAutomatic(pierceVolcano(), { maxRoots: 8 }).nextState;
  state.matchId = id;
  state.players.GOOD.energy.current = 0;
  await h.owner.query(
    "UPDATE match_checkpoints SET state=$2,state_hash=$3,last_event_seq=$4 WHERE match_id=$1",
    [id, encodeCheckpoint(state), hashState(state), state.eventSeq],
  );
  const snapshot = await h.app.inject({
    url: `/api/v1/matches/${id}`,
    headers: h.headers(g),
  });
  expect(snapshot.statusCode).toBe(200);
  const view = snapshot.json().view;
  expect(view.blockResponse).toMatchObject({
    visibility: "OWN",
    side: "GOOD",
    laneId: 1,
    costNow: 0,
  });
  expect(view.players.GOOD.energy.current).toBe(0);
  expect(snapshot.json().needsAdvance).toBe(false);
  const summary = await h.app.inject({
    url: `/api/v1/matches/${id}/summary`,
    headers: h.headers(g),
  });
  expect(summary.json().turns).toBe(5);
  const used = await h.app.inject({
    method: "POST",
    url: `/api/v1/matches/${id}/commands`,
    headers: h.headers(g),
    payload: {
      commandId: randomUUID(),
      expectedRevision: 0,
      action: {
        kind: "USE_BLOCK_POWER",
        powerInstanceId: view.blockResponse.powerInstanceId,
        target: { kind: "UNIT", instanceId: view.board[0].good.instanceId },
      },
    },
  });
  expect(used.statusCode).toBe(200);
  expect(used.json().view.players.GOOD.energy.current).toBe(0);
  expect(used.json().view.combat.laneId).toBe(1);
  expect(used.json().needsAdvance).toBe(true);
});
it("extends account active match and existing receipt retention on accepted activity", async () => {
  const g = await h.guest();
  await h.owner.query(
    "UPDATE principals SET kind='ACCOUNT',auth_subject=$2,expires_at=NULL WHERE id=$1",
    [g.id, "subject:" + g.id],
  );
  const create = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: createBody(),
  });
  const id = create.json().view.matchId;
  const future = new Date(Date.now() + 86400000);
  h.setTime(future);
  const r = await h.app.inject({
    method: "POST",
    url: `/api/v1/matches/${id}/commands`,
    headers: h.headers(g),
    payload: {
      commandId: randomUUID(),
      expectedRevision: 0,
      action: { kind: "PAUSE" },
    },
  });
  expect(r.statusCode).toBe(200);
  const row = (
    await h.pool.query("SELECT expires_at FROM matches WHERE id=$1", [id])
  ).rows[0];
  expect(row.expires_at.getTime()).toBe(future.getTime() + 30 * 86400000);
  const receipts = (
    await h.pool.query(
      "SELECT expires_at FROM command_receipts WHERE resource_id=$1",
      [id],
    )
  ).rows;
  expect(receipts).toHaveLength(2);
  expect(
    receipts.every((r) => r.expires_at.getTime() === row.expires_at.getTime()),
  ).toBe(true);
});
