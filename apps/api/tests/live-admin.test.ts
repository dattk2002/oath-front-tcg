import { expect, it } from "vitest";
import {
  contentHash,
  seasonOne,
  seasonScenarios,
} from "@oathfront/game-content/events";
import { editorialPosts } from "@oathfront/game-content/editorial";
import { harness } from "./http-helpers.js";
const h = harness(),
  modulePath = "../src/editorial/admin.js";
const bundle = () => ({
  version: "season-one-v1",
  posts: structuredClone(editorialPosts),
  events: structuredClone(seasonOne),
  scenarios: structuredClone(seasonScenarios),
});
async function admin() {
  const mod = await import(modulePath).catch(() => undefined);
  expect(mod?.importLiveContent).toBeTypeOf("function");
  return mod!;
}
it("previews without writing and imports the exact114 records idempotently", async () => {
  const a = await admin(),
    input = bundle();
  const preview = await a.previewLiveContent(h.owner, input);
  expect(preview.created).toBe(114);
  expect(
    (await h.owner.query("SELECT count(*)::int AS n FROM weekly_events"))
      .rows[0].n,
  ).toBe(0);
  expect(await a.importLiveContent(h.owner, input)).toMatchObject({
    created: 114,
    updated: 0,
    unchanged: 0,
  });
  expect(await a.importLiveContent(h.owner, input)).toMatchObject({
    created: 0,
    updated: 0,
    unchanged: 114,
  });
  expect(
    (await h.owner.query("SELECT count(*)::int AS n FROM event_scenarios"))
      .rows[0].n,
  ).toBe(84);
  expect(
    (
      await h.owner.query(
        "SELECT sha256 FROM event_scenarios WHERE id='season01-week01-day1'",
      )
    ).rows[0].sha256,
  ).toBe(seasonScenarios[0]!.sha256);
  const changed = bundle();
  changed.events[0]!.summary = "A replacement live definition";
  const { sha256: _hash, ...payload } = changed.events[0]!;
  void _hash;
  changed.events[0]!.sha256 = contentHash(payload);
  await expect(a.importLiveContent(h.owner, changed)).rejects.toMatchObject({
    code: "IMMUTABLE_CONTENT",
  });
});
it("revises a draft and schedules publication without exposing it early", async () => {
  const a = await admin(),
    input = bundle();
  const draft = structuredClone(input.posts[0]!);
  draft.slug = "editorial-note";
  draft.state = "DRAFT";
  const rehash = () => {
    const { sha256: _sha, ...p } = draft;
    void _sha;
    draft.sha256 = contentHash(p);
  };
  rehash();
  input.posts.push(draft);
  await a.importLiveContent(h.owner, input);
  draft.title = "An authored correction";
  draft.revision = 2;
  rehash();
  expect(await a.importLiveContent(h.owner, input)).toMatchObject({
    updated: 1,
  });
  const at = new Date("2026-10-24T00:00:00Z");
  await a.publishLiveContent(
    h.owner,
    "post",
    draft.slug,
    at,
    new Date("2026-10-23T00:00:00Z"),
  );
  h.setTime(new Date("2026-10-23T23:59:59Z"));
  expect(
    (await h.app.inject({ url: "/api/v1/news/editorial-note" })).statusCode,
  ).toBe(404);
  h.setTime(at);
  const response = await h.app.inject({ url: "/api/v1/news/editorial-note" });
  expect(response.statusCode).toBe(200);
  expect(response.json().title).toBe("An authored correction");
  expect(
    await a.publishLiveContent(h.owner, "post", draft.slug, at, at),
  ).toMatchObject({ unchanged: 1 });
});
it("validates hashes and known scenario rules before any write, and runtime cannot publish", async () => {
  const a = await admin(),
    input = bundle();
  input.scenarios[0]!.manifest.heroHp.GOOD = 19;
  input.scenarios[0]!.sha256 = contentHash(input.scenarios[0]!.manifest);
  await expect(a.importLiveContent(h.owner, input)).rejects.toMatchObject({
    code: "INVALID_BUNDLE",
  });
  expect(
    (await h.owner.query("SELECT count(*)::int AS n FROM editorial_posts"))
      .rows[0].n,
  ).toBe(0);
  await a.importLiveContent(h.owner, bundle());
  await expect(
    h.pool.query(
      "UPDATE editorial_posts SET state='PUBLISHED' WHERE slug='building-the-fivefold'",
    ),
  ).rejects.toMatchObject({ code: "42501" });
});

