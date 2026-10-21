import { it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, writeFile, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { Pool } from "pg";
import { migrateDatabase, grantRuntimeAccess } from "@oathfront/db";
import { hashState } from "@oathfront/game-engine";
import { buildApp } from "../src/app.js";
import type { CommandResponse } from "@oathfront/contracts";
import { harness, origin } from "./http-helpers.js";
import { root } from "../../../packages/db/tests/helpers.js";
const h = harness();
async function database() {
  const name =
    "oathfront_restore_" + randomUUID().replaceAll("-", "") + "_test";
  await h.owner.query(`CREATE DATABASE "${name}"`);
  const ownerUrl = new URL(process.env.TEST_DATABASE_URL_UNPOOLED!);
  ownerUrl.pathname = "/" + name;
  const runtimeUrl = new URL(process.env.TEST_DATABASE_URL!);
  runtimeUrl.pathname = "/" + name;
  return {
    name,
    owner: new Pool({ connectionString: ownerUrl.href, max: 1 }),
    runtime: new Pool({ connectionString: runtimeUrl.href, max: 5 }),
  };
}
it("migrates an empty database and a real0001 database forward with identical ledgers and tutorial/guard constraints", async () => {
  const empty = await database(),
    prior = await database();
  try {
    const folder = await mkdtemp(join(tmpdir(), "oathfront-prior-"));
    const journal = JSON.parse(
      await readFile(
        root + "packages/db/migrations/meta/_journal.json",
        "utf8",
      ),
    );
    await import("node:fs/promises").then((fs) =>
      fs.mkdir(join(folder, "meta")),
    );
    await copyFile(
      root + "packages/db/migrations/0001_core.sql",
      join(folder, "0001_core.sql"),
    );
    await writeFile(
      join(folder, "meta/_journal.json"),
      JSON.stringify({ ...journal, entries: journal.entries.slice(0, 1) }),
    );
    await migrateDatabase(prior.owner, folder);
    expect(
      (
        await prior.owner.query(
          "SELECT count(*)::int n FROM drizzle.__drizzle_migrations",
        )
      ).rows[0].n,
    ).toBe(1);
    await migrateDatabase(prior.owner, root + "packages/db/migrations");
    await migrateDatabase(empty.owner, root + "packages/db/migrations");
    const inspect = async (pool: Pool) => ({
      ledger: (
        await pool.query(
          "SELECT hash,created_at FROM drizzle.__drizzle_migrations ORDER BY created_at",
        )
      ).rows,
      constraints: (
        await pool.query(
          "SELECT conname,pg_get_constraintdef(oid) definition FROM pg_constraint WHERE conname IN ('result_enums','match_numbers') ORDER BY conname",
        )
      ).rows,
    });
    const result = await inspect(prior.owner);
    expect(result).toEqual(await inspect(empty.owner));
    expect(result.ledger).toHaveLength(3);
    expect(JSON.stringify(result.constraints)).toContain("TUTORIAL_COMPLETED");
    expect(JSON.stringify(result.constraints)).toContain(
      "bot_intents_this_turn",
    );
    process.stdout.write(
      "MIGRATION_DRILL " +
        JSON.stringify({
          emptyLedger: 3,
          priorLedger: 3,
          schemasEquivalent: true,
          emptyDatabase: empty.name,
          priorDatabase: prior.name,
        }) +
        "\n",
    );
  } finally {
    for (const db of [empty, prior]) {
      await db.owner.end();
      await db.runtime.end();
      await h.owner.query(`DROP DATABASE "${db.name}"`);
    }
  }
});
it("restores a PostgreSQL snapshot at BLOCK_RESPONSE, resumes once and retries the same durable receipt", async () => {
  const g = await h.guest();
  let current = (
    await h.app.inject({
      method: "POST",
      url: "/api/v1/matches",
      headers: h.headers(g),
      payload: {
        commandId: randomUUID(),
        mode: "TUTORIAL",
        scenarioId: "tutorial_v1",
      },
    })
  ).json<CommandResponse>();
  for (let i = 0; i < 100 && current.view.blockResponse === null; i++) {
    const action = current.needsAdvance
      ? { kind: "ADVANCE" }
      : current.view.legalActions.find(
          (a) =>
            ![
              "PAUSE",
              "SURRENDER",
              "TUTORIAL_SKIP",
              "TUTORIAL_RESTART",
            ].includes(a.kind),
        );
    const r = await h.app.inject({
      method: "POST",
      url: `/api/v1/matches/${current.view.matchId}/commands`,
      headers: h.headers(g),
      payload: {
        commandId: randomUUID(),
        expectedRevision: current.revision,
        action,
      },
    });
    expect(r.statusCode, r.body).toBe(200);
    current = r.json<CommandResponse>();
  }
  expect(current.view.blockResponse).not.toBeNull();
  const id = current.view.matchId,
    before = await h.app.services.repository.loadMatch(g.id, id),
    target = await database();
  const container = process.env.OATHFRONT_TEST_DB_CONTAINER ?? "oathfront-db-1";
  const source = new URL(process.env.TEST_DATABASE_URL_UNPOOLED!);
  // Snapshot exists only in memory; no private checkpoint/session bytes enter a report.
  const snapshot = execFileSync(
    "docker",
    [
      "exec",
      container,
      "pg_dump",
      "-U",
      source.username,
      "-Fc",
      "--no-owner",
      "--no-acl",
      source.pathname.slice(1),
    ],
    { maxBuffer: 32 * 1024 * 1024 },
  );
  const started = performance.now();
  let restored: ReturnType<typeof buildApp> | undefined;
  try {
    const result = spawnSync(
      "docker",
      [
        "exec",
        "-i",
        container,
        "pg_restore",
        "-U",
        source.username,
        "-d",
        target.name,
        "--no-owner",
        "--no-acl",
        "--exit-on-error",
      ],
      { input: snapshot, maxBuffer: 1024 * 1024 },
    );
    expect(result.status).toBe(0);
    await grantRuntimeAccess(target.owner, "oathfront_runtime");
    restored = buildApp({
      pool: target.runtime,
      origin,
      secret: "restore-verification-".repeat(4),
    });
    await restored.ready();
    const loaded = await restored.services.repository.loadMatch(g.id, id);
    expect(hashState(loaded.state)).toBe(hashState(before.state));
    expect(loaded.revision).toBe(before.revision);
    const action = current.view.legalActions.find(
      (a) => a.kind === "KEEP_BLOCK_POWER",
    );
    expect(action).toBeDefined();
    const principal = {
        id: g.id,
        kind: "GUEST" as const,
        expiresAt: new Date(g.r.json().principal.expiresAt),
      },
      command = {
        commandId: randomUUID(),
        expectedRevision: current.revision,
        action: action!,
      };
    const resumed = await restored.services.executeCommand(
      principal,
      id,
      command,
    );
    const retry = await restored.services.executeCommand(
      principal,
      id,
      command,
    );
    expect(retry).toEqual(resumed);
    expect(resumed.revision).toBe(current.revision + 1);
    expect(
      hashState(
        (await restored.services.repository.replayMatch(g.id, id)).finalState,
      ),
    ).toBe(
      hashState((await restored.services.repository.loadMatch(g.id, id)).state),
    );
    process.stdout.write(
      "RESTORE_DRILL " +
        JSON.stringify({
          recoveryMs: performance.now() - started,
          snapshotBytes: snapshot.length,
          sourceDatabase: source.pathname.slice(1),
          restoredDatabase: target.name,
          lostCommittedRevisions: 0,
          snapshotRevision: before.revision,
          resumedRevision: resumed.revision,
          phase: "BLOCK_RESPONSE",
          scope:
            "local PostgreSQL logical snapshot, quiescent source; not Neon PITR/RPO SLA",
        }) +
        "\n",
    );
  } finally {
    await restored?.close();
    await target.runtime.end();
    await target.owner.end();
    await h.owner.query(`DROP DATABASE "${target.name}"`);
  }
}, 30000);
