# OathFront

English presentation for an online PvE card game: Next.js frontend, Fastify authoritative API, PostgreSQL persistence, deterministic engine/bot and versioned content. The current `elements_v1` catalog has **20 playable heroes, 8 systems, 36 powers, 20 starter presets and 72 cards** (60 free base cards and 12 earnable event units); immutable `core_v1` and `heroes_v1` remain supported for earlier matches and tutorials. Tutorial and skirmish support Dawnward and the Ashen Court. See the [English presentation catalog](docs/PRESENTATION-EN.md). No PvP, shop or LLM gameplay.

**Release is on hold.** Technical checks are separate from the open frame-time, balance, human playtest and physical-device acceptance gates. See the [release checklist](docs/implementation/release-checklist.md) and [documentation index](docs/README.md).

See the [current systems and card rules](docs/design/elements-v1.md), [whole-roster art audit](docs/design/hero-distinction-audit.md), and [events/design implementation report](docs/implementation/elements-events.md). News and weekly events are database-backed; the first event starts **26 October 2026, 07:00 Vietnam time**.

## Run locally

Use Node **24.20.0**, pnpm **11.25.0**, Docker Compose and Python with `tools/assets/requirements.txt` for asset verification.

```sh
node scripts/create-compose-env.mjs .env.compose.local 3300
docker compose --env-file .env.compose.local -p oathfront-local -f compose.yaml build db
docker compose --env-file .env.compose.local -p oathfront-local -f compose.yaml build api
docker compose --env-file .env.compose.local -p oathfront-local -f compose.yaml build ui
docker compose --env-file .env.compose.local -p oathfront-local -f compose.yaml up -d --wait db
node scripts/prepare-compose.mjs .env.compose.local oathfront-local
docker compose --env-file .env.compose.local -p oathfront-local -f compose.yaml up -d --wait
```

Open **http://localhost:3300** and play as a guest. Choose a free port before setup; do not reuse the existing test/interactive project. The generated ignored env is0600 and never overwritten. Google sign-in requires the separate managed-auth setup below. See the [runbook](docs/implementation/release-runbook.md) for environment and restart details.

For the existing interactive Google-enabled installation, follow [AUTH.md](docs/AUTH.md): `pnpm build:api`, then **`node scripts/prepare-auth-db.mjs`** to apply forward migrations while preserving accounts/sessions, then `node scripts/local-auth.mjs`. That database is `oathfront_interactive`, on UI3000/API3001. Do not restart or migrate an already-running player session automatically. Basic Google sign-in was user-confirmed; production OAuth configuration is a separate gate.

## Verify

First initialize an isolated test database:

```sh
pnpm install --frozen-lockfile
node scripts/create-test-env.mjs
docker compose --env-file .env.test.local -f compose.db.yaml up -d --build --wait
```

The env generator refuses overwrites. Fixtures migrate/reset only an explicitly authorized loopback `*_test` database; CI uses `oathfront_verification_test`. Never use a player's database. See [.env.test.example](.env.test.example).

```sh
pnpm --filter @oathfront/web exec next typegen
pnpm typecheck
pnpm lint
pnpm test
API_ORIGIN=http://127.0.0.1:3101 pnpm build
OATHFRONT_E2E_PORT=3200 OATHFRONT_E2E_PRODUCTION=1 pnpm test:e2e
pnpm exec tsx tools/load/pve.ts --concurrency 20
```

Run DB suites, builds and browser suites sequentially. UI3200/API3101 are the CI verification defaults. If local3101 is occupied, use the existing isolated test DB and a free loopback port such as3121: `API_ORIGIN=http://127.0.0.1:3121 pnpm build`, then `OATHFRONT_E2E_API_PORT=3121 OATHFRONT_E2E_PORT=3200 OATHFRONT_E2E_PRODUCTION=1 pnpm exec playwright test`. Interactive3000/3001, unrelated services and the player's database are reserved. Next bakes its rewrite destination during build, so the API override must match. The normal E2E suite skips the explicit hardware benchmark; existing 900/400 balance reports are audited, not regenerated.

## Docker and hosting

| Service | Image | Runtime |
| --- | --- | --- |
| `ui` | `oath-front-ui` | Next standalone plus trusted ingress; only public port |
| `api` | `oath-front-api` | Bundled Node API; private network |
| `db` | `oath-front-db` | PostgreSQL17 with persistent named volume |

`compose.yaml` defaults to project `oathfront`; use an explicit separate project when the existing test stack already owns that name. [.env.example](.env.example) contains placeholders only. Follow the [release runbook](docs/implementation/release-runbook.md) for generation, explicit migrations, health checks, restart and retention.

The hosted profile uses **two Vercel Hobby projects** and Neon, with a server-side authenticated same-origin proxy. Docker Compose is a separate local/self-host profile. No hosted project, deployment or registry publication is created by these files. Free tiers have quotas and usage restrictions; neither capacity nor availability is unlimited.
