import type { Pool } from "pg";
import { createHmac } from "node:crypto";
export type LimitScope = "COMMAND" | "MATCH_CREATE" | "GUEST_BOOTSTRAP";
export const defaultLimits = {
  COMMAND: { limit: 120, windowMs: 60000 },
  MATCH_CREATE: { limit: 10, windowMs: 3600000 },
  GUEST_BOOTSTRAP: { limit: 20, windowMs: 60000 },
} as const;
export function rateLimitKey(
  scope: LimitScope,
  identity: string,
  secret: string,
): string {
  if (secret.length < 32)
    throw new TypeError(
      "Rate limit hashing key must have at least 32 characters",
    );
  return createHmac("sha256", secret)
    .update(scope + "\0" + identity)
    .digest("hex");
}
/** Shared fixed-window counter; rejected calls do not inflate it indefinitely. */
export async function consumeRateLimit(
  pool: Pool,
  scope: LimitScope,
  keyHash: string,
  options: { now?: () => Date; limit?: number; windowMs?: number } = {},
) {
  const {
    limit = defaultLimits[scope].limit,
    windowMs = defaultLimits[scope].windowMs,
    now = () => new Date(),
  } = options;
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    !Number.isSafeInteger(windowMs) ||
    windowMs < 1 ||
    !/^[a-f0-9]{64}$/.test(keyHash)
  )
    throw new TypeError("Invalid rate limit configuration");
  const time = now().getTime();
  if (!Number.isSafeInteger(time) || time < 0)
    throw new TypeError("Invalid rate limit clock");
  const start = new Date(Math.floor(time / windowMs) * windowMs),
    resetAt = new Date(start.getTime() + windowMs);
  const r = await pool.query<{ count: number }>(
    `INSERT INTO rate_limit_windows(scope,key_hash,window_start,count,expires_at) VALUES($1,$2,$3,1,$4) ON CONFLICT(scope,key_hash,window_start) DO UPDATE SET count=rate_limit_windows.count+1 WHERE rate_limit_windows.count<$5 RETURNING count`,
    [scope, keyHash, start, resetAt, limit],
  );
  return {
    allowed: r.rowCount === 1,
    remaining: r.rows[0] ? limit - r.rows[0].count : 0,
    resetAt,
  };
}
