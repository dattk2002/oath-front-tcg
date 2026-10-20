import { it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { harness, createBody } from "./http-helpers.js";
import { recordAutomatic } from "../src/matches/journal.js";
import { persistTransition } from "../src/matches/repository.js";
import { botScheduler } from "../src/matches/advance.js";
import { commandResponse } from "../src/matches/events.js";
import { createRepository } from "../src/matches/repository.js";
const h = harness();
it("synthetic count64 checkpoint survives repository restart and yields one durable private fault, never a loss", async () => {
  const g = await h.guest(),
    headers = h.headers(g);
  const made = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers,
    payload: createBody(),
  });
  const id = made.json().view.matchId;
  const mulligan = await h.app.inject({
    method: "POST",
    url: `/api/v1/matches/${id}/commands`,
    headers,
    payload: {
      commandId: randomUUID(),
      expectedRevision: 0,
      action: { kind: "MULLIGAN", cardInstanceIds: [] },
    },
  });
  expect(mulligan.statusCode).toBe(200);
  // Explicit synthetic guard checkpoint: the game is naturally at bot mulligan, but64 prior intents are NOT claimed.
  await h.owner.query(
    "UPDATE matches SET bot_intents_this_turn=64 WHERE id=$1",
    [id],
  );
  const repo = createRepository(h.pool),
    before = await repo.loadMatch(g.id, id);
  expect(before.botIntentsThisTurn).toBe(64);
  const body = {
    commandId: randomUUID(),
    expectedRevision: 1,
    action: { kind: "ADVANCE" },
  };
  const fault = await h.app.inject({
    method: "POST",
    url: `/api/v1/matches/${id}/commands`,
    headers,
    payload: body,
  });
  expect(fault.statusCode).toBe(200);
  expect(fault.json().view.lifecycle).toBe("FAULTED");
  expect(fault.json().view.outcome).toBeNull();
  expect(fault.body).not.toContain("BotGuardFault");
  const after = await repo.loadMatch(g.id, id);
  expect(after.botIntentsThisTurn).toBe(64);
  const diagnostic = (
    await h.pool.query(
      "SELECT * FROM match_events WHERE match_id=$1 AND visibility='SERVER'",
      [id],
    )
  ).rows;
  expect(diagnostic).toHaveLength(1);
  expect(diagnostic[0]).toMatchObject({
    kind: "BotGuardFault",
    payload: { turn: 0, botIntents: 64 },
  });
  expect(
    (
      await h.pool.query(
        "SELECT outcome,reason FROM match_results WHERE match_id=$1",
        [id],
      )
    ).rows,
  ).toEqual([{ outcome: "FAULTED", reason: "FAULTED" }]);
  const events = await h.app.inject({
    method: "GET",
    url: `/api/v1/matches/${id}/events?afterSeq=0&throughSeq=${after.state.eventSeq}`,
    headers,
  });
  expect(events.statusCode).toBe(200);
  expect(events.body).not.toContain("BotGuardFault");
  const retry = await h.app.inject({
    method: "POST",
    url: `/api/v1/matches/${id}/commands`,
    headers,
    payload: body,
  });
  expect(retry.body).toBe(fault.body);
});
it("bounded persistence rejects scheduler guard mismatch and forged early fault before writing any row", async () => {
  const g = await h.guest();
  const made = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: createBody(),
  });
  const id = made.json().view.matchId;
  await h.app.inject({
    method: "POST",
    url: `/api/v1/matches/${id}/commands`,
    headers: h.headers(g),
    payload: {
      commandId: randomUUID(),
      expectedRevision: 0,
      action: { kind: "MULLIGAN", cardInstanceIds: [] },
    },
  });
  const repo = h.app.services.repository;
  for (const forged of [false, true])
    await expect(
      repo.withLockedMatch(g.id, id, async (tx, r) => {
        const step = forged
          ? recordAutomatic(r.state, r.lastStepSeq + 1, 64)
          : botScheduler.step(
              r.state,
              r.lastStepSeq + 1,
              r.botIntentsThisTurn,
            )!;
        await persistTransition(
          tx,
          step.transition,
          [step.entry],
          {
            commandId: randomUUID(),
            requestHash: "a".repeat(64),
            response: commandResponse(
              step.transition.nextState,
              r.revision + 1,
              step.transition.events,
              r.state.eventSeq,
              0,
              botScheduler,
            ),
            expiresAt: new Date(Date.now() + 86400000),
          },
          { botIntentsThisTurn: 1 },
        );
      }),
    ).rejects.toMatchObject({
      code: forged ? "INVALID_JOURNAL_TRANSITION" : "INVALID_BOT_GUARD",
    });
  const record = await repo.loadMatch(g.id, id);
  expect(record.revision).toBe(1);
  expect(record.botIntentsThisTurn).toBe(0);
  await h.owner.query(
    "UPDATE matches SET bot_intents_this_turn=1 WHERE id=$1",
    [id],
  );
  await expect(repo.replayMatch(g.id, id)).rejects.toMatchObject({
    code: "REPLAY_MISMATCH",
  });
  await h.owner.query(
    "UPDATE matches SET bot_intents_this_turn=0 WHERE id=$1",
    [id],
  );
  expect((await repo.replayMatch(g.id, id)).botIntentsThisTurn).toBe(0);

  expect(
    (
      await h.pool.query(
        "SELECT count(*)::int n FROM match_action_journal WHERE match_id=$1",
        [id],
      )
    ).rows[0].n,
  ).toBe(1);
});
