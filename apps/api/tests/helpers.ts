import type { Pool } from "pg";
import { safeInteger } from "@oathfront/db";
export async function inspect(
  pool: Pool,
  principalId: string,
  matchId: string,
) {
  const checkpoint = (
    await pool.query(
      "SELECT c.* FROM match_checkpoints c JOIN matches m ON m.id=c.match_id WHERE m.id=$1 AND m.human_principal_id=$2",
      [matchId, principalId],
    )
  ).rows[0];
  const events = (
    await pool.query(
      'SELECT event_id AS "eventId",seq AS sequence,root_id AS "rootId",kind,visibility,owner_side AS "ownerSide",payload FROM match_events WHERE match_id=$1 ORDER BY seq',
      [matchId],
    )
  ).rows;
  const journal = (
    await pool.query(
      "SELECT * FROM match_action_journal WHERE match_id=$1 ORDER BY step_seq",
      [matchId],
    )
  ).rows;
  const receipts = (
    await pool.query(
      "SELECT * FROM command_receipts WHERE resource_id=$1 AND principal_id=$2 ORDER BY created_at,command_id",
      [matchId, principalId],
    )
  ).rows;
  const results = (
    await pool.query("SELECT * FROM match_results WHERE match_id=$1", [matchId])
  ).rows;
  return {
    checkpoint,
    events: events.map((e) => ({ ...e, sequence: safeInteger(e.sequence) })),
    journal,
    receipts,
    results,
  };
}
