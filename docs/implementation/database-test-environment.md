# Database test and development environments

Task6 uses real PostgreSQL17. No production migrations, mock database, paid plan, hosted API deployment, or registry publication is involved.

## Local setup

Requires Node24.20.0, pnpm11.25.0 and Docker Compose. The isolated Compose project `oathfront` builds `oath-front-db` from PostgreSQL17.10 Alpine pinned by digest. Its only published port is `127.0.0.1:55432`; volume `oathfront_oathfront_pgdata` belongs only to this project. Existing HuntingAlice containers are unrelated and were left running.

```sh
pnpm install --frozen-lockfile
node scripts/create-test-env.mjs
docker compose --env-file .env.test.local -f compose.db.yaml up -d --build --wait
pnpm build:api
node scripts/database.mjs local .env.test.local
pnpm --filter @oathfront/db exec vitest run tests/constraints.test.ts
pnpm --filter @oathfront/api exec vitest run tests/persistence.test.ts
pnpm test
```

The generator creates, without overwriting, an ignored mode0600 `.env.test.local` with separate random64-hex owner/runtime passwords. `.env.test.example` documents names only. Tests require `OATHFRONT_TEST_DATABASE=1`, a loopback migration host, and a database ending `_test`. They deliberately fail if configuration is absent. They migrate and truncate only that explicitly selected disposable test database; never point it at shared development data. Integration files run sequentially because they share that test database. CI may inject the same variables instead of an env file. Direct focused persistence tests need `pnpm build:api` first; root `pnpm test` builds the distribution automatically.

The initial RED database was empty `oathfront_test`. Final fresh-migration verification used a newly created empty `oathfront_verification_test` on the same isolated container, with both ignored test URLs updated to it. No original test database or unrelated volume was deleted. Both databases contain generated fixtures only. A new local setup uses `oathfront_test`.

