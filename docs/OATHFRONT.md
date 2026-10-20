# OathFront — execution decisions

The user approved the full game spec and requested implementation on 2026-10-20. The project is now OathFront. Existing Vietnamese world/hero/card names and all numeric rules remain unchanged.

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
