import { randomUUID } from "node:crypto";
import { transaction } from "@oathfront/db";
import type { Pool, PoolClient } from "@oathfront/db";
import type { VerifiedIdentity } from "./neon-jwt.js";
import { accountExpiry } from "./neon-jwt.js";
import { issueSession, readSourceSession } from "./sessions.js";
import { requireCsrf } from "./csrf.js";
import { lockPrincipals } from "../matches/repository.js";
import { HttpError } from "../http.js";
export async function lockSubject(tx: PoolClient, subject: string) {
  await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    "auth:" + subject,
  ]);
}
export async function exchangeIdentity(
  pool: Pool,
  identity: VerifiedIdentity,
  commandId: string,
  secret: string,
  now: Date,
  source?: { cookie: unknown; csrf: unknown },
) {
  const expiresAt = accountExpiry(identity, now);
  return transaction(pool, async (tx) => {
    await lockSubject(tx, identity.subject);
    const previous = source
      ? await readSourceSession(tx, source.cookie, secret)
      : null;
    const existing = (
      await tx.query("SELECT id FROM principals WHERE auth_subject=$1", [
        identity.subject,
      ])
    ).rows[0];
    const ids = [
      ...(existing ? [existing.id] : []),
      ...(previous ? [previous.principal_id] : []),
    ].filter((x, i, a) => a.indexOf(x) === i);
    if (ids.length) await lockPrincipals(tx, ids);
    if (previous) {
      requireCsrf(source!.csrf, previous.csrf_hash);
      const current = (
        await tx.query(
          "SELECT s.*,p.kind,p.auth_subject,p.merged_into_principal_id,p.expires_at principal_expires_at FROM app_sessions s JOIN principals p ON p.id=s.principal_id WHERE s.id=$1",
          [previous.id],
        )
      ).rows[0];
      if (
        current.kind === "GUEST" &&
        !current.merged_into_principal_id &&
        current.principal_expires_at > now
      )
        throw new HttpError(403, "FORBIDDEN");
      if (
        current.kind === "ACCOUNT" &&
        current.auth_subject !== identity.subject
      )
        throw new HttpError(403, "FORBIDDEN");
      if (current.merged_into_principal_id) {
        const claim = (
          await tx.query(
            "SELECT auth_subject FROM auth_claims WHERE source_principal_id=$1",
            [previous.principal_id],
          )
        ).rows[0];
        if (claim?.auth_subject !== identity.subject)
          throw new HttpError(403, "FORBIDDEN");
      }
      // Revoked/expired proof plus CSRF may bind a fresh verified identity login,
      // never authorize gameplay or rerun a claim. Lost exchange responses are safe to retry.
    }
    const id = existing?.id ?? randomUUID();
    if (!existing)
      await tx.query(
        "INSERT INTO principals(id,kind,auth_subject,display_name,created_at) VALUES($1,'ACCOUNT',$2,$3,$4)",
        [id, identity.subject, identity.displayName, now],
      );
    if (previous)
      await tx.query("UPDATE app_sessions SET revoked_at=$2 WHERE id=$1", [
        previous.id,
        now,
      ]);
    // Identity serialization and the unique auth_subject make retries principal-idempotent.
    void commandId;
    return issueSession(tx, id, expiresAt, secret, now);
  });
}