Migration tests use `oathfront_migrator` (local container's initialization owner). Application queries use `oathfront_runtime`, never the owner. Runtime grants are explicit app-object privileges: SELECT/INSERT on immutable or append-only tables; SELECT/INSERT/UPDATE/DELETE on mutable app tables; UPDATE(owner_id) only on results for later guest merge. No schema CREATE, table ownership, TRUNCATE, superuser, CREATEDB, CREATEROLE, BYPASSRLS, or `neon_superuser` membership. Retention cleanup of append-only details requires the later dedicated maintenance surface; runtime cannot erase diagnostics. No broad future-object/default grants are used.

## Neon development branch

Authorized project `round-darkness-78734677`, branch `br-odd-pine-a1pw77e9` (`development`), database `oathfront`, PostgreSQL17, AWS Singapore, Free plan. Production branch `br-old-boat-a1irt1i9` was not changed. Managed Auth schemas and roles were not modified.

Neon MCP verified the branch/compute and atomically applied the exact locally tested `0001_core.sql`, its SHA-256/Drizzle ledger entry, and SQL-created restricted `oathfront_runtime`. Creating this role through the Neon CreateRole API was deliberately avoided because API-created roles inherit `neon_superuser`. The role password was generated locally and set through the authorized owner connection, with output limited to status/privilege evidence.

Ignored mode0600 `.env.neon.local` contains `DATABASE_URL_UNPOOLED` for `oathfront_owner` on the **direct** development endpoint, and `DATABASE_URL` for `oathfront_runtime` on the same endpoint's **pooler** hostname. Both use explicit `sslmode=verify-full`. The originally named UNPOOLED variable actually contained a pooled hostname; the pool guard detected it before an owner write, and it was corrected against exact MCP compute metadata. Never infer connection mode from a variable name.

`node scripts/database.mjs migrate .env.neon.local` uses the direct owner connection and was verified as a no-op after MCP application. `runtime` configures a previously SQL-created role, writes the pooled credential privately, and checks privileges; it rotates that runtime password when explicitly invoked, so do not replay an uncertain setup. The script refuses any Neon project/branch/database outside the authorized development target. Production release/maintenance setup is a later task.

Verified development evidence:15 app tables,1 migration ledger entry,4 immutable triggers; runtime `neon_superuser` membership=false, schema CREATE=false, all superuser/createdb/createrole/bypass flags=false, owned app tables=0. An actual Node pooled connection reported runtime role,15 tables, pool max5 and successful immutable core release checksum verification. Connection strings/passwords were never logged or committed.

## Persistence and recovery contract

Private initial/checkpoint JSON uses `{stateSchemaVersion:"match_state_v1",state:MatchState}`. This is a storage envelope; engine hashes cover only the unwrapped deterministic state. Runtime validates the closed private state shape, schema version, RNG words, public projection, pinned versions, match identity/lifecycle, sequence/revision agreement and canonical SHA-256 before use. Checkpoints have a256KB hard limit; no truncation. `matches(id,revision)` → checkpoint uses a deferred composite FK, so a transaction must update both revisions atomically. Seeds, deck snapshots, initial state, content manifests and match version/rematch pins cannot be updated.

All mutation/claim paths must lock involved principal rows in ascending UUID order **before** match rows. `withLockedMatch` performs that ordering and owner-scoped lookup. `withPrincipalTransaction` provides the same ordering for create/merge orchestration; T07 must check receipts, call `insertInitialization` and `insertMatchReceipt` inside that one transaction. Convenience `createMatch` is lower-level creation without an HTTP receipt, used for fixtures; it must not be followed by a separate committed receipt write. No HTTP success is authorized before commit. No network calls inside these transactions.

`recordIntent` records validated HUMAN/BOT intents, requiring the BOT's next RNG even when unchanged. `recordAutomatic` executes exactly one root using `describeAutomaticOperation`. Each row stores global step sequence and nullable first/last event bounds; roots with no events still get their own row. Aggregate ADVANCE is never a journal action. `persistTransition` validates at most8 new rows by replaying a normalized sequence copy against the locked checkpoint, then comparing complete events/state/hash. Stored global sequences remain unchanged. Ordinary load/append does not replay the entire game. `replayMatch` is an explicit audit: reconstruct initialization from seed/snapshots, replay the entire journal without a bot policy, and compare final checkpoint plus all persisted events.

`persistTransition` writes checkpoint, revision, journal, events, terminal result/retention dates and owner-only validated receipt in one transaction. Receipt insertion is last. Tests force a receipt PK failure after the preceding writes and compare every affected table with its pre-transaction state. Create receipt conflict likewise rolls back initialization/checkpoint/events. Result damage resolves UNIT instance ownership from events and includes only human COMBAT/EFFECT damage to the opposing hero. Operational active time includes accepted command intervals capped60s; paused intervals are excluded. GET/duplicate handling belongs to T07 and never calls persistence.

Claims have a unique source-principal tombstone plus recovery/audit expiry fields. Principals have `merged_into_principal_id`/`merged_at` so a later bootstrap-recovery handler can reject minting sessions for an already merged guest even after the5-minute recovery window. Later claim/bootstrap code must use this evidence; schema alone does not implement OAuth or recovery authorization. `matches.bot_intents_since_human` is a persistent0..64 guard slot for T07/T08; policies/enforcement remain there. Tutorial checkpoint schema/replay operations extend explicitly in T14 rather than accepting arbitrary JSON.

Shared rate limits use PostgreSQL `rate_limit_windows` and an atomic upsert with saturation. Defaults are120 commands/minute/principal,10 creates/hour/principal and a bounded20 guest bootstraps/minute/IP hash. The latter is an initial configurable bound, since the source contract did not prescribe its number. `rateLimitKey` uses HMAC-SHA256; never persist a raw IP. Clock/limits are injectable. T07 enforces these helpers; T18 owns expiry cleanup.

## Production Node distribution

Existing workspace exports point at TypeScript sources, and root declaration emit does not resolve them for plain Node. Task6 therefore pins esbuild0.28.2 and bundles backend workspace imports plus Drizzle into `apps/api/dist/persistence.mjs`; pg/Ajv remain normal production dependencies. `createRequire` supports bundled CommonJS dependencies. This backend-only entry is not an HTTP server; T07 adds Fastify registration and T18 adds final container topology. No browser import of this private bundle is allowed.

The recovery integration test creates a real pending COMBAT checkpoint, starts a separate **plain Node** process importing this built artifact with no tsx/Vitest aliases, loads the durable checkpoint, advances one exact root and commits it. The parent then reopens it and verifies complete state equality and full replay. This checks runtime package resolution and database durability across process exit, not only JSON cloning in one process.

Stable versions verified from registry metadata and primary docs: drizzle-orm0.45.4, drizzle-kit0.31.11, pg8.23.1, @types/pg8.23.1, esbuild0.28.2; Ajv8.20.0 reuses the contract validator's pinned release. Drizzle docs show RC examples, but this project pins stable dist-tags rather than adopting prerelease packages. Drizzle Kit reports two deprecated esbuild-kit transitive development dependencies during installation; no new runtime service was added. Sources: [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql), [node-postgres pool](https://node-postgres.com/apis/pool), [Neon roles](https://neon.com/docs/manage/roles), [Neon pooled/direct connections](https://neon.com/docs/connect/connection-pooling), [esbuild bundling](https://esbuild.github.io/api/#bundle).
