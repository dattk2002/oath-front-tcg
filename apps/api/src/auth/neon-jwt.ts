import { createRemoteJWKSet, jwtVerify } from "jose";
import type { JWTVerifyGetKey } from "jose";
import { HttpError } from "../http.js";
export interface VerifiedIdentity {
  subject: string;
  expiresAt: Date;
  displayName: string;
}
export function neonJwtVerifier(config: {
  baseUrl: string;
  jwksUrl: string;
  key?: JWTVerifyGetKey;
  now?: () => Date;
}) {
  const issuer = new URL(config.baseUrl).origin;
  const jwks = new URL(config.jwksUrl);
  if (
    new URL(config.baseUrl).protocol !== "https:" ||
    jwks.protocol !== "https:" ||
    jwks.origin !== issuer
  )
    throw Error("Invalid managed auth configuration");
  const key = config.key ?? createRemoteJWKSet(jwks, { timeoutDuration: 5000 });
  return async function verifyNeonJwt(
    token: string,
  ): Promise<VerifiedIdentity> {
    try {
      const { payload } = await jwtVerify(
        token,
        async (header, jwt) => {
          const resolved = await key(header, jwt);
          if (
            !(resolved instanceof CryptoKey) ||
            resolved.algorithm.name !== "Ed25519"
          )
            throw Error();
          return resolved;
        },
        {
          algorithms: ["EdDSA"],
          issuer,
          audience: issuer,
          requiredClaims: ["sub", "exp", "iat"],
          maxTokenAge: 900,
          currentDate: config.now?.() ?? new Date(),
        },
      );
      if (
        !payload.sub?.trim() ||
        payload.sub.length > 256 ||
        typeof payload.exp !== "number" ||
        typeof payload.iat !== "number" ||
        payload.exp - payload.iat > 900 ||
        payload.is_anonymous === true
      )
        throw Error();
      return {
        subject: payload.sub,
        expiresAt: new Date(payload.exp * 1000),
        displayName:
          typeof payload.name === "string"
            ? [...payload.name.trim()].slice(0, 32).join("") || "Người chơi"
            : "Người chơi",
      };
    } catch {
      throw new HttpError(401, "SESSION_EXPIRED");
    }
  };
}
let configured: ReturnType<typeof neonJwtVerifier> | undefined;
export async function verifyNeonJwt(token: string) {
  const { NEON_AUTH_BASE_URL, NEON_AUTH_JWKS_URL } = process.env;
  if (!NEON_AUTH_BASE_URL || !NEON_AUTH_JWKS_URL)
    throw new HttpError(503, "TEMPORARILY_UNAVAILABLE");
  configured ??= neonJwtVerifier({
    baseUrl: NEON_AUTH_BASE_URL,
    jwksUrl: NEON_AUTH_JWKS_URL,
  });
  return configured(token);
}
export function accountExpiry(identity: VerifiedIdentity, now: Date) {
  if (identity.expiresAt <= now) throw new HttpError(401, "SESSION_EXPIRED");
  return new Date(
    Math.min(identity.expiresAt.getTime(), now.getTime() + 900000),
  );
}
