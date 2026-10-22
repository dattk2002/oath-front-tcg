import { randomUUID } from "node:crypto";
import type { PoolClient } from "@oathfront/db";
import { catalogForVersion } from "@oathfront/game-content";
import type { SessionPrincipal } from "../auth/sessions.js";

export async function bindPveMatch(
  tx: PoolClient,
  principal: SessionPrincipal,
  matchId: string,
  time: Date,
) {
  const event = (
    await tx.query(
      "SELECT id,starts_at FROM weekly_events WHERE state='PUBLISHED' AND starts_at<=$1 AND ends_at>$1 ORDER BY starts_at LIMIT 1",
      [time],
    )
  ).rows[0];
  if (!event) return;
  const day = Math.floor((+time - +event.starts_at) / 86400000),
    end = new Date(+event.starts_at + (day + 1) * 86400000);
  await tx.query(
    "INSERT INTO match_reward_bindings(match_id,event_id,eligible_account_id,kind,day_index,bound_day_ends_at,completion_deadline) VALUES($1,$2,$3,'PVE',$4,$5,$6)",
    [
      matchId,
      event.id,
      principal.kind === "ACCOUNT" ? principal.id : null,
      day,
      end,
      new Date(+end + 86400000),
    ],
  );
}
/** Called inside result persistence while holding the principal lock. Amounts come only from server result rows. */
export async function settleMatchRewards(
  tx: PoolClient,
  matchId: string,
  now: Date,
): Promise<void> {
  const row = (
    await tx.query(
      `SELECT b.*,m.human_principal_id,m.mode,m.content_version,m.created_at,r.outcome,r.reason,r.ended_at,r.owner_id,r.human_hero_id,e.featured_card_id,e.systems,e.starts_at,e.ends_at,p.kind AS principal_kind FROM match_reward_bindings b JOIN matches m ON m.id=b.match_id JOIN match_results r ON r.match_id=m.id JOIN weekly_events e ON e.id=b.event_id LEFT JOIN principals p ON p.id=b.eligible_account_id WHERE b.match_id=$1`,
      [matchId],
    )
  ).rows[0];
  if (!row) return;
  const ended: Date = row.ended_at;
  const status =
    row.outcome === "WIN"
      ? "WIN"
      : row.outcome === "LOSS"
        ? "LOSS"
        : row.outcome === "DRAW"
          ? "DRAW"
          : "FAULTED";
  await tx.query(
    "UPDATE daily_attempts SET status=$2,ended_at=$3,retry_available_at=$4 WHERE match_id=$1 AND status='ACTIVE'",
    [
      matchId,
      status,
      ended,
      status === "LOSS" ? new Date(+ended + 3600000) : null,
    ],
  );
  if (
    !row.eligible_account_id ||
    row.principal_kind !== "ACCOUNT" ||
    row.owner_id !== row.eligible_account_id ||
    row.kind === "PRACTICE" ||
    row.outcome !== "WIN" ||
    +ended > +row.completion_deadline ||
    +ended < +row.created_at ||
    +row.created_at < +row.starts_at ||
    +row.created_at >= +row.ends_at ||
    +row.created_at >= +row.bound_day_ends_at ||
    +row.created_at < +row.bound_day_ends_at - 86400000
  )
    return;
  if (
    (row.kind === "DAILY" && row.mode !== "DAILY_CHALLENGE") ||
    (row.kind === "PVE" && row.mode !== "SKIRMISH")
  )
    return;
  const account = row.eligible_account_id,
    event = row.event_id,
    day = row.day_index;
  async function ticket(
    source: string,
    kind: "DAILY" | "PVE" | "MILESTONE",
    amount: number,
  ) {
    if (amount <= 0) return false;
    const inserted = await tx.query(
      "INSERT INTO reward_ledger(id,account_id,event_id,source_key,kind,tickets,day_index,match_id,earned_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(account_id,event_id,source_key) DO NOTHING RETURNING id",
      [randomUUID(), account, event, source, kind, amount, day, matchId, ended],
    );
    if (!inserted.rowCount) return false;
    await tx.query(
      "INSERT INTO weekly_progress(account_id,event_id,tickets,updated_at) VALUES($1,$2,$3,$4) ON CONFLICT(account_id,event_id) DO UPDATE SET tickets=weekly_progress.tickets+EXCLUDED.tickets,updated_at=EXCLUDED.updated_at",
      [account, event, amount, now],
    );
    return true;
  }
  if (row.kind === "DAILY") {
    await ticket(`daily:${day}`, "DAILY", 100);
    const completed = (
      await tx.query(
        "SELECT count(*)::int AS n FROM reward_ledger WHERE account_id=$1 AND event_id=$2 AND kind='DAILY'",
        [account, event],
      )
    ).rows[0].n;
    if (completed >= 3) await ticket("milestone:3", "MILESTONE", 200);
    if (completed >= 5) await ticket("milestone:5", "MILESTONE", 300);
    if (completed >= 7) {
      const key = `${event}:seven-days`;
      const award = await tx.query(
        "INSERT INTO reward_ledger(id,account_id,event_id,source_key,kind,tickets,cosmetic_key,day_index,match_id,earned_at) VALUES($1,$2,$3,'badge:7','COSMETIC',0,$4,$5,$6,$7) ON CONFLICT(account_id,event_id,source_key) DO NOTHING RETURNING id",
        [randomUUID(), account, event, key, day, matchId, ended],
      );
      if (award.rowCount)
        await tx.query(
          "INSERT INTO cosmetic_unlocks(account_id,cosmetic_key,event_id,earned_at) VALUES($1,$2,$3,$4) ON CONFLICT(account_id,cosmetic_key) DO NOTHING",
          [account, key, event, ended],
        );
    }
  } else {
    const hero = catalogForVersion(row.content_version)?.heroes.find(
        (h) => h.id === row.human_hero_id,
      ),
      systems: string[] = row.systems;
    const amount =
      50 + 50 * (hero?.classes.filter((c) => systems.includes(c)).length ?? 0);
    const used = (
      await tx.query(
        "SELECT coalesce(sum(tickets),0)::int AS n FROM reward_ledger WHERE account_id=$1 AND event_id=$2 AND kind='PVE' AND day_index=$3",
        [account, event, day],
      )
    ).rows[0].n;
    await ticket(
      `pve:${matchId}`,
      "PVE",
      Math.min(amount, Math.max(0, 200 - used)),
    );
  }
  const total =
    (
      await tx.query(
        "SELECT tickets FROM weekly_progress WHERE account_id=$1 AND event_id=$2",
        [account, event],
      )
    ).rows[0]?.tickets ?? 0;
  for (const [copy, threshold] of [
    [1, 1200],
    [2, 2400],
  ] as const) {
    if (total < threshold) continue;
    const award = await tx.query(
      "INSERT INTO reward_ledger(id,account_id,event_id,source_key,kind,tickets,card_id,day_index,match_id,earned_at) VALUES($1,$2,$3,$4,'CARD',0,$5,$6,$7,$8) ON CONFLICT(account_id,event_id,source_key) DO NOTHING RETURNING id",
      [
        randomUUID(),
        account,
        event,
        `copy:${copy}`,
        row.featured_card_id,
        day,
        matchId,
        ended,
      ],
    );
    if (award.rowCount)
      await tx.query(
        "INSERT INTO collection_items(account_id,card_id,quantity,first_earned_at,updated_at) VALUES($1,$2,1,$3,$3) ON CONFLICT(account_id,card_id) DO UPDATE SET quantity=least(2,collection_items.quantity+1),updated_at=EXCLUDED.updated_at",
        [account, row.featured_card_id, ended],
      );
  }
}
