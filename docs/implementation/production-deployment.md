# OathFront on Vercel Hobby — 22 October 2026

The user explicitly authorized the first public deployment at `https://oathfront.vercel.app`, then chose to publish PvE first and complete a dedicated Google OAuth client later. This supersedes the earlier local/development-only deployment scope. It does not close the historical balance, hardware performance or human playtest acceptance items.

## Targets

| Service | Target |
| --- | --- |
| Frontend | https://oathfront.vercel.app · project `prj_9opnOrLJg7duOClH6RxjzburB50j` · root `apps/web` |
| API | https://oathfront-api.vercel.app · project `prj_pQ8MGrEYYLvlv0KEDv2qxkZbT5GB` · root `apps/api` |
| Vercel workspace | `kimdat0705gmailcoms-projects` · `team_aapUcMuQQCvWCuwKfiEsKJ4U` · Hobby verified in dashboard |
| Runtime | Node 24.x · Singapore `sin1` |
| Database | Neon project `round-darkness-78734677` · production branch `br-old-boat-a1irt1i9` · database `oathfront` |
| Git source | `dattk2002/oath-front-tcg`, production branch `main` |

The domain is assigned and verified in the frontend project. Both projects are linked to GitHub. Preview deployments remain protected; production is publicly accessible. Neither a paid plan nor a paid add-on was enabled. Hobby quotas still apply; this is not an unlimited hosting promise.

## Configuration and data

Production began with an empty application schema. The six versioned Drizzle migrations were applied atomically through Neon MCP, with an empty-schema/owner/database guard and matching SHA-256 ledger. The reviewed content export was imported atomically: 18 editorial posts, 12 weekly events and 84 daily scenarios. News and event visibility still follows the existing publication schedule; the first event starts on 26 October 2026 at 07:00 Vietnam time.

`oathfront_runtime` is a separate login without superuser, database-creation or role-creation permissions. It has the existing application's restricted table grants: read-only editorial definitions and append-only rewards where appropriate. Owner credentials are absent from both hosted projects. Development and interactive databases remain separate.

| Frontend environment | API environment |
| --- | --- |
| `OATHFRONT_HOSTED_PROXY=1` | `DATABASE_URL` (pooled runtime role) |
| `API_UPSTREAM_ORIGIN` | `SESSION_SECRET` |
| `UI_PROXY_SECRET` | `UI_PROXY_SECRET` |
| `NEON_AUTH_BASE_URL` | `APP_ORIGIN=https://oathfront.vercel.app` |
| `NEON_AUTH_COOKIE_SECRET` | `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL` |

All credentials were generated separately and stored as sensitive production environment variables. Only the limited proxy credential is shared between projects. No credential is stored in this document or committed to Git.

## Cloud packaging corrections

The first cloud API build exposed a missing project-local TypeScript configuration. `apps/api/tsconfig.json` now inherits the monorepo settings and explicitly declares ES2023 libraries.

The next real invocation exposed Vercel tracing workspace TypeScript exports without shipping their corresponding source paths. The API now builds `src/hosted.ts` into `dist/hosted.mjs`; the recognized `apps/api/server.mjs` exports that bundled handler. The existing Docker/Node listener remains unchanged. A regression test launches the compiled handler in a temporary directory with only its production dependency closure, without workspace source or TypeScript loaders, and checks its controlled configuration response.

## Authentication disposition

Neon Auth is enabled on the production branch, named OathFront, with the exact trusted origin `https://oathfront.vercel.app`. The Google provider is still Neon's shared development configuration. The user explicitly deferred dedicated Google OAuth setup. A real production Google sign-in, account merge and logout round-trip is not yet verified; do not represent account authentication as production-complete.

To finish Google OAuth, configure a Web application OAuth client in the user's Google Cloud project and set its authorized redirect URI to:

`https://ep-dawn-fog-a1urq6is.neonauth.ap-southeast-1.aws.neon.tech/oathfront/auth/callback/google`

Store the client ID/secret in the production Neon Auth provider, not in browser code or this repository. The subsequent user sign-in must be tested at the production domain. [Neon production OAuth guidance](https://neon.com/docs/auth/guides/setup-oauth#production-setup).

## Verification

Verified public frontend deployment `dpl_3p3vskF4Dw15yy8h1gvcBcGCr1ku` (commit `9013adc`) and API deployment `dpl_3Puca3uGMkJxR4dSL3yKRw8pyiw2` (commit `f1b219f`) are READY. The latter commit only changes the API entrypoint, so Vercel correctly skipped rebuilding the unchanged frontend.

- `/`, `/heroes`, `/game-features`, `/news` and `/events` returned HTTP 200 with the expected CSP. The API readiness endpoint returned HTTP 200 and `ready`.
- The real UI proxy returned the `elements_v1` catalog with 20 heroes and 72 cards; news/events returned HTTP 200 and `no-store`.
- A real guest received a Secure/HttpOnly cookie. Direct API requests with forged proxy proof and mutations from an untrusted origin were rejected with HTTP 403.
- A real production match accepted mulligan, pause, resume, automatic bot advancement, unit play and surrender. Reloaded revisions agreed with saved state. Repeating an identical command returned the identical receipt. The terminal match summary was readable; Neon readback confirmed COMPLETED/LOSS/SURRENDER at revision 11 with 12 receipts.
- Chrome independently traversed Home → Play now → hero → preset → opponent → match. Mulligan and Seed Tender lane placement worked; the board survived reload. No browser console warnings/errors were observed during that flow.
- Local compiled-handler/proxy checks: 4 tests passed. The installed Vercel Fastify adapter was also exercised directly: before the explicit import it selected `src/app.ts`; afterward it selected `server.mjs`.
- Runtime log review found expected rejected-request records and a PostgreSQL driver warning about future `sslmode=require` semantics. No application exception was observed on the corrected API deployment. The earlier failed deployments remain in history.

The HTTP report is [production-smoke.json](evidence/production/production-smoke.json). This is a bounded live smoke test, not a production load test or proof of game balance. The first diagnostic runner stopped before bot advancement and left its isolated guest match active; it does not modify any user's match and will follow normal guest expiry.

Uncommitted local audio and concurrent authentication changes were deliberately excluded from the release. The deployed source is the committed GitHub revision, not a filesystem upload of the dirty working tree.
