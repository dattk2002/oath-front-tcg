import { it, expect, afterAll } from "vitest";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { ownerPool, root } from "./helpers.js";
import { migrateDatabase } from "../src/migrate.js";
const owner = ownerPool();
afterAll(() => owner.end());
it("forward guard rename preserves existing count64 and its guard constraint", async () => {
  const client = await owner.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "CREATE TEMP TABLE matches(bot_intents_since_human integer NOT NULL CHECK(bot_intents_since_human BETWEEN 0 AND 64))",
    );
    await client.query("INSERT INTO matches VALUES(64)");
    await client.query(
      await readFile(
        root + "packages/db/migrations/0002_bot_guard.sql",
        "utf8",
      ),
    );
    expect(
      (await client.query("SELECT bot_intents_this_turn FROM matches")).rows,
    ).toEqual([{ bot_intents_this_turn: 64 }]);
    await expect(
      client.query("UPDATE matches SET bot_intents_this_turn=65"),
    ).rejects.toMatchObject({ code: "23514" });
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
});
it("all forward migrations install the renamed constrained guard on a fresh isolated local test database", async () => {
  const name = "oathfront_guard_" + randomUUID().replaceAll("-", "") + "_test";
  await owner.query(`CREATE DATABASE "${name}"`);
  const url = new URL(process.env.TEST_DATABASE_URL_UNPOOLED!);
  url.pathname = "/" + name;
  const fresh = new Pool({ connectionString: url.href, max: 1 });
  try {
    await migrateDatabase(fresh, root + "packages/db/migrations");
    expect(
      (
        await fresh.query(
          "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='matches' AND column_name LIKE 'bot_intents%'",
        )
      ).rows,
    ).toEqual([{ column_name: "bot_intents_this_turn" }]);
    const constraint = (
      await fresh.query(
        "SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname='match_numbers'",
      )
    ).rows[0].definition;
    expect(constraint).toContain("bot_intents_this_turn >= 0");
    expect(constraint).toContain("bot_intents_this_turn <= 64");
  } finally {
    await fresh.end();
    await owner.query(`DROP DATABASE "${name}"`);
  }
}, 30000);
