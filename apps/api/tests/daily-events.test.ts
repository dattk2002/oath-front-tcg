import { beforeEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { harness, createBody } from "./http-helpers.js";
import { seedLiveFixture } from "./live-content-fixture.js";
const h = harness({
  verifyIdentity: async (token) => ({
    subject: token,
    displayName: "Event player",
    expiresAt: new Date("2027-01-01T00:00:00Z"),
  }),
});
beforeEach(async () => {
  await seedLiveFixture(h.owner);
  h.setTime(new Date("2026-10-26T01:00:00Z"));
});
async function account() {
  const g = await h.guest();
  await h.owner.query(
    "UPDATE principals SET kind='ACCOUNT',auth_subject=$2,expires_at=NULL WHERE id=$1",
    [g.id, `daily-test:${g.id}`],
  );
  return g;
}
function daily(
  g: Awaited<ReturnType<typeof account>>,
  scenarioId = "season01-week01-day1",
  commandId = randomUUID(),
  practice = false,
) {
  return h.app.inject({
    method: "POST",
    url: "/api/v1/events/daily-matches",
    headers: h.headers(g),
    payload: { commandId, scenarioId, practice },
  });
}
it("creates/resumes one bound challenge, replays exact initialization before time gates and rejects future starts", async () => {
  const g = await account(),
    commandId = randomUUID();
  const created = await daily(g, undefined, commandId);
  expect(created.statusCode).toBe(201);
  expect(created.json().view).toMatchObject({
    mode: "DAILY_CHALLENGE",
    challenge: { scenarioId: "season01-week01-day1", dayIndex: 0 },
    phase: "GOOD_PLAY",
  });
  expect((await daily(g, undefined, commandId)).json()).toEqual(created.json());
  const active = await daily(g);
  expect(active.statusCode).toBe(409);
  expect(active.json().error).toMatchObject({
    code: "ACTIVE_MATCH_EXISTS",
    details: { matchId: created.json().view.matchId },
  });
  const stored = await h.app.services.repository.loadMatch(
    g.id,
    created.json().view.matchId,
  );
  expect(
    (await h.app.services.repository.replayMatch(g.id, stored.id)).finalState,
  ).toEqual(stored.state);
  h.setTime(new Date("2026-10-27T00:00:00Z"));
  expect((await daily(g, undefined, commandId)).json()).toEqual(created.json());
  const other = await account();
  const future = await daily(other, "season01-week01-day3");
  expect(future.statusCode).toBe(409);
  expect(future.json().error.code).toBe("DAILY_UNAVAILABLE");
});
it("surrender starts an exact one-hour cooldown while disconnect/reload keeps the same attempt", async () => {
  const g = await account(),
    made = await daily(g);
  expect(made.statusCode).toBe(201);
  const id = made.json().view.matchId;
  const reload = await h.app.inject({
    url: `/api/v1/matches/${id}`,
    headers: h.headers(g),
  });
  expect(reload.statusCode).toBe(200);
  expect(
    (await h.owner.query("SELECT count(*)::int AS n FROM daily_attempts"))
      .rows[0].n,
  ).toBe(1);
  const payload = {
    commandId: randomUUID(),
    expectedRevision: 0,
    action: { kind: "SURRENDER" },
  };
  const request = {
    method: "POST" as const,
    url: `/api/v1/matches/${id}/commands`,
    headers: h.headers(g),
    payload,
  };
  const lost = await h.app.inject(request);
  expect(lost.statusCode).toBe(200);
  expect(lost.json().view.outcome.result).toBe("LOSS");
  expect((await h.app.inject(request)).json()).toEqual(lost.json());
  const denied = await daily(g);
  expect(denied.statusCode).toBe(409);
  expect(denied.json().error.details).toMatchObject({
    reason: "COOLDOWN",
    retryAvailableAt: "2026-10-26T02:00:00.000Z",
  });
  h.setTime(new Date("2026-10-26T01:59:59.999Z"));
  expect((await daily(g)).statusCode).toBe(409);
  h.setTime(new Date("2026-10-26T02:00:00.000Z"));
  expect((await daily(g)).statusCode).toBe(201);
  const progress = await h.app.inject({
    url: "/api/v1/events/first-light-week-01/progress",
    headers: h.headers(g),
  });
  expect(progress.json()).toMatchObject({ tickets: 0, completedDays: [] });
});
it("allows guest practice but never binds it to an eligible account after a later sign-in", async () => {
  const g = await h.guest();
  expect((await daily(g)).statusCode).toBe(403);
  const practice = await daily(g, undefined, randomUUID(), true);
  expect(practice.statusCode).toBe(201);
  const binding = (
    await h.owner.query(
      "SELECT kind,eligible_account_id FROM match_reward_bindings WHERE match_id=$1",
      [practice.json().view.matchId],
    )
  ).rows[0];
  expect(binding).toEqual({ kind: "PRACTICE", eligible_account_id: null });
  await h.owner.query(
    "UPDATE principals SET kind='ACCOUNT',auth_subject=$2,expires_at=NULL WHERE id=$1",
    [g.id, `claim-test:${g.id}`],
  );
  expect(
    (
      await h.owner.query(
        "SELECT eligible_account_id FROM match_reward_bindings WHERE match_id=$1",
        [practice.json().view.matchId],
      )
    ).rows[0].eligible_account_id,
  ).toBeNull();
  const collection = await h.app.inject({
    url: "/api/v1/collection",
    headers: h.headers(g),
  });
  expect(collection.statusCode).toBe(200);
  expect(
    collection.json().items.find((c: { cardId: string }) => c.cardId === "E01")
      .quantity,
  ).toBe(0);
  expect(
    collection.json().items.find((c: { cardId: string }) => c.cardId === "GC01")
      .quantity,
  ).toBe(2);
});
it("binds normal PvE eligibility at creation and keeps guests ineligible", async () => {
  const g = await h.guest();
  let made = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(g),
    payload: createBody(),
  });
  expect(made.statusCode).toBe(201);
  let bound = (
    await h.owner.query(
      "SELECT eligible_account_id FROM match_reward_bindings WHERE match_id=$1",
      [made.json().view.matchId],
    )
  ).rows[0];
  expect(bound).toEqual({ eligible_account_id: null });
  const a = await account();
  made = await h.app.inject({
    method: "POST",
    url: "/api/v1/matches",
    headers: h.headers(a),
    payload: { ...createBody(), expectedContentVersion: "elements_v1" },
  });
  expect(made.statusCode).toBe(201);
  bound = (
    await h.owner.query(
      "SELECT eligible_account_id,event_id,day_index FROM match_reward_bindings WHERE match_id=$1",
      [made.json().view.matchId],
    )
  ).rows[0];
  expect(bound).toEqual({
    eligible_account_id: a.id,
    event_id: "season01-week01",
    day_index: 0,
  });
});

