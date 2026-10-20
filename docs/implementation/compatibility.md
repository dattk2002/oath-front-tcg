# Workspace compatibility — Task 1

Verified against the npm registry on 2026-10-20. All direct package versions are exact; `pnpm-lock.yaml` pins transitive dependencies. No preview/canary packages are used.

| Component | Pinned version | Compatibility decision |
|---|---|---|
| Node.js | 24.20.0 | Provisioned Node 24 LTS toolchain; `.node-version` and root engines pin it. |
| pnpm | 11.25.0 | Keep the provisioned stable toolchain; `packageManager` pins it. A newer major exists, but is unnecessary for this workspace. |
| Next.js | 16.4.2 | App Router frontend boundary, Node >=20.9 and React 19 supported. |
| React / React DOM | 19.3.1 | Latest stable pair accepted by Next's peer dependency range. |
| Fastify | 5.12.7 | Separate backend; Node 24 is an active LTS line covered by Fastify's LTS policy. |
| TypeScript | 6.0.3 | Latest compatible stable release: TS 7.0.2 exceeds typescript-eslint's supported `>=4.8.4 <6.1.0` range. |
| ESLint / typescript-eslint | 10.13.0 / 8.72.0 | Compatible published peer ranges; flat config. |
| Vitest | 5.0.5 | Requires Node ^22.12, ^24, or >=26; Node 24 qualifies. |
| Ajv / ajv-formats | 8.20.0 / 3.0.1 | Canonical draft-07 JSON Schema validation; no coercion, field stripping, or defaults. |
| json-schema-to-typescript | 16.0.0 | Generates every public definition and its typed lookup from canonical schema. |
| Prettier | 3.9.10 | Formatting and deterministic schema type generation dependency. |

Official references: [Next installation](https://nextjs.org/docs/app/getting-started/installation), [Fastify LTS](https://fastify.dev/docs/latest/Reference/LTS/), [npm registry](https://registry.npmjs.org/). `@types/node` stays on 24.19.2 to describe the actual runtime rather than Node 26; React types are 19.3.0.

`apps/web` and `apps/api` currently establish dependency/workspace boundaries. The approved later tasks add the actual Next App Router UI and Fastify service. `packages/game-engine` reserves the engine package boundary; Task 1 contains no game engine. At this stage `build` compiles the contracts and catalog TypeScript with declarations; it does not claim to build applications that do not yet exist. Later tasks must add their actual application checks to the root commands.

`pnpm test` runs all current workspace tests. The narrow commands from the brief also work from each package. `pnpm typecheck` checks implementation, tests, and Vitest configuration with strict TypeScript. `pnpm lint` runs ESLint. `pnpm build` verifies generated artifacts and emits JS/declarations under ignored `dist/`.

The source of truth for public wire objects is `docs/contracts/api-v1.schema.json`. `pnpm contracts:generate` emits the byte-identical packaged schema and all public TypeScript types; do not edit generated files. `pnpm contracts:check` checks both artifacts without writing, and CI runs it before tests. Runtime request validation and response serialization use that packaged schema and reject unknown/private fields. JSON Schema validates structure and privacy fields; view/game semantic invariants belong to the engine projection tasks.

Core content is versioned as `core_v1` / `rules_v1` / `locations_v1`. Its typed effects use a closed primitive union, explicit ordered effects and duration, deterministic trigger selectors, and explicit global-turn counters. Source-parity tests compare card names, cost/stats/text and hero/power/token/location/preset tables to the approved documents. Regular cards use `classId: null` for faction-common cards, matching the public schema. Token definitions never occupy deck entries; `TK_G_LANTERN` is tutorial-only.

`validateDeck` checks deck game legality for a structurally valid `DeckInput`; HTTP input shape is first checked by the canonical `DeckInput`/request schema. It reports existing contract issue codes rather than inventing a divergent error protocol. `validateCatalog` checks authoring structure, references, counts, effects and presets, and reports path/code/message issues without mutating definitions. These validators establish catalog correctness, not game balance or engine correctness.

CI uses exact published action commit references for checkout v7.0.1, setup-node v7.1.0, and pnpm/action-setup v6.1.0 (resolved from official repositories). CI has read-only repository permissions and no deploy/publish step. Local checks do not claim a hosted CI run occurred.
