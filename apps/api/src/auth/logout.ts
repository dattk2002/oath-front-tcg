import { transaction } from "@oathfront/db";
import type { Pool } from "@oathfront/db";
import type { AuthenticatedSession } from "./sessions.js";
import { revalidateSession } from "./sessions.js";
import { lockPrincipals } from "../matches/repository.js";
export async function logout(
  pool: Pool,
  session: AuthenticatedSession,
  now: Date,
) {
  await transaction(pool, async (tx) => {
    await lockPrincipals(tx, [session.principal.id]);
    await revalidateSession(tx, session.principal, now);
    await tx.query("UPDATE app_sessions SET revoked_at=$2 WHERE id=$1", [
      session.sessionId,
      now,
    ]);
  });
}