it("plays a real server challenge through its terminal action and atomically unlocks a permanent card", async () => {
  const { chooseBotAction } = await import("@oathfront/bot");
  const g = await account();
  const start = Date.parse("2026-10-30T01:00:00Z");
  h.setTime(new Date(start));
  // Plausible retained history: four daily wins (400), the three-day bonus (200), and500 PvE tickets on prior days.
  await h.owner.query(
    "INSERT INTO weekly_progress(account_id,event_id,tickets) VALUES($1,'season01-week01',1100)",
    [g.id],
  );
  for (const [source, kind, amount, day] of [
    ["daily:0", "DAILY", 100, 0],
    ["daily:1", "DAILY", 100, 1],
    ["daily:2", "DAILY", 100, 2],
    ["daily:3", "DAILY", 100, 3],
    ["milestone:3", "MILESTONE", 200, 2],
    ["pve:retained-0", "PVE", 200, 0],
    ["pve:retained-1", "PVE", 200, 1],
    ["pve:retained-2", "PVE", 100, 2],
  ] as const)
    await h.owner.query(
      "INSERT INTO reward_ledger(id,account_id,event_id,source_key,kind,tickets,day_index,earned_at) VALUES($1,$2,'season01-week01',$3,$4,$5,$6,$7)",
      [
        randomUUID(),
        g.id,
        source,
        kind,
        amount,
        day,
        new Date(Date.parse("2026-10-26T00:00:00Z") + day * 86400000 + 3600000),
      ],
    );
  const created = await daily(g, "season01-week01-day5");
  expect(created.statusCode).toBe(201);
  let response = created.json<import("@oathfront/contracts").CommandResponse>();
  let random: import("@oathfront/game-engine").RandomState = [1, 2, 3, 4];
  const memory: import("@oathfront/contracts").VisibleEvent[] = [];
  let lastRequest: import("fastify").InjectOptions | undefined;
  for (
    let step = 0;
    response.view.lifecycle === "ACTIVE" && step < 450;
    step++
  ) {
    h.setTime(new Date(start + step * 1000));
    memory.push(...response.events);
    let action: import("@oathfront/contracts").PlayerAction = {
      kind: "ADVANCE",
    };
    if (!response.needsAdvance) {
      const decision = chooseBotAction(
        response.view,
        response.view.legalActions,
        {
          difficulty: "NORMAL",
          randomState: random,
          observationMemory: memory.slice(-80),
        },
      );
      action = decision.action;
      random = decision.nextBotRandomState;
    }
    const request = {
      method: "POST" as const,
      url: `/api/v1/matches/${response.view.matchId}/commands`,
      headers: h.headers(g),
      payload: {
        commandId: randomUUID(),
        expectedRevision: response.revision,
        action,
      },
    };
    lastRequest = request;
    const result = await h.app.inject(request);
    expect(result.statusCode, JSON.stringify(result.json())).toBe(200);
    response = result.json();
  }
  expect(response.view.outcome?.result).toBe("WIN");
  const summary = await h.app.inject({
    url: `/api/v1/matches/${response.view.matchId}/summary`,
    headers: h.headers(g),
  });
  expect(summary.statusCode).toBe(200);
  expect(summary.json().rewards).toMatchObject({
    tickets: 400,
    cards: [{ cardId: "E01", quantity: 1, source: "EVENT" }],
    eligibility: "ELIGIBLE",
  });
  const collection = await h.app.inject({
    url: "/api/v1/collection",
    headers: h.headers(g),
  });
  expect(
    collection.json().items.find((c: { cardId: string }) => c.cardId === "E01")
      .quantity,
  ).toBe(1);
  if (lastRequest)
    expect((await h.app.inject(lastRequest)).json()).toEqual(response);
  const progress = await h.app.inject({
    url: "/api/v1/events/first-light-week-01/progress",
    headers: h.headers(g),
  });
  expect(progress.json()).toMatchObject({
    tickets: 1500,
    completedDays: [0, 1, 2, 3, 4],
    ownedCopies: 1,
  });
  const stored = await h.app.services.repository.loadMatch(
    g.id,
    response.view.matchId,
  );
  expect(
    (await h.app.services.repository.replayMatch(g.id, stored.id)).finalState,
  ).toEqual(stored.state);
  const denied = await daily(g, "season01-week01-day5");
  expect(denied.statusCode).toBe(409);
  expect(denied.json().error.details.reason).toBe("COMPLETED");
}, 30000);

