import { transaction } from "@oathfront/db";
import type { Pool, PoolClient } from "@oathfront/db";
import { abandonMatch, hashState } from "@oathfront/game-engine";
import type { JournalEntry } from "@oathfront/game-engine";
import { readRecord, persistTransition } from "../matches/repository.js";
export interface RetentionReport {
  expiredMatches: number;
  deletedGuests: number;
  deletedDetails: number;
  deletedHistories: number;
  deletedRateWindows: number;
}
async function deleteDetails(tx: PoolClient, ids: string[]) {
  for (const table of [
    "match_events",
    "match_action_journal",
    "match_checkpoints",
    "match_initializations",
  ])
    await tx.query(`DELETE FROM ${table} WHERE match_id=ANY($1::uuid[])`, [
      ids,
    ]);
}
/** Owner/maintenance connection only: runtime deliberately cannot delete append-only journals.
 * Cutoff is a fixed UTC instant. Each principal transaction rechecks eligibility after its lock.
 */
export async function runRetention(
  db: Pool,
  cutoff: Date,
): Promise<RetentionReport> {
  if (!Number.isFinite(+cutoff))
    throw new TypeError("Invalid retention cutoff");
  const report: RetentionReport = {
    expiredMatches: 0,
    deletedGuests: 0,
    deletedDetails: 0,
    deletedHistories: 0,
    deletedRateWindows: 0,
  };
  const ids = (await db.query("SELECT id FROM principals ORDER BY id")).rows;
  for (const { id } of ids) {
    const delta = await transaction(db, async (tx) => {
      const p = (
        await tx.query("SELECT * FROM principals WHERE id=$1 FOR UPDATE", [id])
      ).rows[0];
      const counts = {
        expiredMatches: 0,
        deletedGuests: 0,
        deletedDetails: 0,
        deletedHistories: 0,
      };
      if (!p) return counts;
      // Claims and bootstraps are tombstones, not five-minute recovery caches.
      await tx.query(
        "DELETE FROM auth_claims WHERE source_principal_id=$1 AND expires_at<=$2",
        [id, cutoff],
      );
      await tx.query(
        "DELETE FROM guest_bootstraps WHERE principal_id=$1 AND expires_at<=$2",
        [id, cutoff],
      );
      const guestExpired = p.kind === "GUEST" && p.expires_at <= cutoff;
      const matches = (
        await tx.query(
          "SELECT * FROM matches WHERE human_principal_id=$1 ORDER BY id FOR UPDATE",
          [id],
        )
      ).rows;
      for (const m of matches) {
        if (
          !guestExpired &&
          ["ACTIVE", "PAUSED"].includes(m.status) &&
          m.expires_at <= cutoff
        ) {
          const record = await readRecord(tx, id, m.id, true, cutoff);
          const transition = abandonMatch(record.state, "EXPIRED");
          const entry: JournalEntry = {
            stepSeq: record.lastStepSeq + 1,
            origin: "AUTO",
            action: { kind: "ADMIN_ABANDON", reason: "EXPIRED" },
            nextBotRandomState: null,
            preStateHash: hashState(record.state),
            postStateHash: hashState(transition.nextState),
            firstEventSeq: transition.events[0]?.sequence ?? null,
            lastEventSeq: transition.events.at(-1)?.sequence ?? null,
          };
          await persistTransition(
            { client: tx, record },
            transition,
            [entry],
            null,
            { now: cutoff },
          );
          counts.expiredMatches++;
        }
        if (
          guestExpired ||
          (!["ACTIVE", "PAUSED"].includes(m.status) &&
            m.details_expires_at <= cutoff)
        ) {
          const present = await tx.query(
            "SELECT 1 FROM match_checkpoints WHERE match_id=$1",
            [m.id],
          );
          await deleteDetails(tx, [m.id]);
          counts.deletedDetails += present.rowCount ?? 0;
        }
        if (
          guestExpired ||
          (m.history_expires_at && m.history_expires_at <= cutoff)
        ) {
          await tx.query(
            "DELETE FROM command_receipts WHERE resource_id=$1 AND principal_id=$2",
            [m.id, id],
          );
          await tx.query("DELETE FROM match_results WHERE match_id=$1", [m.id]);
          await tx.query("DELETE FROM matches WHERE id=$1", [m.id]);
          counts.deletedHistories++;
        }
      }
      await tx.query(
        "DELETE FROM command_receipts r WHERE principal_id=$1 AND expires_at<=$2 AND NOT EXISTS(SELECT 1 FROM matches m WHERE m.id=r.resource_id AND m.status IN ('ACTIVE','PAUSED'))",
        [id, cutoff],
      );
      await tx.query(
        "DELETE FROM app_sessions s WHERE principal_id=$1 AND (least(expires_at,coalesce(revoked_at,expires_at))<=$2::timestamptz-interval '7 days' OR $3) AND NOT EXISTS(SELECT 1 FROM auth_claims a WHERE a.source_session_id=s.id OR a.last_issued_session_id=s.id) AND NOT EXISTS(SELECT 1 FROM guest_bootstraps g WHERE g.last_issued_session_id=s.id)",
        [id, cutoff, guestExpired],
      );
      if (guestExpired) {
        await tx.query("DELETE FROM command_receipts WHERE principal_id=$1", [
          id,
        ]);
        await tx.query(
          "DELETE FROM deck_versions WHERE deck_id IN (SELECT id FROM decks WHERE owner_id=$1)",
          [id],
        );
        await tx.query("DELETE FROM decks WHERE owner_id=$1", [id]);
        // A still-live claim audit or another merged principal keeps this minimal owner tombstone.
        const deleted = await tx.query(
          "DELETE FROM principals p WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM auth_claims a WHERE a.source_principal_id=p.id OR a.target_principal_id=p.id) AND NOT EXISTS(SELECT 1 FROM app_sessions s WHERE s.principal_id=p.id) AND NOT EXISTS(SELECT 1 FROM guest_bootstraps g WHERE g.principal_id=p.id) AND NOT EXISTS(SELECT 1 FROM principals q WHERE q.merged_into_principal_id=p.id)",
          [id],
        );
        counts.deletedGuests = deleted.rowCount ?? 0;
      }
      return counts;
    });
    for (const key of Object.keys(delta) as (keyof typeof delta)[])
      report[key] += delta[key];
  }
  report.deletedRateWindows =
    (
      await db.query("DELETE FROM rate_limit_windows WHERE expires_at<=$1", [
        cutoff,
      ])
    ).rowCount ?? 0;
  return report;
}
