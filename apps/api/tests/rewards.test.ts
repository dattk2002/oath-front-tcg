import { beforeEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { HeroId } from "@oathfront/contracts";
import { seasonOne, seasonScenarios } from "@oathfront/game-content/events";
import { harness } from "./http-helpers.js";
import { seedLiveFixture } from "./live-content-fixture.js";
const h = harness();
beforeEach(() => seedLiveFixture(h.owner));
import { settleMatchRewards } from "../src/progression/rewards.js";
async function account() {
  const id = randomUUID();
  await h.owner.query(
    "INSERT INTO principals(id,kind,auth_subject,display_name) VALUES($1,'ACCOUNT',$2,'Reward fixture')",
    [id, `reward-test:${id}`],
  );
  return id;
}
/** Owner-authored terminal rows isolate reward arithmetic from move selection. A separate HTTP test plays a full server match. */
async function terminal(
  accountId: string,
  day: number,
  options: {
    kind?: "PVE" | "DAILY" | "PRACTICE";
    outcome?: "WIN" | "LOSS" | "DRAW" | "FAULTED";
    heroId?: HeroId;
    eligible?: boolean;
    week?: number;
    finishAt?: Date;
  } = {},
) {
  const id = randomUUID(),
    week = seasonOne[options.week ?? 0]!,
    scenario = seasonScenarios.find(
      (s) => s.eventId === week.id && s.dayIndex === day,
    )!,
    kind = options.kind ?? "DAILY",
    mode = kind === "PVE" ? "SKIRMISH" : "DAILY_CHALLENGE",
    outcome = options.outcome ?? "WIN",
    heroId = options.heroId ?? "H_G_BV",
    side = heroId.startsWith("H_G") ? "GOOD" : "EVIL";
  const start = new Date(Date.parse(week.startsAt) + day * 86400000 + 3600000),
    dayEnd = new Date(Date.parse(week.startsAt) + (day + 1) * 86400000),
    deadline = new Date(+dayEnd + 86400000);
  await h.owner.query(
    "INSERT INTO matches(id,human_principal_id,human_side,mode,status,revision,rules_version,content_version,location_version,bot_version,scenario_id,scenario_manifest_sha256,created_at,updated_at,expires_at,ended_at) VALUES($1,$2,$3,$4,$5,1,'rules_v1','elements_v1','locations_v1','bot_v1',$6,$7,$8,$8,$9,$10)",
    [
      id,
      accountId,
      side,
      mode,
      outcome === "FAULTED" ? "FAULTED" : "COMPLETED",
      mode === "SKIRMISH" ? null : scenario.id,
      mode === "SKIRMISH" ? null : scenario.sha256,
      start,
      deadline,
      options.finishAt ?? start,
    ],
  );
  await h.owner.query(
    "INSERT INTO match_results(match_id,owner_id,human_hero_id,bot_hero_id,difficulty,outcome,reason,turns,active_duration_ms,damage_dealt,blocks_used,summary,ended_at,expires_at) VALUES($1,$2,$3,$4,'NORMAL',$5,$6,5,0,20,0,'{}',$7,$8)",
    [
      id,
      accountId,
      heroId,
      side === "GOOD" ? "H_E_FX" : "H_G_BV",
      outcome,
      outcome === "FAULTED"
        ? "ENGINE_FAULT"
        : outcome === "DRAW"
          ? "TURN_LIMIT"
          : outcome === "LOSS"
            ? "SURRENDER"
            : "HERO_DEFEATED",
      options.finishAt ?? start,
      new Date(+start + 180 * 86400000),
    ],
  );
  await h.owner.query(
    "INSERT INTO match_reward_bindings(match_id,event_id,eligible_account_id,kind,day_index,bound_day_ends_at,completion_deadline) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [
      id,
      week.id,
      options.eligible === false || kind === "PRACTICE" ? null : accountId,
      kind,
      day,
      dayEnd,
      deadline,
    ],
  );
  if (kind !== "PVE")
    await h.owner.query(
      "INSERT INTO daily_attempts(id,match_id,principal_id,scenario_id,status,started_at) VALUES($1,$1,$2,$3,'ACTIVE',$4)",
      [id, accountId, scenario.id, start],
    );
  return { id, start, deadline, eventId: week.id };
}
async function settle(accountId: string, id: string, now: Date) {
  await h.app.services.repository.withPrincipalTransaction([accountId], (tx) =>
    settleMatchRewards(tx, id, now),
  );
}
async function tickets(id: string, eventId = "season01-week01") {
  return (
    (
      await h.owner.query(
        "SELECT tickets FROM weekly_progress WHERE account_id=$1 AND event_id=$2",
        [id, eventId],
      )
    ).rows[0]?.tickets ?? 0
  );
}
it("seven daily wins grant1200 tickets, one card and one badge exactly once across duplicate settlements", async () => {
  const id = await account(),
    expected = [100, 200, 500, 600, 1000, 1100, 1200];
  for (let day = 0; day < 7; day++) {
    const m = await terminal(id, day);
    await Promise.all([settle(id, m.id, m.start), settle(id, m.id, m.start)]);
    expect(await tickets(id)).toBe(expected[day]);
  }
  expect(
    (
      await h.owner.query(
        "SELECT card_id,quantity FROM collection_items WHERE account_id=$1",
        [id],
      )
    ).rows,
  ).toEqual([{ card_id: "E01", quantity: 1 }]);
  expect(
    (
      await h.owner.query(
        "SELECT count(*)::int AS n FROM cosmetic_unlocks WHERE account_id=$1",
        [id],
      )
    ).rows[0].n,
  ).toBe(1);
  expect(
    (
      await h.owner.query(
        "SELECT count(*)::int AS n FROM reward_ledger WHERE account_id=$1 AND kind='DAILY'",
        [id],
      )
    ).rows[0].n,
  ).toBe(7);
});
it("awards a second permanent copy at2400 and never a third, with independent daily and PvE pools", async () => {
  const id = await account();
  for (let day = 0; day < 7; day++) {
    let m = await terminal(id, day);
    await settle(id, m.id, m.start);
    for (let i = 0; i < 3; i++) {
      m = await terminal(id, day, { kind: "PVE" });
      await settle(id, m.id, m.start);
    }
  }
  expect(await tickets(id)).toBe(2600);
  expect(
    (
      await h.owner.query(
        "SELECT quantity FROM collection_items WHERE account_id=$1",
        [id],
      )
    ).rows[0].quantity,
  ).toBe(2);
  expect(
    (
      await h.owner.query(
        "SELECT count(*)::int AS n FROM reward_ledger WHERE account_id=$1 AND kind='CARD'",
        [id],
      )
    ).rows[0].n,
  ).toBe(2);
});
it("computes50/100/150 featured bonuses, caps PvE at200 per bound day and ignores non-wins", async () => {
  const id = await account();
  for (const [heroId, want] of [
    ["H_E_XS", 50],
    ["H_G_SOL", 150],
    ["H_G_BV", 200],
  ] as const) {
    const m = await terminal(id, 0, { kind: "PVE", heroId });
    await settle(id, m.id, m.start);
    expect(await tickets(id)).toBe(want);
  }
  for (const outcome of ["WIN", "LOSS", "DRAW", "FAULTED"] as const) {
    const m = await terminal(id, 0, { kind: "PVE", outcome });
    await settle(id, m.id, m.start);
  }
  expect(await tickets(id)).toBe(200);
  const tomorrow = await terminal(id, 1, { kind: "PVE" });
  await settle(id, tomorrow.id, tomorrow.start);
  expect(await tickets(id)).toBe(350);
});
it("credits the original week through its24h completion grace and expires weekly wallets without deleting cards", async () => {
  const id = await account(),
    old = await terminal(id, 6, { finishAt: new Date("2026-11-02T00:15:00Z") });
  await settle(id, old.id, new Date("2026-11-02T00:15:00Z"));
  expect(await tickets(id)).toBe(100);
  expect(await tickets(id, "season01-week02")).toBe(0);
  const fresh = await terminal(id, 0, { week: 1, kind: "PVE" });
  await settle(id, fresh.id, fresh.start);
  expect(await tickets(id, "season01-week02")).toBe(100);
  const late = await terminal(id, 5, {
    finishAt: new Date("2026-11-02T00:00:00.001Z"),
  });
  await settle(id, late.id, new Date(+late.deadline + 1));
  expect(await tickets(id)).toBe(100);
});
it("never upgrades guest-origin eligibility and leaves fault/draw retries without a loss cooldown", async () => {
  const id = await account();
  for (const kind of ["PVE", "PRACTICE"] as const) {
    const m = await terminal(id, 0, { kind, eligible: false });
    await settle(id, m.id, m.start);
  }
  expect(await tickets(id)).toBe(0);
  for (const outcome of ["FAULTED", "DRAW", "LOSS"] as const) {
    const m = await terminal(id, 1, { outcome });
    await settle(id, m.id, m.start);
    const row = (
      await h.owner.query(
        "SELECT status,retry_available_at FROM daily_attempts WHERE id=$1",
        [m.id],
      )
    ).rows[0];
    expect(row.status).toBe(outcome);
    expect(row.retry_available_at?.toISOString() ?? null).toBe(
      outcome === "LOSS" ? new Date(+m.start + 3600000).toISOString() : null,
    );
  }
});
