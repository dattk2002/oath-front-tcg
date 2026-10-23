import { safeInteger } from "@oathfront/db";
import type { Pool } from "@oathfront/db";
import { HttpError } from "../http.js";
import type { TicketClaims } from "./tickets.js";
/** Every delivery checks current session, principal and ownership together. */
export async function authorizeSubscription(
  pool: Pool,
  claims: Pick<TicketClaims, "sessionId" | "principalId" | "matchId">,
  now: Date,
) {
  const result = await pool.query(
    `SELECT m.revision, LEAST(s.expires_at, COALESCE(p.expires_at,s.expires_at)) AS expires_at
     FROM app_sessions s JOIN principals p ON p.id=s.principal_id
     JOIN matches m ON m.human_principal_id=p.id
     WHERE s.id=$1 AND p.id=$2 AND m.id=$3 AND s.revoked_at IS NULL
       AND s.expires_at>$4 AND (p.expires_at IS NULL OR p.expires_at>$4)
       AND p.merged_into_principal_id IS NULL`,
    [claims.sessionId, claims.principalId, claims.matchId, now],
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, "NOT_FOUND");
  const revision = safeInteger(row.revision);
  if (revision < 0) throw Error("Invalid match revision");
  return { revision, expiresAt: row.expires_at as Date };
}
