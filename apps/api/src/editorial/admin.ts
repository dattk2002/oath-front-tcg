import { supportedCatalogs } from "@oathfront/game-content";
/** Owner-only live-content administration. Never registered as a runtime HTTP route. */
import { transaction } from "@oathfront/db";
import type { Pool, PoolClient } from "@oathfront/db";
import { validateWire } from "@oathfront/contracts";
import {
  seasonOne,
  seasonScenarios,
  contentHash,
  eventRewards,
  scenarioForId,
} from "@oathfront/game-content/events";
import type {
  AuthoredEvent,
  AuthoredScenario,
} from "@oathfront/game-content/events";
import { editorialPosts } from "@oathfront/game-content/editorial";
import type { AuthoredPost } from "@oathfront/game-content/editorial";
import { registerRelease } from "../matches/initialization.js";
export interface LiveBundle {
  version: "season-one-v1";
  posts: AuthoredPost[];
  events: AuthoredEvent[];
  scenarios: AuthoredScenario[];
}
export const liveBundle: LiveBundle = {
  version: "season-one-v1",
  posts: editorialPosts,
  events: seasonOne,
  scenarios: seasonScenarios,
};
export class ContentAdminError extends Error {
  constructor(
    public code:
      | "INVALID_BUNDLE"
      | "IMMUTABLE_CONTENT"
      | "STALE_REVISION"
      | "MIGRATIONS_REQUIRED"
      | "NOT_FOUND"
      | "INVALID_TARGET",
    public resource: string,
  ) {
    super(`${code}: ${resource}`);
  }
}
type Entity = "posts" | "events" | "scenarios";
const tables = {
  posts: "editorial_posts",
  events: "weekly_events",
  scenarios: "event_scenarios",
} as const;
const columns: Record<Entity, Record<string, string>> = {
  posts: {
    slug: "slug",
    revision: "revision",
    title: "title",
    excerpt: "excerpt",
    body: "body",
    category: "category",
    artKey: "art_key",
    state: "state",
    publishAt: "publish_at",
    sha256: "sha256",
  },
  events: {
    id: "id",
    seasonId: "season_id",
    ordinal: "ordinal",
    slug: "slug",
    title: "title",
    summary: "summary",
    startsAt: "starts_at",
    endsAt: "ends_at",
    revealAt: "reveal_at",
    featuredCardId: "featured_card_id",
    featuredHeroId: "featured_hero_id",
    systems: "systems",
    rewards: "rewards",
    revision: "revision",
    state: "state",
    sha256: "sha256",
  },
  scenarios: {
    id: "id",
    eventId: "event_id",
    dayIndex: "day_index",
    title: "title",
    description: "description",
    arenaKey: "arena_key",
    contentVersion: "content_version",
    manifest: "manifest",
    sha256: "sha256",
  },
};
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const exact = (v: unknown, keys: string[]) =>
  object(v) &&
  Object.keys(v).length === keys.length &&
  keys.every((k) => Object.hasOwn(v, k));
const same = (a: unknown, b: unknown) => contentHash(a) === contentHash(b);
const canonicalDate = (v: unknown) =>
  typeof v === "string" &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString() === v;
