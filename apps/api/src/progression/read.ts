import type { Pool, PoolClient } from "@oathfront/db";
import { elementsCatalog } from "@oathfront/game-content";
import type { SessionPrincipal } from "../auth/sessions.js";
import { HttpError, output } from "../http.js";
import { ownedEventCards } from "./collection.js";
interface RewardRow {
  id: string;
  source_key: string;
  kind: string;
  tickets: number;
  card_id: string | null;
  cosmetic_key: string | null;
  earned_at: Date;
}
const rewardView = (r: RewardRow) => ({
  id: r.id,
  source: r.source_key,
  kind: r.kind,
  tickets: r.tickets,
  cardId: r.card_id,
  cosmeticKey: r.cosmetic_key,
  earnedAt: r.earned_at.toISOString(),
});
export function progressionReader(db: Pool, now: () => Date) {
  return {
    async collection(principal: SessionPrincipal) {
      const owned = await ownedEventCards(db, principal),
        cosmetics =
          principal.kind === "ACCOUNT"
            ? (
                await db.query(
                  "SELECT cosmetic_key,event_id,earned_at FROM cosmetic_unlocks WHERE account_id=$1 ORDER BY earned_at",
                  [principal.id],
                )
              ).rows
            : [];
      return output("CollectionView", {
        serverNow: now().toISOString(),
        rewardEligible: principal.kind === "ACCOUNT",
        items: elementsCatalog.cards.map((c) => ({
          cardId: c.id,
          quantity: c.rarity === "E" ? (owned.get(c.id) ?? 0) : 2,
          source: c.rarity === "E" ? "EVENT" : "BASE",
        })),
        cosmetics: cosmetics.map((r) => ({
          key: r.cosmetic_key,
          eventId: r.event_id,
          earnedAt: r.earned_at.toISOString(),
        })),
      });
    },
    async weekly(principal: SessionPrincipal, slug: string) {
      const time = now(),
        event = (
          await db.query(
            "SELECT id,starts_at,ends_at,featured_card_id FROM weekly_events WHERE slug=$1 AND state='PUBLISHED'",
            [slug],
          )
        ).rows[0];
      if (!event) throw new HttpError(404, "NOT_FOUND");
      const eligible = principal.kind === "ACCOUNT",
        account = principal.id,
        owned = await ownedEventCards(db, principal);
      const progress = eligible
        ? (
            await db.query(
              "SELECT tickets FROM weekly_progress WHERE account_id=$1 AND event_id=$2",
              [account, event.id],
            )
          ).rows[0]
        : null;
      const completed = eligible
        ? (
            await db.query(
              "SELECT day_index FROM reward_ledger WHERE account_id=$1 AND event_id=$2 AND kind='DAILY' ORDER BY day_index",
              [account, event.id],
            )
          ).rows.map((r) => r.day_index as number)
        : [];
      const day = Math.floor((+time - +event.starts_at) / 86400000);
      const pve =
        eligible && day >= 0 && day < 7
          ? (
              await db.query(
                "SELECT coalesce(sum(tickets),0)::int AS n FROM reward_ledger WHERE account_id=$1 AND event_id=$2 AND kind='PVE' AND day_index=$3",
                [account, event.id, day],
              )
            ).rows[0].n
          : 0;
      const scenarios = (
        await db.query<{ id: string; day_index: number }>(
          "SELECT id,day_index FROM event_scenarios WHERE event_id=$1 ORDER BY day_index",
          [event.id],
        )
      ).rows;
      const attempts = (
        await db.query(
          "SELECT DISTINCT ON (s.day_index,b.kind) s.day_index,b.kind,a.match_id,a.status,max(a.retry_available_at) OVER (PARTITION BY s.day_index,b.kind) AS retry_available_at,m.status AS match_status,m.expires_at FROM daily_attempts a JOIN event_scenarios s ON s.id=a.scenario_id JOIN match_reward_bindings b ON b.match_id=a.match_id LEFT JOIN matches m ON m.id=a.match_id WHERE a.principal_id=$1 AND s.event_id=$2 ORDER BY s.day_index,b.kind,a.started_at DESC,a.id DESC",
          [account, event.id],
        )
      ).rows;
      const history = eligible
        ? (
            await db.query<RewardRow>(
              "SELECT * FROM reward_ledger WHERE account_id=$1 AND event_id=$2 ORDER BY earned_at DESC,id LIMIT 100",
              [account, event.id],
            )
          ).rows
        : [];
      const badge = eligible
        ? !!(
            await db.query(
              "SELECT 1 FROM cosmetic_unlocks WHERE account_id=$1 AND event_id=$2",
              [account, event.id],
            )
          ).rowCount
        : false;
      const daily = (practice: boolean) =>
        scenarios.map((s) => {
          const a = attempts.find(
              (a) =>
                a.day_index === s.day_index &&
                a.kind === (practice ? "PRACTICE" : "DAILY"),
            ),
            rewarded = !practice && completed.includes(s.day_index),
            active =
              a?.status === "ACTIVE" &&
              ["ACTIVE", "PAUSED"].includes(a.match_status) &&
              +a.expires_at > +time;
          const cooldown =
            a?.retry_available_at && +a.retry_available_at > +time;
          const status = active
            ? "ACTIVE"
            : rewarded
              ? "COMPLETED"
              : day < s.day_index
                ? "UPCOMING"
                : !practice && day > s.day_index
                  ? "CLOSED"
                  : cooldown
                    ? "COOLDOWN"
                    : day === s.day_index || (!!practice && day > s.day_index)
                      ? "AVAILABLE"
                      : "CLOSED";
          return {
            scenarioId: s.id,
            dayIndex: s.day_index,
            status,
            matchId: active ? a.match_id : null,
            retryAvailableAt: cooldown
              ? a.retry_available_at.toISOString()
              : null,
            rewarded,
          };
        });
      return output("WeeklyProgressView", {
        serverNow: time.toISOString(),
        eventId: event.id,
        rewardEligible: eligible,
        tickets: progress?.tickets ?? 0,
        ownedCopies: owned.get(event.featured_card_id) ?? 0,
        completedDays: completed,
        pveEarnedToday: pve,
        pveCap: 200,
        cosmeticUnlocked: badge,
        history: history.map(rewardView),
        daily: daily(!eligible),
        practiceDaily: daily(true),
      });
    },
  };
}
export async function matchRewardSummary(
  db: Pool | PoolClient,
  principalId: string,
  matchId: string,
) {
  const bound = (
    await db.query(
      "SELECT b.event_id,b.kind,b.eligible_account_id,b.completion_deadline,m.ended_at FROM match_reward_bindings b JOIN matches m ON m.id=b.match_id WHERE b.match_id=$1 AND m.human_principal_id=$2",
      [matchId, principalId],
    )
  ).rows[0];
  if (!bound) return undefined;
  const rows = (
    await db.query<RewardRow>(
      "SELECT * FROM reward_ledger WHERE match_id=$1 AND account_id=$2 ORDER BY earned_at,id",
      [matchId, principalId],
    )
  ).rows;
  const cards = new Map<string, number>();
  for (const r of rows)
    if (r.kind === "CARD" && r.card_id)
      cards.set(r.card_id, (cards.get(r.card_id) ?? 0) + 1);
  return output("MatchRewardSummary", {
    eventId: bound.event_id,
    tickets: rows.reduce((n, r) => n + r.tickets, 0),
    cards: [...cards].map(([cardId, quantity]) => ({
      cardId,
      quantity,
      source: "EVENT",
    })),
    cosmetics: rows.flatMap((r) => (r.cosmetic_key ? [r.cosmetic_key] : [])),
    eligibility:
      bound.kind === "PRACTICE"
        ? "PRACTICE"
        : !bound.eligible_account_id
          ? "INELIGIBLE"
          : bound.ended_at && +bound.ended_at > +bound.completion_deadline
            ? "EXPIRED"
            : "ELIGIBLE",
  });
}
