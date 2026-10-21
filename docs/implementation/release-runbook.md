# Release and operations runbook

Release remains held by [release-checklist.md](release-checklist.md). These are explicit operator actions, not an authorization to publish, deploy, migrate a player's database or dispatch CI. The historical source design remains preserved; [OATHFRONT.md](../OATHFRONT.md) records execution amendments.

## Local/self-host Docker

Use Node24.20.0/pnpm11.25.0 and Docker Compose. Run `node scripts/create-compose-env.mjs .env.compose.local 3300` to generate an ignored0600 file with four distinct random64hex values; never paste them into logs. `.env.example` documents the names. Set `APP_ORIGIN` to the exact browser origin and choose a free `UI_PORT`. The Task18 drill uses project `oathfront-task18`, UI3300, a new named volume; it never touches `oathfront-db-1`, interactive3000/3001, unrelated3100 or other applications.

```sh
# Example explicit project/env; first inspect listeners and existing Compose projects.
docker compose --env-file .env.compose.local -p oathfront-local -f compose.yaml build db
docker compose --env-file .env.compose.local -p oathfront-local -f compose.yaml build api
docker compose --env-file .env.compose.local -p oathfront-local -f compose.yaml build ui
docker compose --env-file .env.compose.local -p oathfront-local -f compose.yaml up -d --wait db
node scripts/prepare-compose.mjs .env.compose.local oathfront-local
docker compose --env-file .env.compose.local -p oathfront-local -f compose.yaml up -d --wait
```

Setup applies reviewed migrations with a matching ledger and grants the existing/new restricted runtime role; it does not reset data or rotate an existing role password. API never receives the owner connection. No DB/API port is exposed. Exactly three steady-state containers use three images. Runtime images carry compiled application/runtime dependencies and public exports; source PNG masters, generation prompts and evidence remain in Git, outside images. The small imported `effect-families.json` is a required build input.

`API_ORIGIN=http://api:3001` is a UI **build argument**. Runtime-only changes cannot replace baked Next rewrites. Ingress listens on3000 and starts untouched Next standalone on loopback3006. It overwrites the custom client IP and proxy token only for `/api/v1/*`; `/api/auth/*` stays in Next and receives no proxy credential. API `trusted-next` mode validates the separate `UI_PROXY_SECRET` before trusting the single IP. Direct mode ignores forwarded headers. Never expose stock Next directly and assume its XFF is trustworthy. The extra hop/process and internal secret are deliberate costs. Rotate the shared proxy secret on both sides together; mismatches fail closed.

Use `docker compose ... restart api ui` for the **named target only**. A restart preserves DB volume, checkpoints, block-response continuations and receipts. SIGTERM allows10 seconds to close HTTP/drain accepted mutations and then close the pool; Compose allows15 seconds. A forced deadline means outcome unknown, not rollback. After restart, recover the snapshot and retry the same command ID/body; never fabricate a fresh ID for an uncertain action. Do not prune, reset, remove volumes or stop other projects as routine cleanup.

## Hosted profile: two Vercel projects + Neon

The local configuration target is Vercel Hobby noncommercial, Node24, Singapore `sin1`, adjacent to the existing Neon AWS `ap-southeast-1` project. Account/project setup, current quotas and real deployment behavior remain unverified. Use project root `apps/web` for Next and `apps/api` for Fastify, including files outside each root for workspace dependencies. Each has its own `vercel.json`.

The initially evaluated Services beta was rejected because its documented environment variables are shared across services. Two projects preserve the secret boundary:

| Setting | Next project | API project |
| --- | --- | --- |
| `OATHFRONT_HOSTED_PROXY` | `1` at build and runtime | absent |
| `API_UPSTREAM_ORIGIN` | fixed HTTPS API deployment origin | absent |
| `UI_PROXY_SECRET` | limited forwarding credential | same forwarding credential |
| `DATABASE_URL` | **absent** | pooled restricted runtime Neon URL |
| `SESSION_SECRET` | **absent** | application session/CSRF secret |
| `APP_ORIGIN` | not required for proxy | exact HTTPS frontend origin |
| `NEON_AUTH_BASE_URL` | managed-auth endpoint | JWT verifier endpoint |
| `NEON_AUTH_COOKIE_SECRET` | Next managed-auth cookie secret | absent |
| migration/owner URL | **absent** | **absent** |

Next narrowly rewrites `/api/v1/*` to its Node `forward-v1` handler in this profile. It derives the original IP only from the first Vercel ingress's validated `x-vercel-forwarded-for`, overwrites `x-oathfront-client-ip` and its proxy credential, then forwards once to the fixed HTTPS API origin. The second Vercel deployment replaces standard XFF, so API uses only the authenticated application-specific IP. Missing/wrong proof is rejected for all `/api/v1/*` requests. Raw bodies/command IDs, Cookie/Set-Cookie and no-store survive; no automatic retry is introduced. `/api/auth/*` stays with managed auth. The extra hosted function/hop consumes both projects' quotas. Local HTTP tests emulate platform headers; they do **not** prove real cloud edge overwrite.

