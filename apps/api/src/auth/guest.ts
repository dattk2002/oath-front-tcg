import { randomUUID } from "node:crypto";
import { transaction } from "@oathfront/db";
import type { Pool } from "@oathfront/db";
import type { GuestRequest } from "@oathfront/contracts";
import { digest, equalHash } from "./csrf.js";
import { issueSession } from "./sessions.js";
import { lockPrincipals } from "../matches/repository.js";
import { HttpError } from "../http.js";
export async function bootstrapGuest(
  pool: Pool,
  request: GuestRequest,
  secret: string,
  now: Date,
) {
  return transaction(pool, async (tx) => {
    // Serialize same bootstrap IDs across instances before a principal exists.
    await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      "guest:" + request.commandId,
    ]);
    const previous = (
      await tx.query("SELECT * FROM guest_bootstraps WHERE command_id=$1", [
        request.commandId,
      ])
    ).rows[0];
    let principalId: string, expiresAt: Date;
    if (previous) {
      await lockPrincipals(tx, [previous.principal_id]);
      const p = (
        await tx.query("SELECT * FROM principals WHERE id=$1", [
          previous.principal_id,
        ])
      ).rows[0];
      const claimed = await tx.query(
        "SELECT 1 FROM auth_claims WHERE source_principal_id=$1",
        [previous.principal_id],
      );
      if (
        !equalHash(
          previous.recovery_secret_hash,
          digest(request.recoverySecret),
        ) ||
        previous.recover_until <= now ||
        previous.expires_at <= now ||
        p.kind !== "GUEST" ||
        p.merged_into_principal_id ||
        p.expires_at <= now ||
        claimed.rowCount
      )
        throw new HttpError(403, "FORBIDDEN");
      principalId = p.id;
      expiresAt = p.expires_at;
      await tx.query("UPDATE app_sessions SET revoked_at=$2 WHERE id=$1", [
        previous.last_issued_session_id,
        now,
      ]);
    } else {
      principalId = randomUUID();
      expiresAt = new Date(now.getTime() + 7 * 86400000);
      await tx.query(
        "INSERT INTO principals(id,kind,display_name,created_at,expires_at) VALUES($1,'GUEST','Khách',$2,$3)",
        [principalId, now, expiresAt],
      );
    }
    const session = await issueSession(tx, principalId, expiresAt, secret, now);
    if (previous)
      await tx.query(
        "UPDATE guest_bootstraps SET last_issued_session_id=$2 WHERE command_id=$1",
        [request.commandId, session.id],
      );
    else
      await tx.query(
        "INSERT INTO guest_bootstraps(command_id,recovery_secret_hash,principal_id,last_issued_session_id,recover_until,created_at,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          request.commandId,
          digest(request.recoverySecret),
          principalId,
          session.id,
          new Date(now.getTime() + 300000),
          now,
          new Date(now.getTime() + 7 * 86400000),
        ],
      );
    return session;
  });
}
