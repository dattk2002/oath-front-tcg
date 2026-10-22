import { afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  copyFile,
  writeFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pool } from "pg";
import { ownerPool, root } from "./helpers.js";
import { migrateDatabase } from "../src/migrate.js";
const owner = ownerPool();
afterAll(() => owner.end());
it("installs from scratch and upgrades real legacy rows without rewriting deck or checkpoint bytes", async () => {
  const name = `oathfront_elements_${randomUUID().replaceAll("-", "")}_test`;
  const folder = await mkdtemp(join(tmpdir(), "oathfront-migrations-"));
  await mkdir(join(folder, "meta"));
  const journal = JSON.parse(
    await readFile(root + "packages/db/migrations/meta/_journal.json", "utf8"),
  );
  journal.entries = journal.entries.filter((e: { idx: number }) => e.idx < 3);
  await writeFile(join(folder, "meta/_journal.json"), JSON.stringify(journal));
  for (const entry of journal.entries)
    await copyFile(
      root + `packages/db/migrations/${entry.tag}.sql`,
      join(folder, `${entry.tag}.sql`),
    );
  await owner.query(`CREATE DATABASE "${name}"`);
  const url = new URL(process.env.TEST_DATABASE_URL_UNPOOLED!);
  url.pathname = "/" + name;
  const db = new Pool({ connectionString: url.href, max: 1 });
  try {
    await migrateDatabase(db, folder);
    const id = randomUUID(),
      deck = randomUUID(),
      match = randomUUID();
    await db.query(
      "INSERT INTO principals(id,kind,auth_subject,display_name) VALUES($1,'ACCOUNT','test:legacy','Legacy')",
      [id],
    );
    await db.query(
      "INSERT INTO content_releases(version,rules_version,location_version,manifest,sha256) VALUES('core_v1','rules_v1','locations_v1',$1,$2)",
      [JSON.stringify({ legacy: true }), "a".repeat(64)],
    );
    await db.query(
      "INSERT INTO decks(id,owner_id,name,hero_id,current_revision) VALUES($1,$2,'Legacy deck','H_G_BV',1)",
      [deck, id],
    );
    await db.query(
      "INSERT INTO deck_versions(deck_id,revision,content_version,hero_id,entries,validation_status) VALUES($1,1,'core_v1','H_G_BV',$2,'DRAFT')",
      [deck, JSON.stringify([{ cardId: "GC01", quantity: 1 }])],
    );
    await db.query(
      "INSERT INTO matches(id,human_principal_id,human_side,mode,status,revision,rules_version,content_version,location_version,bot_version,expires_at) VALUES($1,$2,'GOOD','SKIRMISH','ACTIVE',0,'rules_v1','core_v1','locations_v1','bot_v1',now()+interval '1 day')",
      [match, id],
    );
    await db.query(
      "INSERT INTO match_checkpoints(match_id,revision,state,state_hash,last_event_seq) VALUES($1,0,$2,$3,0)",
      [
        match,
        JSON.stringify({ legacy: "unchanged", nested: [1, 2, 3] }),
        "b".repeat(64),
      ],
    );
    const decksBefore = (await db.query("SELECT * FROM deck_versions")).rows,
      checkpointsBefore = (await db.query("SELECT * FROM match_checkpoints"))
        .rows;
    await migrateDatabase(db, root + "packages/db/migrations");
    expect((await db.query("SELECT * FROM deck_versions")).rows).toEqual(
      decksBefore,
    );
    expect((await db.query("SELECT * FROM match_checkpoints")).rows).toEqual(
      checkpointsBefore,
    );
    expect(
      (await db.query("SELECT scenario_manifest_sha256 FROM matches")).rows,
    ).toEqual([{ scenario_manifest_sha256: null }]);
    expect(
      (await db.query("SELECT to_regclass('reward_ledger') AS name")).rows[0]
        .name,
    ).toBe("reward_ledger");
    await migrateDatabase(db, root + "packages/db/migrations");
    expect(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations",
        )
      ).rows[0].n,
    ).toBe(5);
  } finally {
    await db.end();
    await owner.query(`DROP DATABASE "${name}"`);
    await rm(folder, { recursive: true });
  }
});