it("claims a guest practice into an existing account without extending its deadline or inventing reward eligibility", async () => {
  const identityToken = "event-google-account";
  const auth = await h.app.inject({
    method: "POST",
    url: "/api/v1/auth/exchange",
    headers: { origin: "https://oathfront.test" },
    payload: { commandId: randomUUID(), identityToken },
  });
  expect(auth.statusCode).toBe(200);
  const accountId = auth.json().principal.id;
  const g = await h.guest(),
    made = await daily(g, undefined, randomUUID(), true);
  expect(made.statusCode).toBe(201);
  const id = made.json().view.matchId;
  const before = (
    await h.owner.query("SELECT expires_at FROM matches WHERE id=$1", [id])
  ).rows[0].expires_at;
  const claimed = await h.app.inject({
    method: "POST",
    url: "/api/v1/auth/claim-guest",
    headers: h.headers(g),
    payload: { commandId: randomUUID(), identityToken, keepMatchId: null },
  });
  expect(claimed.statusCode).toBe(200);
  expect(claimed.json().principal.id).toBe(accountId);
  expect(
    (await h.owner.query("SELECT expires_at FROM matches WHERE id=$1", [id]))
      .rows[0].expires_at,
  ).toEqual(before);
  expect(
    (
      await h.owner.query(
        "SELECT principal_id FROM daily_attempts WHERE match_id=$1",
        [id],
      )
    ).rows[0].principal_id,
  ).toBe(accountId);
  expect(
    (
      await h.owner.query(
        "SELECT eligible_account_id FROM match_reward_bindings WHERE match_id=$1",
        [id],
      )
    ).rows[0].eligible_account_id,
  ).toBeNull();
});
it("serializes simultaneous daily creates and returns an exact receipt for an uncertain duplicate", async () => {
  const g = await account(),
    id = randomUUID();
  const [a, b] = await Promise.all([
    daily(g, undefined, id),
    daily(g, undefined, id),
  ]);
  expect(a.statusCode).toBe(201);
  expect(b.statusCode).toBe(201);
  expect(a.json()).toEqual(b.json());
  expect(
    (
      await h.owner.query(
        "SELECT count(*)::int AS n FROM daily_attempts WHERE principal_id=$1",
        [g.id],
      )
    ).rows[0].n,
  ).toBe(1);
  const changed = await daily(g, undefined, id, true);
  expect(changed.statusCode).toBe(409);
  expect(changed.json().error.code).toBe("IDEMPOTENCY_CONFLICT");
});
it("expires an old disconnected challenge without a penalty before starting today's unlocked scenario", async () => {
  const g = await account(),
    made = await daily(g);
  expect(made.statusCode).toBe(201);
  h.setTime(new Date("2026-10-28T00:00:00.001Z"));
  const next = await daily(g, "season01-week01-day3");
  expect(next.statusCode).toBe(201);
  const old = (
    await h.owner.query(
      "SELECT status,retry_available_at FROM daily_attempts WHERE match_id=$1",
      [made.json().view.matchId],
    )
  ).rows[0];
  expect(old).toEqual({ status: "FAULTED", retry_available_at: null });
  expect(
    (
      await h.owner.query(
        "SELECT count(*)::int AS n FROM reward_ledger WHERE account_id=$1",
        [g.id],
      )
    ).rows[0].n,
  ).toBe(0);
});

