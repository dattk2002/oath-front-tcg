# OathFront project instructions

Read `docs/OATHFRONT.md` and the applicable spec before implementation. The source design is approved. Latest user request authorizes implementation, small commits and push to `dattk2002/oath-front-tcg`; no production deployment or registry publishing. Work only inside this new project.

Use Next.js App Router for `apps/web`, Fastify for `apps/api`, pnpm workspace packages `@oathfront/*`. Shared public contracts stay in sync with docs JSON Schema; no private match state in browser. Neon is production DB; isolated PostgreSQL Docker is local/test. Never commit secrets.

Follow the 18-task plan sequentially. SDD implementers never spawn agents; controller dispatches required task reviews. Do not push until controller verifies integration. User has authorized working in this newly cloned empty repo on main. Preserve full core content and game rules.

UI uses GSAP and PixiJS with semantic DOM. Follow approved battle/screen designs over generic marketing/AIDA templates or layout randomization. Vietnamese labels, keyboard, reduced motion and 375px device fallback required.
