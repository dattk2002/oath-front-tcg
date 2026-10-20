import { it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { checked } from "../src/http.js";
import { harness, createBody } from "./http-helpers.js";
const h = harness({ commandDeadlineMs: 80 });
it("returns unknown-result503 at deadline while the real transaction settles once and retry recovers its receipt", async () => {
  const g = await h.guest();
  const initial = await h.app.services.createMatch(
    {
      id: g.id,
      kind: "GUEST",
      expiresAt: new Date(g.r.json().principal.expiresAt),
    },
    checked("CreateMatchRequest", createBody()),
  );
  const id = initial.view.matchId,
    body = {
      commandId: randomUUID(),
      expectedRevision: 0,
      action: { kind: "MULLIGAN", cardInstanceIds: [] },
    },
    url = `/api/v1/matches/${id}/commands`,
    headers = h.headers(g);
  const lock = await h.owner.connect();
  await lock.query("BEGIN");
  await lock.query("SELECT id FROM principals WHERE id=$1 FOR UPDATE", [g.id]);
  try {
    const response = await h.app.inject({
      method: "POST",
      url,
      headers,
      payload: body,
    });
    expect(response.statusCode).toBe(503);
    expect(h.app.inFlightMutations.size).toBe(1);
    expect(response.json().error).toMatchObject({
      code: "TEMPORARILY_UNAVAILABLE",
      retryable: true,
    });
  } finally {
    await lock.query("COMMIT");
    lock.release();
  }
  // Observe the original accepted work; never replay it from a timeout handler.
  await Promise.allSettled(h.app.inFlightMutations);
  const retry = await h.app.inject({
    method: "POST",
    url,
    headers,
    payload: body,
  });
  expect(retry.statusCode).toBe(200);
  expect(retry.json().revision).toBe(1);
  expect(
    (
      await h.pool.query(
        "SELECT count(*)::int n FROM command_receipts WHERE command_id=$1",
        [body.commandId],
      )
    ).rows[0].n,
  ).toBe(1);
  expect(
    (
      await h.pool.query(
        "SELECT count(*)::int n FROM match_action_journal WHERE match_id=$1",
        [id],
      )
    ).rows[0].n,
  ).toBe(1);
});
it("consumes a late rejected mutation and drains it before application close", async () => {
  const g = await h.guest();
  const initial = await h.app.services.createMatch(
    {
      id: g.id,
      kind: "GUEST",
      expiresAt: new Date(g.r.json().principal.expiresAt),
    },
    checked("CreateMatchRequest", createBody()),
  );
  const lock = await h.owner.connect();
  await lock.query("BEGIN");
  await lock.query("SELECT id FROM principals WHERE id=$1 FOR UPDATE", [g.id]);
  const commandId = randomUUID();
  try {
    const response = await h.app.inject({
      method: "POST",
      url: `/api/v1/matches/${initial.view.matchId}/commands`,
      headers: h.headers(g),
      payload: { commandId, expectedRevision: 10, action: { kind: "PAUSE" } },
    });
    expect(response.statusCode).toBe(503);
    expect(h.app.inFlightMutations.size).toBe(1);
  } finally {
    await lock.query("COMMIT");
    lock.release();
  }
  const results = await Promise.allSettled(h.app.inFlightMutations);
  expect(results.map((r) => r.status)).toEqual(["rejected"]);
  expect(h.app.inFlightMutations.size).toBe(0);
  expect(
    (
      await h.pool.query(
        "SELECT count(*)::int n FROM command_receipts WHERE command_id=$1",
        [commandId],
      )
    ).rows[0].n,
  ).toBe(0);
});
