# Clean release-projection build verification

The later native Vercel production build for `15885fd` passed in the normal repository layout and reached READY at `oathfront.vercel.app`. See [production build log](production/vercel-build.log), [deployment metadata](production/deployment.json) and [live browser verification](production/smoke.json). The projection-specific limitation below is retained as historical local evidence.

Web TypeScript, production Next compilation, all 30 static pages, and the separately verified standalone preparation pass after the authorized test-fixture correction. The full web package wrapper retains its original **exit 1**: nested projection tracing changed the emitted server path. An output-only alias enabled the unchanged preparation script to pass separately; no source/configuration change or recompile was made.

- Baseline: `f6873495f2aa82426ffda75085141791a33a6fb3` via `git archive`; no branch, worktree, commit, staging, push, or API build.
- Projection: `/home/bia/Works/Coding/oath-front-tcg/.superpowers/sdd/2026-10-22-card-scenes/release-projection-20261022-verify` (plan's gitignored workspace on `/home`, not tmpfs).
- Overlay: exactly 29 paths from `owned-code-paths.txt`, plus 108 runtime files in `apps/web/public/assets/card-scenes-v1/` (~16 MB). Source masters and user-owned audio-v2/v3 assets are excluded. Design-contract overlay was unnecessary and omitted.
- Dependency reuse: existing web node_modules symlink; root node_modules is local with individually symlinked dependency entries, and local task state. pnpm may refresh dependency metadata when running commands; application source is not resolved through an original App symlink.
- App/layout/settings/audio/shell/API auth inputs match exact HEAD, including after verification. Next-generated next-env.d.ts changes are confined to projection.
- All 29 overlay hashes were rechecked against both projection and current source after verification; no drift.

## Authorized fixture correction

Changed only original `apps/web/tests/card-visual.test.ts`: import existing `publicCatalog` helper and pass `publicCatalog("elements_v1")` to DeckPreview. Raw card cases still use `elementsCatalog`. No API code was edited. The initial missing `sha256` TS2769 was reproduced by both build and typecheck before correction.

`pnpm exec vitest run apps/web/tests/card-visual.test.ts`: **7/7 tests passed**, exit 0, 801ms. Targeted ESLint, Prettier check, and `git diff --check` exit 0. pnpm's auto-install step emitted transient dependency-bin chmod ENOENT warnings during parallel targeted formatting/lint wrappers; the checks themselves passed. Full suite and full lint remain controller-owned.

## Fresh checks

| Check | Exit | Evidence |
| --- | --- | --- |
| `pnpm --filter @oathfront/web typecheck` | 0 | clean-typecheck.log, clean-typecheck-result.json |
| `API_ORIGIN=http://127.0.0.1:3101 pnpm --filter @oathfront/web build` | 1 | clean-build.log, clean-build-result.json |

Typecheck: 2026-10-22T15:24:55.174918+00:00 → 2026-10-22T15:25:01.300068+00:00 (completed before rebuild).

Build: 2026-10-22T15:25:14.164331+00:00 → 2026-10-22T15:25:48.514374+00:00. Webpack compiled in 7.0s, TypeScript completed in 3.3s, all 30 static pages generated, and build traces completed. The final standalone preparation script failed:

```text
ENOENT: access .../apps/web/.next/standalone/apps/web/server.js
```

Diagnosis from required-server-files.json:

- outputFileTracingRoot: `/home/bia/Works/Coding/oath-front-tcg`
- relativeAppDir: `.superpowers/sdd/2026-10-22-card-scenes/release-projection-20261022-verify/apps/web`
- Actual generated server: `/home/bia/Works/Coding/oath-front-tcg/.superpowers/sdd/2026-10-22-card-scenes/release-projection-20261022-verify/apps/web/.next/standalone/.superpowers/sdd/2026-10-22-card-scenes/release-projection-20261022-verify/apps/web/server.js`

The original prepare script assumes the deployment repository root and `standalone/apps/web/server.js`. The nested projection plus dependency symlinks inferred the original repository as tracing root, adding the projection prefix. No unrelated Next configuration change was made. The output-only alias validation below passes separately. The full web package build must still not be reported as exit 0 from this run.

## Separate standalone packaging validation

Authorized output-only alias: `.next/standalone/apps/web` points to the actual nested generated server directory, staying inside this snapshot's standalone output. No application source, Next configuration, package script, or original build output was changed, and no recompile occurred.

Ran exact unchanged script `node ../../scripts/prepare-web-standalone.mjs` from projection `apps/web`: **exit 0**, 2026-10-22T15:28:11.779217+00:00 → 2026-10-22T15:28:11.981785+00:00. Verified `server.js` exists, all **841 public files** match source paths and SHA-256, and all **59 .next/static files** match source paths and SHA-256. Evidence: `clean-packaging-alias.log`, `clean-packaging-alias-result.json`.

This verifies the preparation script separately after adapting only the nested snapshot output path. The original full package wrapper exit remains 1; the normal deployment context is a separate verification responsibility.

## Prior launch/failure evidence

The first pnpm wrapper launch stopped before Next because pnpm 11.25.0 rejects a symbolic-link root node_modules task-state directory. Installed pnpm source confirmed this. Replaced only the snapshot root link with a real local directory containing dependency-entry symlinks; no security setting disabled. Evidence: clean-build-launch-blocked.log/result.json.

The first actual compilation failed on the test fixture's missing PublicCatalog.sha256. Evidence retained in clean-before-fixture-fix-build.log/result.json and clean-before-fixture-fix-typecheck.log/result.json. The rebuild was explicitly authorized after correcting that real error.

No API build, root test/lint, browser checks, Git mutation or deployment was performed by this worker. The only original source edit is the explicitly authorized fixture correction.

## SHA-256 map of overlaid code

```text
8bde9217d05bbf41c30b379c46a088c294cad0bccf7895f479fa31b24cca3199  apps/web/src/features/content/CardVisual.tsx
92d21bbc7f4f3f3eb5337413daf144abec2f7b4a12402997aa7022024242ce09  apps/web/src/features/content/RarityGem.tsx
4e9ec35b0f55be78e5821ae7be9a5350b1082cb4ea0a8c6524b531e6053c33ef  apps/web/src/features/content/ContentBadges.tsx
b4717538eca81b34a8fb64c2f248e2253a321aaa191052e5517203b5cee30b5e  apps/web/src/styles/cards.css
7f5293254e0c095c8c951f183b110f248cdeed005f6972ecbb5a3ded69daf689  apps/web/src/styles/game-theme.css
78cea9abe9f23a936c8277c7495952393506cff5270fa6c53327cef8fcd3801e  apps/web/src/features/deck/CardCollection.tsx
f0485d8afd3f18a9856f89ddac95d5cce99fefc5fe53615cceacdc815559e334  apps/web/src/features/deck/DeckPreview.tsx
799b1a4402f07aed8c24b535b4bbd048bd6777f07e285330789dc1210fa5b7c9  apps/web/src/features/deck/DeckBuilder.tsx
787af937c241c03c57593691eab0db99234a8826c86d4ef7d5e03a43ecbefc7b  apps/web/src/features/match/Hand.tsx
c741207235c2ddf437fff2ec293b73d3ef800d583b976d3c91c4928d2a35f6d4  apps/web/src/features/match/InspectPanel.tsx
0b01118ba7f3845d2d917dc05c72ee431838cd7fdaa4abfe3a19dae2718342af  apps/web/src/features/match/rendering/asset-manifest.ts
57a21a45e133c69805a8d8cf26df7c3502b3b3b375ed3c8b9cd1c02fc1786761  apps/web/src/features/campaign/CampaignHome.tsx
2e0613a74689957953f90022423ab5f4bd32ff0490ed3f0934ae56fb1cd63a76  apps/web/src/features/campaign/FeatureStage.tsx
4dc3d0a2fc913de197659891ed2de584cbd8f88ef4a8b54668b3969e003d458f  apps/web/src/features/events/EventHub.tsx
0de2c0cc0dd1c71d376e39a82449165aa4eb3c87cf2c42dbd6adb6528f948e0a  apps/web/src/features/events/RewardSummary.tsx
e141b402051165059d63db53b3a1eb0e8472e466ebb220750f4ce97dc82f74f4  apps/web/tests/card-visual.test.ts
8d7839f9549183b455761afa37819fb6042b405fa72fa8e6c0973baf66fad9e0  tests/e2e/card-scenes.spec.ts
327d2655c624713e03115785fc93845bad113d26089c004f3d4c660c7f946f96  tests/e2e/card-touch.spec.ts
00273f8e5107e521d649c48abf56697a5ae5598536833ee4807d5664778909c6  tests/e2e/input-parity.spec.ts
ca5aa22e5f126d32ddb5a13559252a2d8b2b961614663475a9a5f63429a1e1af  tests/e2e/responsive.spec.ts
b04f0eca8e6bda9eb8862606821f0846e9878d554f2c97b0448065c16bde8cb8  tests/e2e/fivefold-card-art.spec.ts
6cf5548000eb36cd89b6afbc055e5968a59f4996a7e60ed48133657552406c89  tools/assets/export-card-scenes.py
d8c3b70a2372abf44c4332ef0c05873da248c1f16b1a46e4f22d19ad01ddfc4b  tools/assets/inspect-card-scenes.py
1536bc1400e18353cfd691a90afa6f7b604cefb57134b41d35341cec9951757e  tools/assets/tests/card-scenes.test.ts
6602dcf2019c3504edc780d5fd45ae40d1c28507a8c24f7345d35cfc6d99466c  tools/assets/tests/card_scene_safety.py
4c3e24402581f2baf2ee2be8bbd360c81f0cbeeb0f73c78912d49a91230a4f75  tools/assets/tests/rivals.test.ts
0e20c7b56e7abaa87e3e261ef86984461ec664e23a179539885f259d25ae24a6  apps/web/src/features/match/motion/event-timeline.ts
a5dff0604bd67a44e4e5c0d0865ba6cdb51fbe2c2cc9666ab7849b970298b03f  tests/e2e/elements-ui.spec.ts
db29574de2a3eea91a92294a099c3b0a8566fd858363ddba98627e82ccee07b8  tests/e2e/motion.spec.ts
```

Full snapshot and protected-input metadata: clean-build-snapshot.json.