it("keeps a previous-day attempt resumable through grace but closes its reward entry after a late loss", async () => {
  const g = await account();
  h.setTime(new Date("2026-10-26T23:59:00Z"));
  const created = await daily(g);
  expect(created.statusCode).toBe(201);
  h.setTime(new Date("2026-10-27T00:10:00Z"));
  let progress = await h.app.inject({
    url: "/api/v1/events/first-light-week-01/progress",
    headers: h.headers(g),
  });
  expect(progress.json().daily[0].status).toBe("ACTIVE");
  expect((await daily(g, "season01-week01-day2")).json().error.code).toBe(
    "ACTIVE_MATCH_EXISTS",
  );
  const result = await h.app.inject({
    method: "POST",
    url: `/api/v1/matches/${created.json().view.matchId}/commands`,
    headers: h.headers(g),
    payload: {
      commandId: randomUUID(),
      expectedRevision: 0,
      action: { kind: "SURRENDER" },
    },
  });
  expect(result.statusCode).toBe(200);
  progress = await h.app.inject({
    url: "/api/v1/events/first-light-week-01/progress",
    headers: h.headers(g),
  });
  expect(progress.json().daily[0].status).toBe("CLOSED");
  expect(progress.json().daily[1].status).toBe("AVAILABLE");
  expect((await daily(g, "season01-week01-day2")).statusCode).toBe(201);
});
it("keeps a daily match readable after a fresh API startup and rejects client-supplied rewards", async () => {
  const g = await account();
  const forged = await h.app.inject({
    method: "POST",
    url: "/api/v1/events/daily-matches",
    headers: h.headers(g),
    payload: {
      commandId: randomUUID(),
      scenarioId: "season01-week01-day1",
      practice: false,
      tickets: 2400,
      won: true,
    },
  });
  expect(forged.statusCode).toBe(400);
  const created = await daily(g);
  expect(created.statusCode).toBe(201);
  const { buildApp } = await import("../src/app.js");
  const restarted = buildApp({
    pool: h.pool,
    origin: "https://oathfront.test",
    secret: "9".repeat(64),
    now: () => new Date("2026-10-26T01:00:00Z"),
  });
  try {
    await restarted.ready();
    const loaded = await restarted.services.repository.loadMatch(
      g.id,
      created.json().view.matchId,
    );
    expect(loaded.state.challenge?.scenarioId).toBe("season01-week01-day1");
    expect(
      (await restarted.services.repository.replayMatch(g.id, loaded.id))
        .finalState,
    ).toEqual(loaded.state);
  } finally {
    await restarted.close();
  }
});
