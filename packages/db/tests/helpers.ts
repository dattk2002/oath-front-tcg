import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
export const root = fileURLToPath(new URL("../../../", import.meta.url));
try {
  process.loadEnvFile(root + ".env.test.local");
} catch {
  /* CI injects credentials. */
}
export function ownerPool() {
  const url = new URL(process.env.TEST_DATABASE_URL_UNPOOLED ?? "");
  if (
    process.env.OATHFRONT_TEST_DATABASE !== "1" ||
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    !url.pathname.endsWith("_test")
  )
    throw Error("Tests require explicitly authorized loopback *_test database");
  return new Pool({ connectionString: url.href, max: 2 });
}
export async function setupDatabase(owner: Pool) {
  const exists = await access(
    root + "packages/db/migrations/meta/_journal.json",
  ).then(
    () => true,
    () => false,
  );
  if (exists) {
    const { migrateDatabase } = await import("../src/migrate.js");
    await migrateDatabase(owner, root + "packages/db/migrations");
  }
  const password = process.env.OATHFRONT_DB_RUNTIME_PASSWORD!;
  if (!/^[a-f0-9]{64}$/.test(password))
    throw Error("Missing local test runtime credential");
  await owner.query(
    `DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='oathfront_runtime') THEN CREATE ROLE oathfront_runtime LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS; END IF; END $$`,
  );
  const { rows } = await owner.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public'",
  );
  if (rows.length) {
    const { grantRuntimeAccess } = await import("../src/connection.js");
    await grantRuntimeAccess(owner, "oathfront_runtime");
  }
}
export async function resetDatabase(owner: Pool) {
  const { rows } = await owner.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public'",
  );
  if (rows.length)
    await owner.query(
      "TRUNCATE " +
        rows
          .map((r) => '"' + String(r.tablename).replaceAll('"', '""') + '"')
          .join(",") +
        " CASCADE",
    );
}
