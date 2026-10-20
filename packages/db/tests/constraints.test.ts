import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { ownerPool, setupDatabase, resetDatabase } from "./helpers.js";
const owner = ownerPool();
let runtime: Pool;
beforeAll(async () => {
  await setupDatabase(owner);
  runtime = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
});
beforeEach(async () => resetDatabase(owner));
afterAll(async () => {
  await runtime?.end();
  await owner.end();
});
it("installs every durable app relation on a fresh real PostgreSQL database", async () => {
  const { rows } = await owner.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public'",
  );
  expect(rows.map((r) => r.tablename)).toEqual(
    expect.arrayContaining([
      "principals",
      "app_sessions",
      "content_releases",
      "decks",
      "deck_versions",
      "matches",
      "match_initializations",
      "match_checkpoints",
      "match_events",
      "match_action_journal",
      "command_receipts",
      "auth_claims",
      "guest_bootstraps",
      "match_results",
      "rate_limit_windows",
    ]),
  );
});
it("rejects malformed principal/account/session rows and duplicate identity or token hashes", async () => {
  const id = randomUUID();
  await expect(
    runtime.query(
      "INSERT INTO principals(id,kind,display_name) VALUES($1,'ACCOUNT','a')",
      [id],
    ),
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    runtime.query(
      "INSERT INTO principals(id,kind,display_name) VALUES($1,'GUEST','')",
      [id],
    ),
  ).rejects.toMatchObject({ code: "23514" });
  await runtime.query(
    "INSERT INTO principals(id,kind,display_name,auth_subject) VALUES($1,'ACCOUNT','a','sub')",
    [id],
  );
  await expect(
    runtime.query(
      "INSERT INTO principals(id,kind,display_name,auth_subject) VALUES($1,'ACCOUNT','b','sub')",
      [randomUUID()],
    ),
  ).rejects.toMatchObject({ code: "23505" });
  await expect(
    runtime.query(
      "INSERT INTO app_sessions(id,principal_id,token_hash,csrf_hash,expires_at) VALUES($1,$2,$3,$4,now()+interval '1 day')",
      [randomUUID(), randomUUID(), Buffer.alloc(32, 1), Buffer.alloc(32, 2)],
    ),
  ).rejects.toMatchObject({ code: "23503" });
  await runtime.query(
    "INSERT INTO app_sessions(id,principal_id,token_hash,csrf_hash,expires_at) VALUES($1,$2,$3,$4,now()+interval '1 day')",
    [randomUUID(), id, Buffer.alloc(32, 1), Buffer.alloc(32, 2)],
  );
  await expect(
    runtime.query(
      "INSERT INTO app_sessions(id,principal_id,token_hash,csrf_hash,expires_at) VALUES($1,$2,$3,$4,now()+interval '1 day')",
      [randomUUID(), id, Buffer.alloc(32, 1), Buffer.alloc(32, 3)],
    ),
  ).rejects.toMatchObject({ code: "23505" });
});
it("runtime can use application tables but cannot own, bypass, create, truncate or change immutable releases", async () => {
  const role = await runtime.query(
    "SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls,has_schema_privilege(current_user,'public','CREATE') AS can_create FROM pg_roles WHERE rolname=current_user",
  );
  expect(role.rows[0]).toEqual({
    rolsuper: false,
    rolcreatedb: false,
    rolcreaterole: false,
    rolbypassrls: false,
    can_create: false,
  });
  await expect(
    runtime.query("CREATE TABLE forbidden(id integer)"),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(
    runtime.query("TRUNCATE principals CASCADE"),
  ).rejects.toMatchObject({ code: "42501" });
  await runtime.query(
    "INSERT INTO content_releases(version,rules_version,location_version,manifest,sha256) VALUES('v','r','l','{}',$1)",
    ["a".repeat(64)],
  );
  await expect(
    owner.query("UPDATE content_releases SET manifest='{}' WHERE version='v'"),
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    runtime.query("UPDATE content_releases SET rules_version='r2'"),
  ).rejects.toMatchObject({ code: "42501" });
});
it("uses one shared atomic rate window across independent connection pools and resets by injected clock", async () => {
  const { consumeRateLimit, rateLimitKey, createPool, safeInteger } =
    await import("../src/index.js");
  const a = createPool({
      connectionString: process.env.TEST_DATABASE_URL!,
      purpose: "runtime",
    }),
    b = createPool({
      connectionString: process.env.TEST_DATABASE_URL!,
      purpose: "runtime",
    });
  try {
    const key = rateLimitKey("COMMAND", "principal", "s".repeat(32));
    const options = { now: () => new Date("2026-10-20T00:00:01Z"), limit: 3 };
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        consumeRateLimit(i % 2 ? a : b, "COMMAND", key, options),
      ),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(3);
    expect(
      (await a.query("SELECT count FROM rate_limit_windows")).rows[0].count,
    ).toBe(3);
    expect(
      await consumeRateLimit(b, "COMMAND", key, {
        ...options,
        now: () => new Date("2026-10-20T00:01:00Z"),
      }),
    ).toMatchObject({ allowed: true, remaining: 2 });
    expect(a.options.max).toBe(5);
    expect(() =>
      createPool({
        connectionString:
          "postgresql://u:p@ep-example.ap-southeast-1.aws.neon.tech/db",
        purpose: "runtime",
      }),
    ).toThrow(/pooled/);
    expect(() =>
      createPool({
        connectionString:
          "postgresql://u:p@ep-example-pooler.ap-southeast-1.aws.neon.tech/db",
        purpose: "migration",
      }),
    ).toThrow(/direct/);
    expect(() => safeInteger("9007199254740992")).toThrow();
  } finally {
    await a.end();
    await b.end();
  }
});
