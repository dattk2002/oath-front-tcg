import { randomBytes, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "@oathfront/db";
import type { Principal, SessionResponse } from "@oathfront/contracts";
import { validateWire } from "@oathfront/contracts";
import { digest, csrfToken, equalHash } from "./csrf.js";
import { HttpError, output } from "../http.js";
export const cookieName = "__Host-ngulo-session";
export interface SessionPrincipal {
  id: string;
  kind: "GUEST" | "ACCOUNT";
  expiresAt: Date | null;
}
export interface AuthenticatedSession {
  principal: SessionPrincipal;
  sessionId: string;
  csrfHash: Buffer;
  token: string;
  expiresAt: Date;
  publicPrincipal: Principal;
}
export function cookie(token: string, expiresAt: Date) {
  return `${cookieName}=${token}; Path=/; Secure; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}`;
}
export async function issueSession(
  tx: PoolClient,
  principalId: string,
  expiresAt: Date,
  secret: string,
  now: Date,
) {
  const token = randomBytes(32).toString("hex"),
    id = randomUUID();
  await tx.query(
    "INSERT INTO app_sessions(id,principal_id,token_hash,csrf_hash,created_at,expires_at) VALUES($1,$2,$3,$4,$5,$6)",
    [
      id,
      principalId,
      digest(token),
      digest(csrfToken(token, secret)),
      now,
      expiresAt,
    ],
  );
  return { token, id, expiresAt };
}
export async function authenticate(
  pool: Pool,
  cookieHeader: unknown,
  secret: string,
  now: Date,
): Promise<AuthenticatedSession> {
  const candidates =
    typeof cookieHeader === "string"
      ? cookieHeader
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s.startsWith(cookieName + "="))
      : [];
  const token =
    candidates.length === 1 ? candidates[0]!.slice(cookieName.length + 1) : "";
  if (!/^[a-f0-9]{64}$/.test(token))
    throw new HttpError(401, "SESSION_EXPIRED");
  const r = await pool.query(
    "SELECT s.id session_id,s.expires_at session_expires_at,s.csrf_hash,p.* FROM app_sessions s JOIN principals p ON p.id=s.principal_id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>$2 AND (p.expires_at IS NULL OR p.expires_at>$2) AND p.merged_into_principal_id IS NULL",
    [digest(token), now],
  );
  const row = r.rows[0];
  if (!row || !equalHash(row.csrf_hash, digest(csrfToken(token, secret))))
    throw new HttpError(401, "SESSION_EXPIRED");
  const principal = output("Principal", {
    id: row.id,
    kind: row.kind,
    displayName: row.display_name,
    expiresAt: row.expires_at?.toISOString() ?? null,
    tutorialCompletedAt: row.tutorial_completed_at?.toISOString() ?? null,
    evilTutorialCompletedAt:
      row.evil_tutorial_completed_at?.toISOString() ?? null,
  });
  return {
    principal: {
      id: principal.id,
      kind: principal.kind,
      expiresAt: row.expires_at,
    },
    sessionId: row.session_id,
    csrfHash: row.csrf_hash,
    token,
    expiresAt: row.session_expires_at,
    publicPrincipal: principal,
  };
}
export async function sessionResponse(
  pool: Pool,
  session: AuthenticatedSession,
  secret: string,
): Promise<SessionResponse> {
  const r = await pool.query(
    "SELECT id FROM matches WHERE human_principal_id=$1 AND status IN ('ACTIVE','PAUSED')",
    [session.principal.id],
  );
  return output("SessionResponse", {
    principal: session.publicPrincipal,
    csrfToken: csrfToken(session.token, secret),
    sessionExpiresAt: session.expiresAt.toISOString(),
    activeMatchId: r.rows[0]?.id ?? null,
  });
}
export function requirePrincipal(principal: SessionPrincipal) {
  if (!validateWire("Uuid", principal.id))
    throw new HttpError(401, "SESSION_EXPIRED");
}
