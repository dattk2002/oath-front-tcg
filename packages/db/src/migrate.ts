import type { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
/** Call only with the separate direct owner connection. No schema push. */
export async function migrateDatabase(
  pool: Pool,
  migrationsFolder: string,
): Promise<void> {
  await migrate(drizzle(pool), { migrationsFolder });
}
