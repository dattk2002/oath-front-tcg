import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  bigint,
  jsonb,
  bytea,
  primaryKey,
  uniqueIndex,
  index,
  check,
} from "./schema-types.js";
const time = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });
const count = (name: string) => bigint(name, { mode: "number" });
export const principals = pgTable(
  "principals",
  {
    id: uuid("id").primaryKey(),
    kind: text("kind").notNull(),
    authSubject: text("auth_subject"),
    displayName: text("display_name").notNull(),
    createdAt: time("created_at").notNull().defaultNow(),
    expiresAt: time("expires_at"),
    tutorialCompletedAt: time("tutorial_completed_at"),
    evilTutorialCompletedAt: time("evil_tutorial_completed_at"),
    mergedIntoPrincipalId: uuid("merged_into_principal_id").references(
      (): AnyPgColumn => principals.id,
    ),
    mergedAt: time("merged_at"),
  },
  (t) => [
    uniqueIndex("principals_auth_subject")
      .on(t.authSubject)
      .where(sql`${t.authSubject} IS NOT NULL`),
    check(
      "principal_kind",
      sql`${t.kind} IN ('GUEST','ACCOUNT') AND (${t.kind} <> 'ACCOUNT' OR ${t.authSubject} IS NOT NULL)`,
    ),
    check(
      "principal_name",
      sql`char_length(${t.displayName}) BETWEEN 1 AND 32`,
    ),
    check(
      "principal_merge",
      sql`(${t.mergedIntoPrincipalId} IS NULL) = (${t.mergedAt} IS NULL) AND ${t.mergedIntoPrincipalId} IS DISTINCT FROM ${t.id}`,
    ),
  ],
);
export const appSessions = pgTable(
  "app_sessions",
  {
    id: uuid("id").primaryKey(),
    principalId: uuid("principal_id")
      .notNull()
      .references(() => principals.id),
    tokenHash: bytea("token_hash").notNull(),
    csrfHash: bytea("csrf_hash").notNull(),
    createdAt: time("created_at").notNull().defaultNow(),
    expiresAt: time("expires_at").notNull(),
    revokedAt: time("revoked_at"),
  },
  (t) => [
    uniqueIndex("sessions_token_hash").on(t.tokenHash),
    index("sessions_principal_expiry").on(t.principalId, t.expiresAt),
    check(
      "session_hashes",
      sql`octet_length(${t.tokenHash})=32 AND octet_length(${t.csrfHash})=32`,
    ),
  ],
);
export const contentReleases = pgTable(
  "content_releases",
  {
    version: text("version").primaryKey(),
    rulesVersion: text("rules_version").notNull(),
    locationVersion: text("location_version").notNull(),
    manifest: jsonb("manifest").notNull(),
    sha256: text("sha256").notNull(),
    publishedAt: time("published_at").notNull().defaultNow(),
  },
  (t) => [check("release_sha", sql`${t.sha256} ~ '^[a-f0-9]{64}$'`)],
);
export const decks = pgTable(
  "decks",
  {
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => principals.id),
    name: text("name").notNull(),
    heroId: text("hero_id").notNull(),
    currentRevision: integer("current_revision").notNull(),
    createdAt: time("created_at").notNull().defaultNow(),
    updatedAt: time("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("decks_owner_updated").on(t.ownerId, t.updatedAt, t.id),
    check("deck_name", sql`char_length(${t.name}) BETWEEN 1 AND 40`),
    check("deck_revision", sql`${t.currentRevision} >= 1`),
  ],
);
export const deckVersions = pgTable(
  "deck_versions",
  {
    deckId: uuid("deck_id")
      .notNull()
      .references(() => decks.id),
    revision: integer("revision").notNull(),
    contentVersion: text("content_version")
      .notNull()
      .references(() => contentReleases.version),
    heroId: text("hero_id").notNull(),
    entries: jsonb("entries").notNull(),
    validationStatus: text("validation_status").notNull(),
    createdAt: time("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.deckId, t.revision] }),
    check("deck_version_revision", sql`${t.revision} >= 1`),
    check(
      "deck_validation",
      sql`${t.validationStatus} IN ('DRAFT','PLAYABLE') AND jsonb_typeof(${t.entries})='array'`,
    ),
  ],
);
export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey(),
    humanPrincipalId: uuid("human_principal_id")
      .notNull()
      .references(() => principals.id),
    humanSide: text("human_side").notNull(),
    mode: text("mode").notNull(),
    status: text("status").notNull(),
    revision: count("revision").notNull(),
    rulesVersion: text("rules_version").notNull(),
    contentVersion: text("content_version")
      .notNull()
      .references(() => contentReleases.version),
    locationVersion: text("location_version").notNull(),
    botVersion: text("bot_version").notNull(),
    botIntentsSinceHuman: integer("bot_intents_since_human")
      .notNull()
      .default(0),
    scenarioId: text("scenario_id"),
    tutorialManifestSha256: text("tutorial_manifest_sha256"),
    rematch: jsonb("rematch"),
    activeDurationMs: count("active_duration_ms").notNull().default(0),
    lastActivityAt: time("last_activity_at").notNull().defaultNow(),
    createdAt: time("created_at").notNull().defaultNow(),
    updatedAt: time("updated_at").notNull().defaultNow(),
    expiresAt: time("expires_at").notNull(),
    endedAt: time("ended_at"),
    detailsExpiresAt: time("details_expires_at"),
    historyExpiresAt: time("history_expires_at"),
  },
  (t) => [
    uniqueIndex("matches_one_live_principal")
      .on(t.humanPrincipalId)
      .where(sql`${t.status} IN ('ACTIVE','PAUSED')`),
    uniqueIndex("matches_id_revision").on(t.id, t.revision),
    index("matches_owner_history").on(
      t.humanPrincipalId,
      t.createdAt.desc(),
      t.id,
    ),
    check(
      "match_lifecycle",
      sql`${t.status} IN ('ACTIVE','PAUSED','COMPLETED','ABANDONED','FAULTED') AND ((${t.status} IN ('ACTIVE','PAUSED')) = (${t.endedAt} IS NULL))`,
    ),
    check(
      "match_numbers",
      sql`${t.botIntentsSinceHuman} BETWEEN 0 AND 64 AND ${t.revision} >= 0 AND ${t.revision} <= 9007199254740991 AND ${t.activeDurationMs} >= 0 AND ${t.activeDurationMs} <= 9007199254740991`,
    ),
    check(
      "match_side_mode",
      sql`${t.humanSide} IN ('GOOD','EVIL') AND ${t.mode} IN ('SKIRMISH','TUTORIAL')`,
    ),
    check(
      "match_tutorial",
      sql`(${t.mode}='TUTORIAL' AND ${t.scenarioId} IS NOT NULL AND ${t.tutorialManifestSha256} IS NOT NULL AND ${t.tutorialManifestSha256} ~ '^[a-f0-9]{64}$') OR (${t.mode}='SKIRMISH' AND ${t.scenarioId} IS NULL AND ${t.tutorialManifestSha256} IS NULL)`,
    ),
  ],
);
export const matchInitializations = pgTable(
  "match_initializations",
  {
    matchId: uuid("match_id")
      .primaryKey()
      .references(() => matches.id),
    heroes: jsonb("heroes").notNull(),
    deckSnapshots: jsonb("deck_snapshots").notNull(),
    initialState: jsonb("initial_state").notNull(),
    privateSeed: bytea("private_seed").notNull(),
    rngAlgorithmVersion: text("rng_algorithm_version").notNull(),
  },
  (t) => [check("initial_seed", sql`octet_length(${t.privateSeed})=32`)],
);
export const matchCheckpoints = pgTable(
  "match_checkpoints",
  {
    matchId: uuid("match_id")
      .primaryKey()
      .references(() => matches.id),
    revision: count("revision").notNull(),
    state: jsonb("state").notNull(),
    stateHash: text("state_hash").notNull(),
    lastEventSeq: count("last_event_seq").notNull(),
    updatedAt: time("updated_at").notNull().defaultNow(),
  },
  (t) => [
    check(
      "checkpoint_numbers",
      sql`${t.revision} BETWEEN 0 AND 9007199254740991 AND ${t.lastEventSeq} BETWEEN 0 AND 9007199254740991`,
    ),
    check("checkpoint_hash", sql`${t.stateHash} ~ '^[a-f0-9]{64}$'`),
    check("checkpoint_size", sql`octet_length(${t.state}::text) <= 262144`),
  ],
);
export const matchEvents = pgTable(
  "match_events",
  {
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id),
    seq: count("seq").notNull(),
    eventId: text("event_id").notNull(),
    rootId: text("root_id").notNull(),
    kind: text("kind").notNull(),
    visibility: text("visibility").notNull(),
    ownerSide: text("owner_side"),
    payload: jsonb("payload").notNull(),
    createdAt: time("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.matchId, t.seq] }),
    uniqueIndex("events_event_id").on(t.eventId),
    check("event_sequence", sql`${t.seq} BETWEEN 1 AND 9007199254740991`),
    check(
      "event_visibility",
      sql`(${t.visibility}='OWNER' AND ${t.ownerSide} IS NOT NULL AND ${t.ownerSide} IN ('GOOD','EVIL')) OR (${t.visibility} IN ('PUBLIC','SERVER') AND ${t.ownerSide} IS NULL)`,
    ),
  ],
);
export const matchActionJournal = pgTable(
  "match_action_journal",
  {
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id),
    stepSeq: count("step_seq").notNull(),
    origin: text("origin").notNull(),
    commandId: uuid("command_id"),
    action: jsonb("action").notNull(),
    nextBotRandomState: jsonb("next_bot_random_state"),
    preStateHash: text("pre_state_hash").notNull(),
    postStateHash: text("post_state_hash").notNull(),
    firstEventSeq: count("first_event_seq"),
    lastEventSeq: count("last_event_seq"),
    createdAt: time("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.matchId, t.stepSeq] }),
    check("journal_step", sql`${t.stepSeq} BETWEEN 1 AND 9007199254740991`),
    check(
      "journal_origin_rng",
      sql`(${t.origin}='BOT' AND ${t.nextBotRandomState} IS NOT NULL AND jsonb_typeof(${t.nextBotRandomState})='array' AND jsonb_array_length(${t.nextBotRandomState})=4) OR (${t.origin} IN ('HUMAN','AUTO') AND ${t.nextBotRandomState} IS NULL)`,
    ),
    check(
      "journal_bounds",
      sql`(${t.firstEventSeq} IS NULL AND ${t.lastEventSeq} IS NULL) OR (${t.firstEventSeq} IS NOT NULL AND ${t.lastEventSeq} IS NOT NULL AND ${t.firstEventSeq} BETWEEN 1 AND 9007199254740991 AND ${t.lastEventSeq} BETWEEN ${t.firstEventSeq} AND 9007199254740991)`,
    ),
    check(
      "journal_hashes",
      sql`${t.preStateHash} ~ '^[a-f0-9]{64}$' AND ${t.postStateHash} ~ '^[a-f0-9]{64}$'`,
    ),
  ],
);
export const commandReceipts = pgTable(
  "command_receipts",
  {
    principalId: uuid("principal_id")
      .notNull()
      .references(() => principals.id),
    commandId: uuid("command_id").notNull(),
    requestHash: text("request_hash").notNull(),
    resourceId: uuid("resource_id").notNull(),
    response: jsonb("response").notNull(),
    resultingRevision: count("resulting_revision"),
    createdAt: time("created_at").notNull().defaultNow(),
    expiresAt: time("expires_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.principalId, t.commandId] }),
    check(
      "receipt_hash_revision",
      sql`${t.requestHash} ~ '^[a-f0-9]{64}$' AND (${t.resultingRevision} IS NULL OR ${t.resultingRevision} BETWEEN 0 AND 9007199254740991)`,
    ),
  ],
);
export const authClaims = pgTable(
  "auth_claims",
  {
    sourceSessionId: uuid("source_session_id")
      .notNull()
      .references(() => appSessions.id),
    commandId: uuid("command_id").notNull(),
    sourcePrincipalId: uuid("source_principal_id")
      .notNull()
      .references(() => principals.id),
    targetPrincipalId: uuid("target_principal_id")
      .notNull()
      .references(() => principals.id),
    authSubject: text("auth_subject").notNull(),
    requestHash: text("request_hash").notNull(),
    result: jsonb("result").notNull(),
    lastIssuedSessionId: uuid("last_issued_session_id").references(
      () => appSessions.id,
    ),
    committedAt: time("committed_at").notNull().defaultNow(),
    recoverUntil: time("recover_until").notNull(),
    expiresAt: time("expires_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.sourceSessionId, t.commandId] }),
    uniqueIndex("claims_once_per_source").on(t.sourcePrincipalId),
    check("claim_hash", sql`${t.requestHash} ~ '^[a-f0-9]{64}$'`),
  ],
);
export const guestBootstraps = pgTable(
  "guest_bootstraps",
  {
    commandId: uuid("command_id").primaryKey(),
    recoverySecretHash: bytea("recovery_secret_hash").notNull(),
    principalId: uuid("principal_id")
      .notNull()
      .references(() => principals.id),
    lastIssuedSessionId: uuid("last_issued_session_id")
      .notNull()
      .references(() => appSessions.id),
    recoverUntil: time("recover_until").notNull(),
    createdAt: time("created_at").notNull().defaultNow(),
    expiresAt: time("expires_at").notNull(),
  },
  (t) => [
    check("bootstrap_hash", sql`octet_length(${t.recoverySecretHash})=32`),
  ],
);
export const matchResults = pgTable(
  "match_results",
  {
    matchId: uuid("match_id")
      .primaryKey()
      .references(() => matches.id),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => principals.id),
    humanHeroId: text("human_hero_id").notNull(),
    botHeroId: text("bot_hero_id").notNull(),
    difficulty: text("difficulty").notNull(),
    outcome: text("outcome").notNull(),
    reason: text("reason").notNull(),
    turns: integer("turns").notNull(),
    activeDurationMs: count("active_duration_ms").notNull(),
    damageDealt: count("damage_dealt").notNull(),
    blocksUsed: integer("blocks_used").notNull(),
    summary: jsonb("summary").notNull(),
    endedAt: time("ended_at").notNull(),
    expiresAt: time("expires_at").notNull(),
  },
  (t) => [
    index("results_owner_ended").on(t.ownerId, t.endedAt.desc(), t.matchId),
    check(
      "result_numbers",
      sql`${t.turns} BETWEEN 0 AND 20 AND ${t.activeDurationMs} BETWEEN 0 AND 9007199254740991 AND ${t.damageDealt} BETWEEN 0 AND 9007199254740991 AND ${t.blocksUsed} BETWEEN 0 AND 3`,
    ),
    check(
      "result_enums",
      sql`${t.difficulty} IN ('EASY','NORMAL') AND ${t.outcome} IN ('WIN','LOSS','DRAW','ABANDONED','FAULTED')`,
    ),
  ],
);
export const rateLimitWindows = pgTable(
  "rate_limit_windows",
  {
    scope: text("scope").notNull(),
    keyHash: text("key_hash").notNull(),
    windowStart: time("window_start").notNull(),
    count: integer("count").notNull(),
    expiresAt: time("expires_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.scope, t.keyHash, t.windowStart] }),
    index("rate_limit_expiry").on(t.expiresAt),
    check(
      "rate_limit_values",
      sql`${t.scope} IN ('COMMAND','MATCH_CREATE','GUEST_BOOTSTRAP') AND ${t.keyHash} ~ '^[a-f0-9]{64}$' AND ${t.count} >= 1`,
    ),
  ],
);
