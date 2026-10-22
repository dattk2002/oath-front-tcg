# OathFront — execution decisions

The user approved the full game spec and requested implementation on 2026-10-20. The project is OathFront. The current interface and world presentation are English; see [PRESENTATION-EN.md](PRESENTATION-EN.md) for The Fivefold, Dawnward, Ashen Court, and stable-ID name/rules mappings. Original Vietnamese source names remain in immutable `core_v1`, `locations_v1`, `tutorial_v1`, source-parity tables, historical records and legacy wire fields. Numeric rules, IDs, stored checkpoints and user-entered names remain unchanged.

## Latest user requirements

- Next.js frontend in `/home/bia/Works/Coding/oath-front-tcg`, monorepo with separate frontend/backend.
- Push small coherent commits to existing public repository `https://github.com/dattk2002/oath-front-tcg` after completion and verification. Repository inspected empty before clone.
- Images named `oath-front-ui`, `oath-front-api`, `oath-front-db`. A Docker Compose stack runs three containers; a container cannot combine three independent images.
- Vercel Hobby chosen for noncommercial free-tier hosting; Neon Free is the production database. No production deploy requested in this turn.

## Implementation mapping

`apps/web`: Next.js App Router, TypeScript, CSS Modules/tokens, PixiJS/GSAP client components. Next layout/routes replace Vite/React Router; game rendering stays client-side. `apps/api`: standalone Fastify Node service plus Vercel-compatible entrypoint. `packages/*`: contracts, content, engine, bot, db. Namespace `@oathfront/*`. Next proxies `/api/v1/*` to Fastify and reserves `/api/auth/*` for its local managed-auth handler; same-origin cookie/CSRF contract stays in force. DB secrets remain backend-only.

Local Docker: Next standalone UI (3000), API (3001), PostgreSQL (5432 internal). UI is user-facing entrypoint; DB port only loopback if explicitly needed for local tests. Runtime pool max 5 and separate migration connection/role. Images built locally, no registry publication. Production uses hosted Neon and does not run local DB image on Vercel. Deploy topology/configurations documented and build-checked; do not provision hosts as a side effect.

## Execution and evidence

Apply `docs/superpowers/plans/2026-10-20-oathfront-implementation.md` task-by-task with reviews. The fresh repo at the exact requested path is the isolated workspace; main is authorized for this empty initialization. Source docs under the old project and Downloads are untouched.

External checks (real Google OAuth, Safari/device/touch benchmarks, 5 actual playtesters) must be truthfully reported if unavailable. Their pending status does not stop independent implementation, Docker/CI packaging and test completion; they remain release acceptance gates. No fabricated results or declared balanced release.

The existing game visual language overrides generic marketing layout rules in UI skills. Use skill guidance for motion, contrast, hierarchy, accessibility and review without adding irrelevant landing-page sections, random photos or scroll pinning to the board.

## Task18 operational amendments

Hosted profile uses two Vercel Hobby projects (Next and Fastify, Singapore sin1) with Neon AWS ap-southeast-1. Services beta was evaluated and rejected because it shares project environment variables. DATABASE_URL and SESSION_SECRET remain API-project-only; owner/migration credentials stay outside hosted runtimes. A separate limited UI_PROXY_SECRET authenticates original-client-IP forwarding across deployments. Next routes only /api/v1/* through its hosted server-side forwarding handler; /api/auth/* remains local managed auth. Docker/standalone keeps the narrow build-time external rewrite and adds a socket-derived authenticated ingress wrapper in the UI container. Three images/services and persistent database volume remain the local/self-host profile.

The hosted Fastify root entrypoint exports a Node request handler over the shared buildApp factory; the standalone entrypoint owns listen and graceful shutdown. The Vercel adapter intercepts listen, so a top-level awaited standalone listener is not its entrypoint. waitUntil preserves accepted work only within function maxDuration; receipt/transaction semantics remain authoritative. Readiness blocks unsupported active rules/content/location/bot/tutorial bindings.

Neon development migrations0002/0003 were explicitly applied and verified; production and the user's interactive database were untouched. Before the next interactive restart, run prepare-auth-db.mjs after build:api to preserve data while applying forward migrations. See implementation/release-runbook.md and release-checklist.md. M5 performance/balance/human gates remain open; no production readiness/deployment or unlimited-free claim is made.

## Twenty-hero catalog and Home expansion — 2026-10-22

The user approved playable integration of the fourteen new heroes and a unified redesign of all twenty illustrations plus the Home banner. `heroes_v1` was the catalog at this milestone (20 heroes, 32 powers, 20 legal starter presets, unchanged 60 cards). `core_v1` and old persisted matches/decks/tutorials remain supported without rewriting. New requests bind the selected version; old uncertain requests retain their original body/command ID until resolved.

Home now has six meaningful sections, with real routes and card rules. The [art direction](design/heroes-v4.md) and [Pen contract](design/pen/DESIGN-CONTRACT.md) record derived scope; no new Pen nodes are invented. Source Pen bytes remain frozen. Existing balance/device acceptance limits remain open; no manual production deployment is part of this task. See [implementation evidence](implementation/playable-heroes-home.md).


## Elements, distinct heroes and live events — 2026-10-22

Current catalog is `elements_v1`: 20 heroes, eight systems/two per hero, 36 powers, 72 cards and 20 legal presets. New deck law is 30 cards, maximum two copies, Neutral maximum twelve, at least six cards from each hero system; historical faction no longer restricts cards in this catalog. Existing versions remain byte-frozen and authoritative for old matches/decks. Artwork audit redrew eight overlapping identities and retained twelve distinct heroes.

News, twelve weekly E-card reveals and 84 prepared daily scenarios are owner-authored DB records. Accounts receive tickets and permanent owned copies; guests practice without rewards. Reset is 07:00 Vietnam time, weeks begin Monday. Daily win pays 100, three/five distinct wins add 200/300, seven unlock a cosmetic; 1200/2400 weekly tickets award the first/second featured card. PvE earns 50 plus 50 for each matching hero system, capped at 200/day. Loss/surrender imposes one hour; disconnect resumes the same attempt. Weekly tickets stay bound to their original week and earned cards persist.

Apply forward migrations and seed only local interactive and the verified Neon development branch. Do not deploy production. Full rules, implementation checks, deviations and remaining release gates are in [elements-events.md](implementation/elements-events.md); administrative commands are in [live-content-admin.md](implementation/live-content-admin.md).
