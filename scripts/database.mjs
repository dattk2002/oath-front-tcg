import { databaseTarget } from "./database-target.mjs";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, chmodSync } from "node:fs";
import { createRequire } from "node:module";
import {
  createPool,
  migrateDatabase,
  grantRuntimeAccess,
} from "../apps/api/dist/persistence.mjs";
const [command, envFile] = process.argv.slice(2);
if (!["local", "migrate", "runtime"].includes(command) || !envFile)
  throw Error(
    "Usage: node scripts/database.mjs local|migrate|runtime <ignored-env-file>",
  );
process.loadEnvFile(envFile);
const local = command === "local";
const parsed = databaseTarget(command, process.env);
const direct = parsed.href;
const owner = createPool({ connectionString: direct, purpose: "migration" });
try {
  if (command === "migrate" || local)
    await migrateDatabase(
      owner,
      new URL("../packages/db/migrations", import.meta.url).pathname,
    );
  if (command === "runtime" || local) {
    const exists = await owner.query(
      "SELECT 1 FROM pg_roles WHERE rolname='oathfront_runtime'",
    );
    if (!exists.rowCount) {
      if (!local)
        throw Error(
          "Create the restricted runtime role through Neon MCP first",
        );
      await owner.query(
        "CREATE ROLE oathfront_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS",
      );
    }
    const env = readFileSync(envFile, "utf8");
    const password = local
      ? process.env.OATHFRONT_DB_RUNTIME_PASSWORD
      : randomBytes(32).toString("hex");
    if (!password || !/^[a-f0-9]{64}$/.test(password))
      throw Error("Invalid runtime credential");
    await owner.query(`ALTER ROLE oathfront_runtime PASSWORD '${password}'`);
    await grantRuntimeAccess(owner, "oathfront_runtime");
    if (!local) {
      parsed.username = "oathfront_runtime";
      parsed.password = password;
      parsed.hostname = parsed.hostname.replace(".", "-pooler.");
      const line = "DATABASE_URL=" + parsed.href;
      writeFileSync(
        envFile,
        env.replace(/^DATABASE_URL=.*\n?/m, "").trimEnd() + "\n" + line + "\n",
        { mode: 0o600 },
      );
      chmodSync(envFile, 0o600);
    }
    const require = createRequire(
      new URL("../apps/api/package.json", import.meta.url),
    );
    const { Pool } = require("pg");
    const runtime = new Pool({
      connectionString: local
        ? process.env.TEST_DATABASE_URL
        : new URL(parsed.href).href,
      max: 1,
    });
    try {
      const r = await runtime.query(
        "SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls,has_schema_privilege(current_user,'public','CREATE') AS can_create,EXISTS(SELECT FROM pg_roles WHERE rolname='neon_superuser' AND pg_has_role(current_user,oid,'MEMBER')) AS neon_superuser_member,(SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tableowner=current_user) AS owned_app_tables FROM pg_roles WHERE rolname=current_user",
      );
      if (Object.values(r.rows[0]).some((v) => v !== false && v !== "0"))
        throw Error("Runtime privileges are broader than allowed");
      console.log(
        "Restricted runtime verified: no superuser/member/bypass/create/ownership privileges; credentials omitted",
      );
    } finally {
      await runtime.end();
    }
  }
  console.log(
    "Authorized database operation completed; connection values omitted",
  );
} catch (error) {
  console.error(
    "Database operation failed:",
    typeof error.code === "string" ? error.code : "SETUP_FAILED",
  );
  process.exitCode = 1;
} finally {
  await owner.end();
}
