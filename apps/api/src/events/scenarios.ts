import type { Pool, PoolClient } from "@oathfront/db";
import { scenarioForId, contentHash } from "@oathfront/game-content/events";
import type { AuthoredScenario } from "@oathfront/game-content/events";
import { PersistenceError } from "../matches/checkpoint.js";
/** A deployment must retain every immutable manifest used by a saved challenge. */
export async function loadScenario(
  db: Pool | PoolClient,
  id: string,
): Promise<AuthoredScenario> {
  const row = (
      await db.query("SELECT * FROM event_scenarios WHERE id=$1", [id])
    ).rows[0],
    known = scenarioForId(id);
  if (
    !row ||
    !known ||
    row.sha256 !== known.sha256 ||
    contentHash(row.manifest) !== row.sha256 ||
    row.event_id !== known.eventId ||
    row.day_index !== known.dayIndex ||
    row.content_version !== known.contentVersion ||
    row.arena_key !== known.arenaKey
  )
    throw new PersistenceError("VERSION_UNSUPPORTED");
  return { ...known, manifest: row.manifest };
}