function invalid(resource: string): never {
  throw new ContentAdminError("INVALID_BUNDLE", resource);
}
function withoutHash<T extends { sha256: string }>(v: T) {
  const { sha256, ...content } = v;
  void sha256;
  return content;
}
export function validateLiveBundle(value: unknown): LiveBundle {
  if (
    !exact(value, ["version", "posts", "events", "scenarios"]) ||
    !object(value) ||
    value.version !== "season-one-v1" ||
    !Array.isArray(value.posts) ||
    !Array.isArray(value.events) ||
    !Array.isArray(value.scenarios)
  )
    invalid("bundle");
  if (
    value.posts.length > 100 ||
    value.events.length !== 12 ||
    value.scenarios.length !== 84
  )
    invalid("counts");
  const b = value as unknown as LiveBundle;
  for (const kind of ["posts", "events", "scenarios"] as const) {
    const ids = new Set<string>();
    for (const row of b[kind]) {
      if (!exact(row, Object.keys(columns[kind]))) invalid(kind);
      const id =
        "slug" in row && kind === "posts"
          ? row.slug
          : "id" in row
            ? row.id
            : "";
      if (!id || ids.has(id)) invalid(`${kind}:duplicate`);
      ids.add(id);
    }
  }
  for (const p of b.posts) {
    if (
      !validateWire("LiveSlugParams", { slug: p.slug }) ||
      !["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"].includes(p.state) ||
      !canonicalDate(p.publishAt) ||
      !validateWire("NewsPost", {
        slug: p.slug,
        title: p.title,
        summary: p.excerpt,
        sections: p.body,
        category: p.category,
        artKey: p.artKey,
        publishedAt: p.publishAt,
        revision: p.revision,
      }) ||
      contentHash(withoutHash(p)) !== p.sha256
    )
      invalid(`post:${p.slug}`);
  }
  for (const w of b.events) {
    const known = seasonOne.find((e) => e.id === w.id);
    if (
      !known ||
      !["DRAFT", "PUBLISHED"].includes(w.state) ||
      !Number.isSafeInteger(w.revision) ||
      w.revision < 1 ||
      !validateWire("LiveSlugParams", { slug: w.slug }) ||
      typeof w.title !== "string" ||
      !w.title.length ||
      w.title.length > 160 ||
      typeof w.summary !== "string" ||
      !w.summary.length ||
      w.summary.length > 600 ||
      contentHash(withoutHash(w)) !== w.sha256 ||
      !same(w.rewards, eventRewards)
    )
      invalid(`event:${w.id}`);
    for (const key of [
      "seasonId",
      "ordinal",
      "startsAt",
      "endsAt",
      "revealAt",
      "featuredCardId",
      "featuredHeroId",
      "systems",
    ] as const)
      if (!same(w[key], known[key])) invalid(`event:${w.id}:${key}`);
  }
  for (const s of b.scenarios) {
    const known = scenarioForId(s.id);
    if (
      !known ||
      !b.events.some((e) => e.id === s.eventId) ||
      !same(s.manifest, known.manifest) ||
      s.sha256 !== known.sha256 ||
      contentHash(s.manifest) !== s.sha256 ||
      s.eventId !== known.eventId ||
      s.dayIndex !== known.dayIndex ||
      s.arenaKey !== known.arenaKey ||
      s.contentVersion !== "elements_v1" ||
      typeof s.title !== "string" ||
      !s.title.length ||
      s.title.length > 160 ||
      typeof s.description !== "string" ||
      !s.description.length ||
      s.description.length > 600
    )
      invalid(`scenario:${s.id}`);
  }
  return b;
}
interface Change {
  entity: Entity;
  id: string;
  action: "create" | "update" | "unchanged";
  value: Record<string, unknown>;
}
export interface ImportReport {
  created: number;
  updated: number;
  unchanged: number;
  records: { entity: Entity; id: string; action: Change["action"] }[];
}
async function requireSchema(db: Pool | PoolClient) {
  for (const table of Object.values(tables))
    if (
      !(await db.query("SELECT to_regclass($1) AS name", [table])).rows[0]?.name
    )
      throw new ContentAdminError("MIGRATIONS_REQUIRED", table);
}
function rowValue(
  entity: Entity,
  row: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(columns[entity]).map(([key, col]) => [
      key,
      row[col] instanceof Date ? row[col].toISOString() : row[col],
    ]),
  );
}
async function plan(
  db: Pool | PoolClient,
  b: LiveBundle,
  lock = false,
): Promise<Change[]> {
  await requireSchema(db);
  const changes: Change[] = [];
  for (const entity of ["posts", "events", "scenarios"] as const)
    for (const value of b[entity]) {
      const key = entity === "posts" ? "slug" : "id",
        data = value as unknown as Record<string, unknown>,
        id = String(data[key]),
        table = tables[entity];
      const row = (
        await db.query(
          `SELECT * FROM ${table} WHERE ${key}=$1${lock ? " FOR UPDATE" : ""}`,
          [id],
        )
      ).rows[0] as Record<string, unknown> | undefined;
      if (!row) {
        changes.push({ entity, id, value: data, action: "create" });
        continue;
      }
      const current = rowValue(entity, row);
      if (same(current, data)) {
        changes.push({ entity, id, value: data, action: "unchanged" });
        continue;
      }
      if (entity === "scenarios") {
        const parent = (
          await db.query("SELECT state FROM weekly_events WHERE id=$1", [
            current.eventId,
          ])
        ).rows[0];
        if (parent?.state !== "DRAFT")
          throw new ContentAdminError("IMMUTABLE_CONTENT", id);
      } else {
        if (current.state !== "DRAFT")
          throw new ContentAdminError("IMMUTABLE_CONTENT", id);
        if (Number(data.revision) <= Number(current.revision))
          throw new ContentAdminError("STALE_REVISION", id);
      }
      changes.push({ entity, id, value: data, action: "update" });
    }
  return changes;
}
function report(changes: Change[]): ImportReport {
  return {
    created: changes.filter((c) => c.action === "create").length,
    updated: changes.filter((c) => c.action === "update").length,
    unchanged: changes.filter((c) => c.action === "unchanged").length,
    records: changes.map(({ entity, id, action }) => ({ entity, id, action })),
  };
}
async function writeChange(tx: PoolClient, c: Change) {
  if (c.action === "unchanged") return;
  const mapping = Object.entries(columns[c.entity]),
    key = c.entity === "posts" ? "slug" : "id",
    values = mapping.map(([prop]) => {
      const v = c.value[prop];
      return typeof v === "object" && v !== null ? JSON.stringify(v) : v;
    });
  if (c.action === "create")
    await tx.query(
      `INSERT INTO ${tables[c.entity]}(${mapping.map(([, col]) => col).join(",")}) VALUES(${mapping.map((_, i) => `$${i + 1}`).join(",")})`,
      values,
    );
  else
    await tx.query(
      `UPDATE ${tables[c.entity]} SET ${mapping.map(([, col], i) => `${col}=$${i + 1}`).join(",")} WHERE ${key}=$${values.length + 1}`,
      [...values, c.id],
    );
}
export async function previewLiveContent(db: Pool, bundle: unknown) {
  return report(await plan(db, validateLiveBundle(bundle)));
}
export async function importLiveContent(db: Pool, bundle: unknown) {
  const validated = validateLiveBundle(bundle);
  return transaction(db, async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(601870011)");
    await requireSchema(tx);
    await registerRelease(tx);
    const changes = await plan(tx, validated, true);
    for (const change of changes) await writeChange(tx, change);
    return report(changes);
  });
}
export async function publishLiveContent(
  db: Pool,
  kind: "post" | "event",
  id: string,
  at: Date,
  now: Date,
) {
  if (
    !Number.isFinite(+at) ||
    !Number.isFinite(+now) ||
    !validateWire("LiveSlugParams", { slug: id })
  )
    invalid("publish");
  return transaction(db, async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(601870011)");
    await requireSchema(tx);
    const entity = kind === "post" ? "posts" : "events",
      key = kind === "post" ? "slug" : "id";
    const row = (
      await tx.query(
        `SELECT * FROM ${tables[entity]} WHERE ${key}=$1 FOR UPDATE`,
        [id],
      )
    ).rows[0];
    if (!row) throw new ContentAdminError("NOT_FOUND", id);
    const current = rowValue(entity, row);
    if (kind === "event" && current.startsAt !== at.toISOString())
      invalid("publish:event-time");
    if (current.state !== "DRAFT") {
      if (kind === "post" && current.publishAt !== at.toISOString())
        throw new ContentAdminError("IMMUTABLE_CONTENT", id);
      return { created: 0, updated: 0, unchanged: 1 };
    }
    if (kind === "event") {
      const scenarios = (
        await tx.query(
          "SELECT id,sha256 FROM event_scenarios WHERE event_id=$1",
          [id],
        )
      ).rows;
      if (
        scenarios.length !== 7 ||
        scenarios.some((s) => scenarioForId(s.id)?.sha256 !== s.sha256)
      )
        invalid(`event:${id}:scenarios`);
    }
    const { sha256: _sha, ...payload } = current;
    void _sha;
    const updated = {
      ...payload,
      revision: Number(current.revision) + 1,
      state:
        kind === "event" ? "PUBLISHED" : +at > +now ? "SCHEDULED" : "PUBLISHED",
      ...(kind === "post" ? { publishAt: at.toISOString() } : {}),
    };
    await writeChange(tx, {
      entity,
      id,
      action: "update",
      value: { ...updated, sha256: contentHash(updated) },
    });
    return { created: 0, updated: 1, unchanged: 0 };
  });
}