it("exports safely quoted bootstrap SQL and treats a repeated import as the same114 definitions", async () => {
  const a = await admin(),
    input = bundle();
  const p = input.posts[0]!;
  p.body[0]!.paragraphs[0] =
    "A literal note: '); DELETE FROM principals; -- $of_guard_0$";
  const { sha256: _sha, ...value } = p;
  void _sha;
  p.sha256 = contentHash(value);
  const g = await h.guest();
  const sql = a.bootstrapStatements(input) as string[];
  const { transaction } = await import("@oathfront/db");
  for (let i = 0; i < 2; i++)
    await transaction(h.owner, async (tx) => {
      for (const statement of sql) await tx.query(statement);
    });
  expect(
    (await h.owner.query("SELECT id FROM principals WHERE id=$1", [g.id]))
      .rowCount,
  ).toBe(1);
  expect(
    (
      await h.owner.query("SELECT body FROM editorial_posts WHERE slug=$1", [
        p.slug,
      ])
    ).rows[0].body[0].paragraphs[0],
  ).toBe(p.body[0]!.paragraphs[0]);
});
it("CLI validation needs no database and invalid targets never print a supplied connection secret", async () => {
  const { execFileSync, spawnSync } = await import("node:child_process");
  const output = execFileSync(
    process.execPath,
    ["--import", "tsx", "scripts/manage-live-content.mjs", "validate"],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  expect(JSON.parse(output)).toMatchObject({
    valid: true,
    posts: 18,
    events: 12,
    scenarios: 84,
  });
  const secret = "do-not-echo-this-fixture",
    result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/manage-live-content.mjs",
        "dry-run",
        "--target",
        "production",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          OATHFRONT_CONTENT_DATABASE_URL: `postgresql://owner:${secret}@example.invalid/neondb`,
        },
      },
    );
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("INVALID_TARGET");
  expect(result.stderr + result.stdout).not.toContain(secret);
});

it("pins a started scenario and its eligibility binding even against accidental owner updates", async () => {
  const a = await admin();
  await a.importLiveContent(h.owner, bundle());
  h.setTime(new Date("2026-10-26T01:00:00Z"));
  const g = await h.guest();
  const { randomUUID } = await import("node:crypto");
  const made = await h.app.inject({
    method: "POST",
    url: "/api/v1/events/daily-matches",
    headers: h.headers(g),
    payload: {
      commandId: randomUUID(),
      scenarioId: "season01-week01-day1",
      practice: true,
    },
  });
  expect(made.statusCode).toBe(201);
  const id = made.json().view.matchId;
  const rejectGuard = async (sql: string, values: unknown[] = []) => {
    const tx = await h.owner.connect();
    try {
      await tx.query("BEGIN");
      await expect(tx.query(sql, values)).rejects.toMatchObject({
        code: "23514",
      });
    } finally {
      await tx.query("ROLLBACK");
      tx.release();
    }
  };
  await rejectGuard(
    "UPDATE matches SET scenario_manifest_sha256=$2 WHERE id=$1",
    [id, "a".repeat(64)],
  );
  await rejectGuard(
    "UPDATE match_reward_bindings SET kind='DAILY',eligible_account_id=$2 WHERE match_id=$1",
    [id, g.id],
  );
  await rejectGuard(
    "UPDATE event_scenarios SET title='Changed puzzle' WHERE id='season01-week01-day1'",
  );
  await rejectGuard(
    "UPDATE weekly_events SET title='Changed event' WHERE id='season01-week01'",
  );
});