The recognized `apps/api/server.ts` exports the Node request handler. `src/app.ts` remains a factory; `src/server.ts` remains the plain Node/Docker listener. The installed Vercel adapter intercepts listen(), so importing a top-level awaited standalone listener deadlocks. Hosted initialization reuses one app/pool, awaits readiness for requests, attaches the pool and passes accepted operation promises to `@vercel/functions.waitUntil`. `config.maxDuration=30` bounds the function and pending work; it is not durable background execution. The durable transaction/receipt is still the correctness boundary.

Before any authorized deploy, verify production OAuth callback/trusted origin, exact secrets per project, Node version, region, runtime grants, quota availability, direct API proof rejection and a lost-response/retry against the real hosted adapter. No production deployment has occurred. The installed Neon Auth0.6.0-beta peer exception remains scoped; do not broadly upgrade to suppress warnings.

Official references checked2026-10-21: [Fastify](https://vercel.com/docs/frameworks/backend/fastify), [request headers](https://vercel.com/docs/headers/request-headers), [waitUntil/pool attachment](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package), [function duration](https://vercel.com/docs/functions/configuring-functions/duration), [Hobby](https://vercel.com/docs/plans/hobby), [Services shared env](https://vercel.com/docs/services).

## Maintenance, compatibility and recovery

`apps/api/dist/maintenance.mjs` accepts `versions`, `retention <UTC-ISO-cutoff>` or `migrate`; it requires an explicitly supplied direct owner/maintenance `DATABASE_URL_UNPOOLED`. Keep that credential outside HTTP runtime and hosted environments. Run the command from repository/runtime root. Schedule retention daily only through an independently authorized maintenance environment; no public cleanup endpoint or automatic cron is installed.

```sh
node --env-file=.env.maintenance.local apps/api/dist/maintenance.mjs versions
node --env-file=.env.maintenance.local apps/api/dist/maintenance.mjs retention 2026-10-21T00:00:00.000Z
```

Retention locks the principal before match resources and rechecks the cutoff under lock. Unclaimed guests expire absolutely at7 days. Inactive account matches close through replayable `ADMIN_ABANDON/EXPIRED`, not gameplay loss. Active details and match receipts survive; terminal details last30 days, summaries180 days. Claim/bootstrap tombstones last7 days and referenced sessions remain while needed. Content registries are not garbage-collected automatically. Append-only deletion requires maintenance privileges, never broadened runtime grants.

Startup/readiness refuses unsupported active/paused rules/content/location/bot or tutorial scenario/hash/manifest bindings. Before rollout run `versions`; retain every active pinned registry. Use forward migrations and expand/contract compatibility: apply reviewed compatible expansion, deploy compatible code, verify, then consider contract changes only after old usage expires. A code rollback cannot undo data migration; confirm both old/new binaries understand the current schema and pinned state. Never rewrite stored versions or old migration files.

The authorized Neon development branch is `br-odd-pine-a1pw77e9` in project `round-darkness-78734677`, DB `oathfront`; production `br-old-boat-a1irt1i9` is default and untouched.0002/0003 were applied via explicit Neon MCP after local verification and ledger recheck. Interactive `oathfront_interactive` was deliberately not migrated; its operator must run the existing `prepare-auth-db.mjs` before the next launcher restart.

Health: `/health/live` reports process health; `/health/ready` checks DB/release compatibility. API errors log generated request ID and public error code, not raw URL/query, cookies, JWT, IP, checkpoint or driver exceptions. API private responses use no-store; the direct immutable public catalog remains cacheable, while the hosted proxy deliberately uses no-store. Production UI has nosniff, frame denial, permissions policy and CSP without unsafe-eval. CSP still allows inline scripts/styles for Next/runtime compatibility; this is not nonce-based XSS hardening. Self-host HTTPS termination/HSTS is an operator configuration gate.

See [restore-drill.md](restore-drill.md) for measured recovery evidence and its limits.

## Quota reference and packaging notes

Official plan pages checked2026-10-21: [Vercel Hobby](https://vercel.com/docs/plans/hobby) is personal/noncommercial and lists4CPU-hours,360GB-hours provisioned memory,1million function invocations/CDNrequests,100GBfast transfer and10GBorigin transfer per month. Recheck actual account usage before deployment; quotas can pause service. [Neon Free](https://neon.com/pricing) lists1GB/project,100CU-hours/project/month,2CU maximum,10branches/project and5GBegress/project; restore window is up to6hours or1GB of changes. These are plan references, not provisioned capacity or recovery guarantees. The inspected development compute reported suspend_timeout_seconds=0; do not relabel it as the generic5-minute scale-to-zero setting.

API packaging uses the frozen workspace install and `scripts/package-api-runtime.mjs` to copy only the already resolved external pg/Ajv production dependency closure, retaining metadata/licenses. It refuses conflicting flattened versions or unsupported metadata. The bundled API resolves workspace code internally. This narrow packager replaces pnpm11's experimental legacy deploy, which re-resolved unrelated workspace metadata and could not reproduce an offline deployment from the frozen install alone. Runtime dependency versions are recorded in the image's runtime-dependencies.json; verify its separate real Node process and database behavior when changing externals.