/** Reviewable bootstrap SQL for owner/MCP execution; values are literals, identifiers come only from fixed maps. */
export function bootstrapStatements(bundle: unknown): string[] {
  const b = validateLiveBundle(bundle);
  const quote = (v: string) =>
    "E'" + v.replaceAll("\\", "\\\\").replaceAll("'", "''") + "'";
  const literal = (value: unknown): string =>
    value === null
      ? "NULL"
      : typeof value === "number"
        ? String(value)
        : typeof value === "object"
          ? quote(JSON.stringify(value)) + "::jsonb"
          : quote(String(value));
  const statement = (
    table: string,
    key: string,
    values: Record<string, unknown>,
  ) => {
    const entries = Object.entries(values);
    const same = entries
      .map(([col, v]) => `${table}.${col} IS NOT DISTINCT FROM ${literal(v)}`)
      .join(" AND ");
    const body = `BEGIN IF EXISTS(SELECT 1 FROM ${table} WHERE ${key}=${literal(values[key])} AND NOT(${same})) THEN RAISE EXCEPTION 'Immutable content conflict in ${table}' USING ERRCODE='23514'; END IF; END`;
    let ordinal = 0,
      tag = "$of_guard_0$";
    while (body.includes(tag)) tag = `$of_guard_${++ordinal}$`;
    return `DO ${tag} ${body} ${tag};\nINSERT INTO ${table}(${entries.map(([col]) => col).join(",")}) VALUES(${entries.map(([, v]) => literal(v)).join(",")}) ON CONFLICT(${key}) DO NOTHING;`;
  };
  const statements: string[] = ["SELECT pg_advisory_xact_lock(601870011);"];
  for (const catalog of supportedCatalogs)
    statements.push(
      statement("content_releases", "version", {
        version: catalog.version,
        rules_version: catalog.rulesVersion,
        location_version: catalog.locationVersion,
        manifest: catalog,
        sha256: contentHash(catalog),
      }),
    );
  for (const entity of ["posts", "events", "scenarios"] as const)
    for (const entry of b[entity]) {
      const row = entry as unknown as Record<string, unknown>;
      statements.push(
        statement(
          tables[entity],
          entity === "posts" ? "slug" : "id",
          Object.fromEntries(
            Object.entries(columns[entity]).map(([prop, col]) => [
              col,
              row[prop],
            ]),
          ),
        ),
      );
    }
  return statements;
}
