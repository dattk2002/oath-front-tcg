// Explicit local-only setup; never creates/alters roles or touches Neon.
import { readFile, writeFile, access } from "node:fs/promises";
import { parseEnv } from "node:util";
import {
  createPool,
  migrateDatabase,
  grantRuntimeAccess,
} from "../apps/api/dist/persistence.mjs";
const root = new URL("../", import.meta.url),
  name = "oathfront_interactive";
let admin, owner;
try {
  const fixture = parseEnv(
    await readFile(new URL(".env.test.local", root), "utf8"),
  );
  const api = parseEnv(await readFile(new URL(".env.api.local", root), "utf8"));
  const direct = new URL(fixture.TEST_DATABASE_URL_UNPOOLED),
    runtime = new URL(api.DATABASE_URL);
  for (const url of [direct, runtime])
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      [...url.searchParams.keys()].some(
        (k) => !["sslmode", "channel_binding"].includes(k),
      )
    )
      throw Error("Explicit loopback required");
  if (direct.host !== runtime.host || runtime.username !== "oathfront_runtime")
    throw Error("Unexpected local database configuration");
  admin = createPool({ connectionString: direct.href, purpose: "migration" });
  const exists = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname=$1",
    [name],
  );
  const role = await admin.query(
    "SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=$1",
    ["oathfront_runtime"],
  );
  if (role.rowCount !== 1 || Object.values(role.rows[0]).some(Boolean))
    throw Error("Existing restricted runtime role required");
  if (!exists.rowCount)
    await admin.query("CREATE DATABASE oathfront_interactive");
  direct.pathname = "/" + name;
  runtime.pathname = "/" + name;
  owner = createPool({ connectionString: direct.href, purpose: "migration" });
  await migrateDatabase(
    owner,
    new URL("../packages/db/migrations", import.meta.url).pathname,
  );
  await grantRuntimeAccess(owner, "oathfront_runtime");
  const envFile = new URL(".env.auth-app.local", root);
  const present = await access(envFile).then(
    () => true,
    () => false,
  );
  if (present) {
    const current = parseEnv(await readFile(envFile, "utf8"));
    if (current.DATABASE_URL !== runtime.href || !current.SESSION_SECRET)
      throw Error("Existing interactive env differs; preserved");
  } else
    await writeFile(
      envFile,
      `DATABASE_URL=${runtime.href}\nSESSION_SECRET=${api.SESSION_SECRET}\n`,
      { mode: 0o600, flag: "wx" },
    );
  console.info(
    JSON.stringify({
      database: name,
      role: "oathfront_runtime",
      status: exists.rowCount
        ? "preserved-and-migrated"
        : "created-and-migrated",
    }),
  );
} catch {
  console.error("Interactive database setup failed; connection data omitted.");
  process.exitCode = 1;
} finally {
  await owner?.end();
  await admin?.end();
}
