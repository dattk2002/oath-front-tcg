import { matchRewardSummary } from "../progression/read.js";
import { loadScenario } from "../events/scenarios.js";
import type { Pool, PoolClient } from "@oathfront/db";
import { safeInteger } from "@oathfront/db";
import type { MatchSummary, ListQuery, MatchList } from "@oathfront/contracts";
import type { SessionPrincipal } from "../auth/sessions.js";
import { HttpError, output } from "../http.js";
import { readRecord } from "./repository.js";
export function summaryReader(pool: Pool | PoolClient, now: () => Date) {
  async function readMatchSummary(
    principal: SessionPrincipal,
    matchId: string,
  ): Promise<MatchSummary> {
    const r = await pool.query(
      "SELECT m.*,r.human_hero_id,r.bot_hero_id,r.difficulty,r.outcome,r.reason,r.turns,r.damage_dealt,r.blocks_used,r.expires_at result_expires_at FROM matches m LEFT JOIN match_results r ON r.match_id=m.id AND r.owner_id=$2 WHERE m.id=$1 AND m.human_principal_id=$2",
      [matchId, principal.id],
    );
    const row = r.rows[0];
    if (
      !row ||
      (row.history_expires_at && row.history_expires_at <= now()) ||
      (row.result_expires_at && row.result_expires_at <= now())
    )
      throw new HttpError(404, "NOT_FOUND");
    const init = (
      await pool.query(
        "SELECT heroes FROM match_initializations WHERE match_id=$1",
        [matchId],
      )
    ).rows[0];
    const active = ["ACTIVE", "PAUSED"].includes(row.status);
    const current = active
      ? await readRecord(pool, principal.id, matchId, false, now())
      : null;
    const scenario =
      row.mode === "DAILY_CHALLENGE"
        ? await loadScenario(pool, row.scenario_id)
        : null;
    const rewards = await matchRewardSummary(pool, principal.id, matchId);
    return output("MatchSummary", {
      ...(scenario
        ? {
            challenge: {
              scenarioId: scenario.id,
              eventId: scenario.eventId,
              dayIndex: scenario.dayIndex,
              manifestSha256: scenario.sha256,
              arenaKey: scenario.arenaKey,
            },
          }
        : {}),
      ...(rewards ? { rewards } : {}),
      matchId: row.id,
      mode: row.mode,
      lifecycle: row.status,
      humanHeroId: row.human_hero_id ?? init.heroes[row.human_side],
      opponentHeroId:
        row.bot_hero_id ??
        init.heroes[row.human_side === "GOOD" ? "EVIL" : "GOOD"],
      difficulty:
        row.mode === "TUTORIAL"
          ? null
          : (row.difficulty ??
            current?.state.difficulty ??
            row.rematch?.difficulty),
      outcome: row.outcome
        ? {
            result: ["ABANDONED", "FAULTED"].includes(row.outcome)
              ? "NONE"
              : row.outcome,
            winner:
              row.outcome === "WIN"
                ? row.human_side
                : row.outcome === "LOSS"
                  ? row.human_side === "GOOD"
                    ? "EVIL"
                    : "GOOD"
                  : null,
            reason: row.reason,
          }
        : null,
      turns: row.turns ?? current?.state.turn ?? 0,
      activeDurationMs: safeInteger(row.active_duration_ms),
      damageDealt:
        row.damage_dealt === null ? 0 : safeInteger(row.damage_dealt),
      createdAt: row.created_at.toISOString(),
      endedAt: row.ended_at?.toISOString() ?? null,
      resumable: active,
      blocksUsed:
        row.blocks_used ??
        current?.state.players[current.state.humanSide].block.used ??
        0,
      rematch: row.rematch,
    });
  }
  async function listMatches(
    principal: SessionPrincipal,
    query: ListQuery,
  ): Promise<MatchList> {
    let cursor: { date: string; id: string } | null = null;
    if (query.cursor) {
      try {
        const c: unknown = JSON.parse(
          Buffer.from(query.cursor, "base64url").toString(),
        );
        if (
          typeof c !== "object" ||
          c === null ||
          !("date" in c) ||
          !("id" in c) ||
          typeof c.date !== "string" ||
          typeof c.id !== "string" ||
          !/^\d{4}-/.test(c.date)
        )
          throw Error();
        cursor = { date: c.date, id: c.id };
        const owned = await pool.query(
          "SELECT 1 FROM matches WHERE id=$1 AND human_principal_id=$2 AND created_at=$3",
          [cursor.id, principal.id, cursor.date],
        );
        if (!owned.rowCount) throw Error();
      } catch {
        throw new HttpError(400, "VALIDATION_FAILED", {
          issues: [{ path: "/cursor", rule: "cursor" }],
        });
      }
    }
    const limit = query.limit ?? 20;
    const rows = (
      await pool.query(
        "SELECT id,created_at FROM matches WHERE human_principal_id=$1 AND mode IN ('SKIRMISH','DAILY_CHALLENGE') AND (history_expires_at IS NULL OR history_expires_at>$2) AND ($3::timestamptz IS NULL OR (created_at,id)<($3::timestamptz,$4::uuid)) ORDER BY created_at DESC,id DESC LIMIT $5",
        [
          principal.id,
          now(),
          cursor?.date ?? null,
          cursor?.id ?? null,
          limit + 1,
        ],
      )
    ).rows;
    const page = rows.slice(0, limit),
      last = page.at(-1);
    return output("MatchList", {
      items: await Promise.all(
        page.map((r) => readMatchSummary(principal, r.id)),
      ),
      nextCursor:
        rows.length > limit && last
          ? Buffer.from(
              JSON.stringify({
                date: last.created_at.toISOString(),
                id: last.id,
              }),
            ).toString("base64url")
          : null,
    });
  }
  return { readMatchSummary, listMatches };
}
