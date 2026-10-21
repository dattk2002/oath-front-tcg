import { it, expect } from "vitest";
import { harness, createBody } from "./http-helpers.js";
const extended: Promise<unknown>[] = [];
const h = harness({
  commandDeadlineMs: 60,
  extendLifetime: (work) => {
    extended.push(work);
  },
});
it("registers pending transaction lifetime before503, drains it on shutdown, and commits one durable receipt", async () => {
  const g = await h.guest(),
    payload = createBody();
  const lock = await h.owner.connect();
  await lock.query("BEGIN");
  await lock.query("SELECT id FROM principals WHERE id=$1 FOR UPDATE", [g.id]);
  let closing: Promise<unknown> | undefined;
  try {
    const response = await h.app.inject({
      method: "POST",
      url: "/api/v1/matches",
      headers: h.headers(g),
      payload,
    });
    expect(response.statusCode).toBe(503);
    expect(extended).toHaveLength(1);
    let settled = false;
    extended[0]!.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    closing = h.app.close();
  } finally {
    await lock.query("COMMIT");
    lock.release();
  }
  await closing;
  await Promise.all(extended);
  expect(
    (
      await h.pool.query(
        "SELECT count(*)::int n FROM command_receipts WHERE command_id=$1",
        [payload.commandId],
      )
    ).rows[0].n,
  ).toBe(1);
  expect(
    (
      await h.pool.query(
        "SELECT count(*)::int n FROM matches WHERE human_principal_id=$1",
        [g.id],
      )
    ).rows[0].n,
  ).toBe(1);
});
