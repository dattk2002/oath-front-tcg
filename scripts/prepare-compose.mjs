import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const [envFile, project] = process.argv.slice(2);
if (!envFile || !project || !/^oathfront(?:-[a-z0-9]+)*$/.test(project))
  throw Error("Explicit ignored env and dedicated Compose project required");
process.loadEnvFile(envFile);
const password = process.env.OATHFRONT_DB_RUNTIME_PASSWORD;
if (!/^[a-f0-9]{64}$/.test(password ?? ""))
  throw Error("Runtime password must be64hex");
const journal = JSON.parse(
  readFileSync("packages/db/migrations/meta/_journal.json", "utf8"),
);
const statements = [
  `CREATE SCHEMA IF NOT EXISTS drizzle; CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations(id serial PRIMARY KEY,hash text NOT NULL,created_at bigint);`,
];
for (const entry of journal.entries) {
  const sql = readFileSync(`packages/db/migrations/${entry.tag}.sql`, "utf8"),
    hash = createHash("sha256").update(sql).digest("hex");
  statements.push(
    `DO $migration$ BEGIN IF NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at=${entry.when}) THEN ${sql.replaceAll("--> statement-breakpoint", "")} INSERT INTO drizzle.__drizzle_migrations(hash,created_at)VALUES('${hash}',${entry.when}); ELSIF NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at=${entry.when} AND hash='${hash}') THEN RAISE EXCEPTION 'Migration hash mismatch'; END IF; END $migration$;`,
  );
}
statements.push(
  `DO $role$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='oathfront_runtime') THEN CREATE ROLE oathfront_runtime LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS; END IF; END $role$; GRANT USAGE ON SCHEMA public TO oathfront_runtime; GRANT SELECT,INSERT,UPDATE,DELETE ON principals,app_sessions,decks,matches,match_checkpoints,command_receipts,auth_claims,guest_bootstraps,rate_limit_windows TO oathfront_runtime; GRANT SELECT,INSERT ON content_releases,deck_versions,match_initializations,match_events,match_action_journal,match_results TO oathfront_runtime; GRANT UPDATE(owner_id) ON match_results TO oathfront_runtime;`,
);
const result = spawnSync(
  "docker",
  [
    "compose",
    "--env-file",
    envFile,
    "-p",
    project,
    "-f",
    "compose.yaml",
    "exec",
    "-T",
    "db",
    "psql",
    "-X",
    "-v",
    "ON_ERROR_STOP=1",
    "-U",
    "oathfront_migrator",
    "-d",
    "oathfront",
  ],
  { input: "BEGIN;\n" + statements.join("\n") + "\nCOMMIT;", encoding: "utf8" },
);
// psql can echo a failing SQL line with credentials; never pass raw output through.
console.log(
  result.status === 0
    ? "Compose forward migrations and restricted grants verified"
    : "Compose setup failed; no raw SQL/credentials emitted",
);
process.exitCode = result.status ?? 1;
