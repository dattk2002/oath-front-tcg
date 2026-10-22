import { transaction } from "@oathfront/db";
import type { Pool } from "@oathfront/db";
import { abandonMatch, hashState } from "@oathfront/game-engine";
import type { JournalEntry } from "@oathfront/game-engine";
import type { ClaimGuestRequest } from "@oathfront/contracts";
import type { VerifiedIdentity } from "./neon-jwt.js";
import { accountExpiry } from "./neon-jwt.js";
import { issueSession, readSourceSession } from "./sessions.js";
import { requireCsrf } from "./csrf.js";
import { lockSubject } from "./exchange.js";
import {
  lockPrincipals,
  readRecord,
  persistTransition,
} from "../matches/repository.js";
import { hashJson } from "../matches/initialization.js";
import { summaryReader } from "../matches/summary.js";
import { HttpError } from "../http.js";
export async function claimGuest(
  pool: Pool,
  source: { cookie: unknown; csrf: unknown },
  identity: VerifiedIdentity,
  request: ClaimGuestRequest,
  secret: string,
  now: Date,
) {
  const expiry = accountExpiry(identity, now);
  const hash = hashJson({
    method: "POST",
    path: "/api/v1/auth/claim-guest",
    commandId: request.commandId,
    subject: identity.subject,
    keepMatchId: request.keepMatchId,
  });
  return transaction(pool, async (tx) => {
    await lockSubject(tx, identity.subject);
    const proof = await readSourceSession(tx, source.cookie, secret);
    requireCsrf(source.csrf, proof.csrf_hash);
    const account = (
      await tx.query("SELECT * FROM principals WHERE auth_subject=$1", [
        identity.subject,
      ])
    ).rows[0];
    const issuedClaim = (
      await tx.query(
        "SELECT * FROM auth_claims WHERE last_issued_session_id=$1",
        [proof.id],
      )
    ).rows[0];
    await lockPrincipals(tx, [
      proof.principal_id,
      ...(account ? [account.id] : []),
      ...(issuedClaim ? [issuedClaim.source_principal_id] : []),
    ]);
    const previous = issuedClaim
      ? (
          await tx.query(
            "SELECT * FROM auth_claims WHERE source_session_id=$1 AND command_id=$2",
            [issuedClaim.source_session_id, issuedClaim.command_id],
          )
        ).rows[0]
      : (
          await tx.query(
            "SELECT * FROM auth_claims WHERE source_principal_id=$1",
            [proof.principal_id],
          )
        ).rows[0];
    if (previous) {
      if (previous.auth_subject !== identity.subject)
        throw new HttpError(403, "FORBIDDEN");
      const currentProof = (
        await tx.query(
          "SELECT s.*,p.kind,p.auth_subject FROM app_sessions s JOIN principals p ON p.id=s.principal_id WHERE s.id=$1",
          [proof.id],
        )
      ).rows[0];
      const sourceProof = previous.source_session_id === proof.id;
      const liveAccountProof =
        previous.last_issued_session_id === proof.id &&
        currentProof.kind === "ACCOUNT" &&
        currentProof.auth_subject === identity.subject &&
        currentProof.principal_id === previous.target_principal_id &&
        !currentProof.revoked_at &&
        currentProof.expires_at > now;
      if (
        (!sourceProof && !liveAccountProof) ||
        previous.command_id !== request.commandId ||
        previous.recover_until <= now
      )
        throw new HttpError(401, "SESSION_EXPIRED");
      if (previous.request_hash !== hash)
        throw new HttpError(409, "IDEMPOTENCY_CONFLICT");
      await tx.query("UPDATE app_sessions SET revoked_at=$2 WHERE id=$1", [
        previous.last_issued_session_id,
        now,
      ]);
      const issued = await issueSession(
        tx,
        previous.target_principal_id,
        expiry,
        secret,
        now,
      );
      await tx.query(
        "UPDATE auth_claims SET last_issued_session_id=$3 WHERE source_session_id=$1 AND command_id=$2",
        [previous.source_session_id, request.commandId, issued.id],
      );
      return issued;
    }
    const guest = (
      await tx.query("SELECT * FROM principals WHERE id=$1", [
        proof.principal_id,
      ])
    ).rows[0];
    const current = (
      await tx.query("SELECT * FROM app_sessions WHERE id=$1", [proof.id])
    ).rows[0];
    if (
      guest.kind !== "GUEST" ||
      guest.merged_into_principal_id ||
      guest.expires_at <= now ||
      current.revoked_at ||
      current.expires_at <= now
    )
      throw new HttpError(401, "SESSION_EXPIRED");
    const target = account?.id ?? guest.id;
    if (account) {
      const collision = await tx.query(
        "SELECT 1 FROM command_receipts g JOIN command_receipts a USING(command_id) WHERE g.principal_id=$1 AND a.principal_id=$2 LIMIT 1",
        [guest.id, target],
      );
      if (collision.rowCount) throw new HttpError(409, "IDEMPOTENCY_CONFLICT");
      const active = (
        await tx.query(
          "SELECT id,human_principal_id FROM matches WHERE human_principal_id=ANY($1::uuid[]) AND status IN ('ACTIVE','PAUSED') ORDER BY id FOR UPDATE",
          [[guest.id, target]],
        )
      ).rows;
      if (active.length === 2) {
        const gm = active.find((m) => m.human_principal_id === guest.id)!,
          am = active.find((m) => m.human_principal_id === target)!;
        if (request.keepMatchId === null) {
          const reader = summaryReader(tx, () => now);
          throw new HttpError(409, "MERGE_MATCH_CONFLICT", {
            guestMatch: await reader.readMatchSummary(
              { id: guest.id, kind: "GUEST", expiresAt: guest.expires_at },
              gm.id,
            ),
            accountMatch: await reader.readMatchSummary(
              { id: target, kind: "ACCOUNT", expiresAt: null },
              am.id,
            ),
          });
        }
        if (!active.some((m) => m.id === request.keepMatchId))
          throw new HttpError(403, "FORBIDDEN");
        const loser = active.find((m) => m.id !== request.keepMatchId)!;
        const record = await readRecord(
          tx,
          loser.human_principal_id,
          loser.id,
          true,
          now,
        );
        const transition = abandonMatch(record.state, "ACCOUNT_MERGE");
        const entry: JournalEntry = {
          stepSeq: record.lastStepSeq + 1,
          origin: "AUTO",
          action: { kind: "ADMIN_ABANDON", reason: "ACCOUNT_MERGE" },
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
          { now },
        );
      } else if (request.keepMatchId !== null)
        throw new HttpError(403, "FORBIDDEN");
      // Preserve each deck identity/version and disambiguate only colliding display names.
      await tx.query(
        "UPDATE decks g SET name=left(g.name,29)||' · từ khách' WHERE g.owner_id=$1 AND EXISTS(SELECT 1 FROM decks a WHERE a.owner_id=$2 AND a.name=g.name)",
        [guest.id, target],
      );
      await tx.query("UPDATE decks SET owner_id=$2 WHERE owner_id=$1", [
        guest.id,
        target,
      ]);
      await tx.query(
        "UPDATE matches SET human_principal_id=$2 WHERE human_principal_id=$1",
        [guest.id, target],
      );
      await tx.query(
        "UPDATE daily_attempts SET principal_id=$2 WHERE principal_id=$1",
        [guest.id, target],
      );
      await tx.query("UPDATE match_results SET owner_id=$2 WHERE owner_id=$1", [
        guest.id,
        target,
      ]);
      await tx.query(
        "UPDATE command_receipts SET principal_id=$2 WHERE principal_id=$1",
        [guest.id, target],
      );
      await tx.query(
        "UPDATE principals a SET tutorial_completed_at=coalesce(a.tutorial_completed_at,g.tutorial_completed_at),evil_tutorial_completed_at=coalesce(a.evil_tutorial_completed_at,g.evil_tutorial_completed_at) FROM principals g WHERE a.id=$1 AND g.id=$2",
        [target, guest.id],
      );
      await tx.query(
        "UPDATE principals SET merged_into_principal_id=$2,merged_at=$3 WHERE id=$1",
        [guest.id, target, now],
      );
    } else {
      if (request.keepMatchId !== null) throw new HttpError(403, "FORBIDDEN");
      await tx.query(
        "UPDATE principals SET kind='ACCOUNT',auth_subject=$2,expires_at=NULL,display_name=$3 WHERE id=$1",
        [guest.id, identity.subject, identity.displayName],
      );
    }
    await tx.query(
      "UPDATE matches SET expires_at=$2 WHERE human_principal_id=$1 AND status IN ('ACTIVE','PAUSED') AND mode<>'DAILY_CHALLENGE'",
      [target, new Date(now.getTime() + 30 * 86400000)],
    );
    await tx.query(
      "UPDATE command_receipts SET expires_at=greatest(expires_at,$2) WHERE principal_id=$1",
      [target, new Date(now.getTime() + 30 * 86400000)],
    );
    await tx.query(
      "UPDATE app_sessions SET revoked_at=$2 WHERE principal_id=$1 AND revoked_at IS NULL",
      [guest.id, now],
    );
    const issued = await issueSession(tx, target, expiry, secret, now);
    await tx.query(
      "INSERT INTO auth_claims(source_session_id,command_id,source_principal_id,target_principal_id,auth_subject,request_hash,result,last_issued_session_id,committed_at,recover_until,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
      [
        proof.id,
        request.commandId,
        guest.id,
        target,
        identity.subject,
        hash,
        JSON.stringify({ targetPrincipalId: target }),
        issued.id,
        now,
        new Date(now.getTime() + 300000),
        new Date(now.getTime() + 7 * 86400000),
      ],
    );
    return issued;
  });
}
