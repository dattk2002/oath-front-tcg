import { createHmac, timingSafeEqual } from "node:crypto";
import { validateWire } from "@oathfront/contracts";
import type { AuthenticatedSession } from "../auth/sessions.js";
const audience = "oathfront:match-realtime:v1";
export interface TicketClaims {
  audience: typeof audience;
  sessionId: string;
  principalId: string;
  matchId: string;
  issuedAt: number;
  expiresAt: number;
}
function signature(encoded: string, secret: string) {
  return createHmac("sha256", secret)
    .update(audience + "\0" + encoded)
    .digest();
}
export function issueTicket(
  session: AuthenticatedSession,
  matchId: string,
  secret: string,
  now: Date,
) {
  const expiresAt = Math.min(
    now.getTime() + 30000,
    session.expiresAt.getTime(),
    session.principal.expiresAt?.getTime() ?? Infinity,
  );
  const claims: TicketClaims = {
    audience,
    sessionId: session.sessionId,
    principalId: session.principal.id,
    matchId,
    issuedAt: now.getTime(),
    expiresAt,
  };
  const encoded = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return {
    token: encoded + "." + signature(encoded, secret).toString("base64url"),
    expiresAt: new Date(expiresAt).toISOString(),
  };
}
export function verifyTicket(
  token: unknown,
  secret: string,
  now: Date,
): TicketClaims {
  if (
    typeof token !== "string" ||
    token.length > 1536 ||
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token)
  )
    throw Error("Invalid realtime ticket");
  const [encoded, signed] = token.split(".") as [string, string];
  const expected = signature(encoded, secret),
    actual = Buffer.from(signed, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw Error("Invalid realtime ticket");
  const value: unknown = JSON.parse(
    Buffer.from(encoded, "base64url").toString("utf8"),
  );
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid realtime ticket");
  const claims = value as TicketClaims;
  if (
    Object.keys(claims).sort().join() !==
      "audience,expiresAt,issuedAt,matchId,principalId,sessionId" ||
    claims.audience !== audience ||
    !validateWire("Uuid", claims.sessionId) ||
    !validateWire("Uuid", claims.principalId) ||
    !validateWire("Uuid", claims.matchId) ||
    !Number.isSafeInteger(claims.issuedAt) ||
    !Number.isSafeInteger(claims.expiresAt) ||
    claims.issuedAt > now.getTime() ||
    claims.expiresAt <= now.getTime() ||
    claims.expiresAt <= claims.issuedAt ||
    claims.expiresAt - claims.issuedAt > 30000
  )
    throw Error("Invalid realtime ticket");
  return claims;
}
