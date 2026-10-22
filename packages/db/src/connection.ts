import { Pool, types } from "pg";
import type { PoolClient } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";
export interface ConnectionConfig {
  connectionString: string;
  purpose: "runtime" | "migration";
  onIdleError?: (code: string) => void;
}
export function safeInteger(value: string | number): number {
  const result = typeof value === "number" ? value : Number(value);
  if (!/^-?\d+$/.test(String(value)) || !Number.isSafeInteger(result))
    throw new RangeError("Unsafe database integer");
  return result;
}
export function createPool(config: ConnectionConfig): Pool {
  const url = new URL(config.connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new TypeError("PostgreSQL URL required");
  const local = ["127.0.0.1", "localhost", "db"].includes(url.hostname);
  if (
    !local &&
    (!url.hostname.endsWith(".neon.tech") ||
      (config.purpose === "runtime") !== url.hostname.includes("-pooler."))
  )
    throw new TypeError(
      "Runtime requires pooled Neon URL; migration requires direct URL",
    );
  const parser = {
    getTypeParser: (oid: number, format?: "text" | "binary") =>
      oid === 20 && format !== "binary"
        ? safeInteger
        : types.getTypeParser(oid, format),
  };
  const pool = new Pool({
    connectionString: config.connectionString,
    max: config.purpose === "runtime" ? 5 : 1,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10000,
    statement_timeout: 3000,
    idle_in_transaction_session_timeout: 5000,
    application_name: "oathfront-" + config.purpose,
    types: parser,
  });
  // Idle connection errors must not crash the process or disclose a DSN in logs.
  pool.on("error", (error) =>
    config.onIdleError?.(
      "code" in error && typeof error.code === "string"
        ? error.code
        : "DATABASE_CONNECTION",
    ),
  );
  return pool;
}
export const createDatabase = (pool: Pool) => drizzle(pool, { schema });
export async function transaction<T>(
  pool: Pool,
  fn: (tx: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let broken = false;
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout='3s'");
    await client.query("SET LOCAL lock_timeout='3s'");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      broken = true;
    }
    throw error;
  } finally {
    client.release(broken);
  }
}
export async function grantRuntimeAccess(
  pool: Pool,
  role: string,
): Promise<void> {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(role))
    throw new TypeError("Invalid application role");
  const name = '"' + role + '"';
  const mutable = [
    "principals",
    "app_sessions",
    "decks",
    "matches",
    "match_checkpoints",
    "command_receipts",
    "auth_claims",
    "guest_bootstraps",
    "rate_limit_windows",
    "daily_attempts",
    "weekly_progress",
    "collection_items",
  ];
  const appendOnly = [
    "content_releases",
    "deck_versions",
    "match_initializations",
    "match_events",
    "match_action_journal",
    "match_results",
    "match_reward_bindings",
    "reward_ledger",
    "cosmetic_unlocks",
  ];
  await transaction(pool, async (tx) => {
    await tx.query(`GRANT USAGE ON SCHEMA public TO ${name}`);
    await tx.query(
      `GRANT SELECT,INSERT,UPDATE,DELETE ON ${mutable.join(",")} TO ${name}`,
    );
    await tx.query(`GRANT SELECT,INSERT ON ${appendOnly.join(",")} TO ${name}`);
    await tx.query(
      `GRANT SELECT ON editorial_posts,weekly_events,event_scenarios TO ${name}`,
    );
    await tx.query(`GRANT UPDATE(owner_id) ON match_results TO ${name}`);
  });
}
export type { Pool, PoolClient } from "pg";
