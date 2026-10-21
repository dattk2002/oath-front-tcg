# Task18 implementation report
Base4cc64fd70c46ca7c193bed51585d10b91676585d. Controller-owned milestones modified at start; preserved. Read authoritative brief, global constraints, AGENTS/OATHFRONT, implementer/TDD/verification/platform skills, T07/T13 handoffs. No subagents, pushes, deployment, cloud provision or registry publication.

## Early evidence (not final completion)
Evidence task-18-evidence/. Initial ports inspected, user3000/3001 and unrelated3100 untouched. Tests isolated existing oathfront_verification_test.
- retention-red.log exit1: 4 expected missing-behavior failures,1 existing security pass. No-op retention and permissive version placeholder replaced only after RED.
- retention-green.log exit0:5 tests pass (account replay abandonment/detail/history boundaries, absolute guest purge, referenced session protection/concurrent cleanup/rate expiry, unsupported version/tutorial, security baseline).
- runtime-red.log exit1: shutdown did not call/drain close; rollout fixture initially rejected illegal immutable SQL mutation (test error, corrected).
- rollout-red.log exit1: rejected assertion on resolved Fastify thenable formatted poorly (test assertion error).
- rollout-red-corrected.log exit1: real app startup accepted unsupported registry, actual null vs VERSION_UNSUPPORTED.
- @vercel/functions3.10.1 narrow dependency approved controller; npm metadata Node>=20, published2026-10-13;3.10.2 avoided because only hours old. pnpm add exit0, deprecated transitive/known SDK peer warnings remain; final frozen-install output must be retained.

## Historical controller decision (superseded)
Initial conditional Services beta approval was superseded by the final two-project ruling below after shared environment isolation failed inspection. Installed Next uses XFF ??=remoteAddress and rewrite proxy has no xfwd append; the final authenticated forwarding design follows that concrete evidence.

## Implemented scope and decisions

- Retention CLI/service uses a fixed UTC cutoff and principal-before-match locks, rechecks eligibility after lock, purges unclaimed guests at absolute7days, closes inactive accounts through ADMIN_ABANDON/EXPIRED and atomic journal/checkpoint/result/hash persistence, retains active details/receipts, deletes terminal details30days and summaries180days. Audit tombstones retain FK-needed sessions. Runtime append-only grants remain narrow; deletion requires owner/maintenance connection. Content registries are preserved.
- Pure supported-version report plus DB inspection gates application startup/readiness for active/paused rules/content/location/bot and pinned tutorial scenario/hash/manifest versions. No rewriting match versions or core/bot hashes.
- Local direct IP mode ignores headers. Authenticated trusted-next/hosted-proxy modes validate one custom IP and constant-time proxy credential for every/api/v1 request. UI wrapper strips spoofed input and sends credential only to/api/v1, never managed auth. Hosted Next proxy stamps first-ingress Vercel IP, preserves exact body/cookies, never retries and uses fixed HTTPS upstream in production. Real cloud header trust remains unverified.
- Kept standalone Node listener/shutdown separate from recognized Vercel root Node request handler using the same buildApp factory. Hosted initializes one module app/pool, attachDatabasePool and waitUntil; function config30s bounds extension. Standalone waits for HTTP/in-flight work then pool within10s; unknown response/deadline never implies rollback.
- Controller initially conditionally approved Services beta, then rejected it after official docs showed shared env/no service secret scoping. Final two-project profile retains DB/session secret only in API, limited forwarding secret in both, managed auth cookie only Next, migration credential outside runtime. No cloud resources were created.
- Docker UI/API/DB images with three isolated containers, health checks, non-root UI/API, named volume, explicit forward migration/grants setup. Preserved all artwork masters in Git; only public exports and small imported effect metadata enter the UI runtime. Source context~26MB instead of220MB masters. Narrow deterministic API packager copies19 already resolved pg/Ajv production dependencies, keeps licenses/metadata and rejects version collisions. No new package for proxy/packaging.
- CI now initializes disposable Docker PostgreSQL, frozen install, Python/Pillow assets validation, serial unit/integration/migration/restore, tool scoped typechecks, lint, production build with3101 baked, full browser gate and bounded20load. CI only verifies, never deploys. E2E evidence-root override preserves all previous task artifacts. .superpowers/all.next outputs (including interactive)/Vercel caches excluded from lint and packaging. NO_COLOR removed from Playwright worker environment.
- Root README now starts the playable Docker guest path first, then existing interactive maintenance and separate tests. Runbooks/checklist distinguish all remaining performance/balance/human/cloud holds; docs/OATHFRONT/index updated. Parent-owned controller-decisions/milestones untouched by worker.

## Focused evidence and issues honestly retained

- runtime-green.log exit0:6 checks across rollout/shutdown/deadline. proxy-red.log expected direct-placeholder mismatch; ingress-red.log expected missing overwritten socket IP; ingress-green.log3/3.
- hosted-proxy-red.log expected missing forwarded body. hosted-proxy-green.log initially had one stale assertion expecting the old platform header after controller switched to authenticated custom header; corrected. chain-lifetime-green.log4/4 checks passed across proxy trust, real hosted HTTP cookie/CSRF/receipt and operation lifetime.
- Lifetime callback was initially implemented before its dedicated test. First removal attempt did not match formatted code and the test passed (lifetime-red.log; NOT RED). Correctly removed callback, then lifetime-red-corrected.log failed expected0vs1 registered work. Restored implementation and real blocked transaction passed registration-before503/drain/durable receipt. This is retrospective regression evidence, not falsely claimed strict test-first development.
- Retention claim audit tests passed (retention-claims.log). Self-review found session cleanup using greatest(expiry,revocation), retaining early-revoked sessions too long. revoked-session-red.log reproduces at day8 after guest→account conversion; least(first invalidation)+7days fixes it. revoked-session-green.log passed1 covering test/4 intentionally filtered. This changes maintenance only; final API image rebuilt and old image IDs retained.
- restore-drill.log initially had a fixture error treating BLOCK_RESPONSE as a phase. Corrected to real view.blockResponse; restore-drill-corrected.log2/2. Actual pg_dump/pg_restore, binary dump only in memory. Final full test logs provide exact sanitized databases/measured recovery separately.
- Docker first build failed because excluding all assets/source hid effect-families.json imported by renderer; restored only that JSON build input. Initial Compose build let Docker build independent image stages concurrently; after failure all subsequent API/UI builds ran sequentially. No shared source/build artifacts or user stack were changed by those isolated image builds.
- Docker API retry hit registry download timeout after700.9s. Scoped frozen workspace installs/cache mounts then succeeded. pnpm11 experimental legacy deploy re-resolved unrelated metadata even with frozen flags; --offline failed missing metadata. Replaced it with deterministic closure copying (controller-approved), rather than disabling supply-chain guards/upgrading dependencies. runtime-package-red initially exposed missing manifest; corrected assertion proved global fallback resolution was not isolated. runtime-package-red-corrected.log expected isolatedfalse; runtime-package-green.log1/1 passes real Node pg/Ajv import/validation from packaged tree.
- Vercel CLI65 local mode initially rejected a functions/server.ts pattern; replaced with supported entrypoint export config and verified official @vercel/static-config extracts maxDuration30. Official @vercel/fastify21 builder detects rootserver.ts before src/app factory (emits honest multiple-entrypoint warning). Delegating to awaited standalone listen deadlocked because @vercel/node26 intercepts listen before awaiting module import. Concrete source inspection led to default Node handler. Short1.5s cold probes also canceled loader startup; one bounded45s probe succeeded. vercel-local.log now records actual readiness + STATEFUL guest201/create201/retry201/sameReceipttrue/missingProof403 with no login/deploy. Prior failing configuration/interception/short-probe logs retained. EPIPE came from terminating a stuck local CLI probe, not application test success.
- hosted-next-real-chain.log exit0: actual Next dev internal rewrite→Fastify→PostgreSQL, synthetic platform-header input, cookie/CSRF, exact duplicate receipt and managed-auth local503. This verifies route mechanics, not real edge/header/provider behavior.
- load20.log exit0 on the pre-final compiled HTTP artifact:20 concurrent matches,500 actions, warm p95306.353905ms;276auto batches, auto p95306.660502ms/max346.474454ms; cold process274.734358ms.24commands/match then explicit surrender, no rate-limit bypass/production load. Final gate remeasures after final artifact build; neither run is the Task16 hardware/frame benchmark.
- Frozen install exit0 (final-install.log); pnpm peers check exit1 (sdk-peers.log) retains exact known Better Call/Better Auth/logger-TS compatibility warnings. Narrow functions3.10.1 added; no auth/dependency broad upgrade. Scoped/root typechecks pass; initial lint caught missing mjs globals and later preserve-caught-error in new packager; both fixed, final-lint-corrected.log exit0. Generated Next and tool caches remain excluded, real source remains checked.

## Docker verified artifact identities

Old pre-revoked-session API image:62dcbc71783b6c56fb740bc8651968efba3ed6b5ddc9a69483e42ddbc419e592 (not final). Final API image9c3aa51fad7de2a71b80b248a2bb2ff3a5444fee82dde57489e43cf86812381e; UI32f2902de8c428e95a69f82e2ec4e3034bef5f74ceb7711f5995754ea4d8fb2a; DB9ce98c993f976d07824f8071a410d31f65280c7210818513c90da83ff4ce8d62. Exact build/config manifests in docker-*-build.log. The final Docker packager source subsequently received only a lint error-cause annotation; packaged runtime bytes are unaffected. UI was not rebuilt for test/docs-only edits.

`docker-final-start.log` exit0: oathfront-task18 threehealthy services, new volume, onlyloopback3300 exposed. `docker-restart-smoke.log/json` exit0: realwrapper→Next→API guest201 despite spoofed inbound IP/token, local managedauth route preserved, tutorial block revision22 survived API/UI restart, resumed revision23, duplicate receipt byte-equivalent. Runtime inspection uid1000 both UI/API; UI public exports present/no PNG master directory, API19resolved dependencies/no assets. The task-owned stack remains running for inspection; user3000/3001, unrelated3100, existing oathfront-db-1 and oathfront_interactive were not stopped/reset/migrated.

## Neon exact external write

Rechecked ledger first via explicit projectround-darkness-78734677/developmentbr-odd-pine-a1pw77e9/databaseoathfront/roleoathfront_owner: only0001, hashb6085719708a7d4f8a97900a85c8bf035a109f200320721d93888278684a36d3, timestamp1792500179766. Applied one transaction: lock ledger, assert exact prior ledger, exact reviewed0002 SQL+ledger(hash01a7e2c471648be3ef56392cdd8da65f04211ecc474eea5a508bf81103376836,timestamp1792500179767), exact0003 SQL+ledger(hash1a64af158c8d8b67fcdfca89c7324af6e6324e55bfa99615086232a522ccfe05,timestamp1792524503102). No repeat0001, role create, credential rotation or new migration. Tool returned seven successful statement results. Readback matches3hashes, botguard/tutorial constraint and runtime read/update grants; no superuser/createdb/createrole/bypass/schemaCreate/eventDelete. Sanitized `neon-migrations.json`; parent independently verified. Production/default branch never queried/mutated.

## Final gate and corrected runtime boundary

Status: DONE, technical implementation ready for controller review; release remains HOLD. No unresolved implementation correctness finding remains from self-review. Known product/cloud acceptance and SDK compatibility limits are explicit, not waivers.

The one whole-workspace gate completed72files/603tests, including real migration/restore. The initial production browser run returned72passed/6failed/2skipped in8.4min. Four failures were stale test contracts: reserve/log content now requires opening disclosure, card accessible name changed in prior UI work, and /api/auth/session now correctly responds503/AUTH_UNAVAILABLE when unconfigured. Tests now assert those exact behaviors; no accepting-either-status assertions.

Both TU12 branches exposed a real pre-existing overlay defect. match.css placed selected inspect absolute top0/right0/z40 above tutorial, blocking visible enabled Đã hiểu. Trace and new failing bounding-box regression prove both at x1124/y56 (inspect311high, tutorial558high). Controller approved narrow UI fix. Applied gpt-taste within approved game design (project overrides generic AIDA/randomization), and ui-ux-pro-max targeted focus-not-obscured review. Existing sidebar now allocates160px scrollable inspect at bottom with8px gap and remaining tutorial pane. No new animation/dependency/design; long content scrolls. New responsive regression verifies non-overlap, full primary hit testing, keyboard-visible inspect cancellation and tutorial secondary controls at1440×900/1024×640. Preserve original RED screenshot/JSON and final screenshot/JSON. Only CSS runtime changed after original full gate.

Commands/observed exits (all output retained):

- `pnpm install --frozen-lockfile` exit0: final-install.log.
- `pnpm peers check` exit1: known SDK exceptions in sdk-peers.log, not a clean-peer claim.
- `pnpm typecheck` exit0: final-typecheck.log; after UI regression additions exit0 ui-fix-typecheck.log. Covers root, web, simulation, load, assets TS.
- `pnpm lint` initial .mjs errors corrected; final-lint-corrected.log exit0; final corrected run exit0 corrected-lint.log.
- `OATHFRONT_E2E_PRODUCTION=1 OATHFRONT_E2E_PORT=3200 OATHFRONT_EVIDENCE_ROOT=artifacts/task18-ui-red pnpm exec playwright test tests/e2e/responsive.spec.ts -g 'actionable tutorial'` exit1 tutorial-overlap-red.log, expected overlapping rectangles before CSS fix.
- Same focused test in Next dev without production flag, evidence root task18-ui-dev: exit0 tutorial-overlap-dev.log1/1. Then six formerly failing cases via `--grep 'no legal target|snapshot history recovers|playable trick label|exact versioned proxy|TU12 visible'` exit0 browser-covering-dev.log6/6.
- Corrected production covering run14/14, no skipped selected cases, exit0 corrected-e2e.log. This is NOT a new all-green full browser run. Covers all6 original failures plus responsive1440/1366/1280/1024sizes,375fallback, WCAG scan,200%reflow, fullGOOD USED/KEPT→EVIL→skip/replay journeys.
- Both full-run skips intentional: Firefox-only no-Navigation-API fallback and opt-in physical-GPU workload. No heavy900/400simulation or hardware benchmark rerun. Existing historical evidence remains immutable.

Exact serial gate execution metadata:

```json
{
  "initial": [
    {
      "command": "pnpm contracts:check",
      "started": "2026-10-21T00:22:17.507Z",
      "ended": "2026-10-21T00:22:18.595Z",
      "exit": 0
    },
    {
      "command": "pnpm test",
      "started": "2026-10-21T00:22:18.595Z",
      "ended": "2026-10-21T00:25:17.072Z",
      "exit": 0
    },
    {
      "command": "pnpm build",
      "started": "2026-10-21T00:25:17.871Z",
      "ended": "2026-10-21T00:25:52.293Z",
      "exit": 0
    },
    {
      "command": "pnpm test:e2e",
      "started": "2026-10-21T00:25:52.816Z",
      "ended": "2026-10-21T00:34:20.346Z",
      "exit": 1
    }
  ],
  "corrected": [
    {
      "command": "pnpm lint",
      "started": "2026-10-21T00:37:10.380Z",
      "ended": "2026-10-21T00:37:13.659Z",
      "exit": 0
    },
    {
      "command": "pnpm --filter @oathfront/web build",
      "started": "2026-10-21T00:37:14.794Z",
      "ended": "2026-10-21T00:37:41.090Z",
      "exit": 0
    },
    {
      "command": "pnpm exec playwright test --grep no legal target|snapshot history recovers|playable trick label|exact versioned proxy|TU12 visible|actionable tutorial|ten cards and ten units|375px fallback|WCAG AA scan",
      "started": "2026-10-21T00:37:41.580Z",
      "ended": "2026-10-21T00:38:43.620Z",
      "exit": 0
    },
    {
      "command": "pnpm exec tsx tools/load/pve.ts --concurrency 20",
      "started": "2026-10-21T00:38:43.620Z",
      "ended": "2026-10-21T00:38:51.148Z",
      "exit": 0
    }
  ]
}
```

The gate environment supplied API_ORIGIN=http://127.0.0.1:3101 before build, UI3200, production mode, telemetry disabled and fresh evidence roots; removed NO_COLOR and left hardware benchmark unset. Gate scripts /tmp/oathfront-final-gate.mjs and /tmp/oathfront-corrected-gate.mjs wrote each stdout and exit separately. No overlapping builds/DB resetters/Playwright suites.

Initial build5-dAU_0iQdk3hZKB98v-v: source manifestSHA6730603e2d3c2dab58bed3f4016c36fabd63013fcc5bfb3c035866423050bb12; runtime manifestSHA6b9c884f2f5b00029415c2cdb67afbd0d583fd498d4db9d560672b78a1a16ae8. Corrected buildV0isFAUtbXD_Bsuxb73A6: sourceSHA938d1e3492ab59096489c74fd19a3d0672993580ceb7564d9138e8b7b156f49c; runtimeSHA63421cabe0f9f6de38e38e6a254216be5c9b813591e3addc3a6190ea78167fcf. Both verify3101rewrite. Controller independently checked1331source hashes and2541artifact entries(2520files+21symlinks), zero mismatches/missing; proof task-18-controller-hash-check.json. Subsequent documentation additions/links and copied screenshot evidence do not change runtime; final runtime hashes remain unchanged. Task16 benchmark buildZipcVWCZHw8l3sc-rmia3 is distinct and NOT rerun.

Final local load:20concurrentmatches,500actions after24PvEcommands/match then surrender; warmp95312.070641ms,275automatic batches p95308.598313ms/max346.732118ms, coldprocess284.001625ms. Both specified load targets passed. No production/stress load, no rate bypass. Exact JSON corrected-load.log.

Final migration/restore: empty oathfront_restore_756334ff0e60429daa7ca5de628c6b16_test and prior oathfront_restore_61fb345812c64ca29a87a247053f6fbd_test both3ledger entries/equalconstraints. Source oathfront_verification_test dumped through `docker exec oathfront-db-1 pg_dump -U oathfront_migrator -Fc --no-owner --no-acl oathfront_verification_test`; binary in process memory, piped to `docker exec -i oathfront-db-1 pg_restore -U oathfront_migrator -d oathfront_restore_9d6508e723b2487ab4208811540a7fd4_test --no-owner --no-acl --exit-on-error`. Snapshot73469bytes, recovery449.036671ms, revision22BLOCK_RESPONSE restored then23resumed,0lostcommittedrevisions. Restricted grants reapplied; exact receipt and replay verified; only generated databases dropped. Not a NeonPITR/RPO SLA.

## Corrected Docker verification

After the actual CSS fix only UI rebuilt: `docker compose --env-file .env.task18-compose.local -p oathfront-task18 -f compose.yaml build ui` exit0 docker-ui-corrected-build.log. `... up -d --no-deps --wait ui` exit0 docker-ui-corrected-start.log. `node /tmp/oathfront-compose-corrected-smoke.mjs` exit0 docker-corrected-smoke.log/json, actual Node HTTP guest/spoof/auth then tutorial BLOCK_RESPONSE, `docker compose ... restart api ui`, readiness/reload/resume23/byte-identical duplicate receipt. Threehealthy services in docker-final-services.json. Final UIsha256:24fd2649662e775ce9a76eaa0519f9c251582efd28a6af05989c767237776888; APIsha256:9c3aa51fad7de2a71b80b248a2bb2ff3a5444fee82dde57489e43cf86812381e; DBsha256:9ce98c993f976d07824f8071a410d31f65280c7210818513c90da83ff4ce8d62. Earlier UI32f290... and pre-fix API62dcbc... retained as previous identities, not mislabeled final. Taskproject3300remains running, user3000/3001/interactiveDB and unrelated3100 untouched.

Install metadata (install-metadata.json): Nodev24.20.0,pnpm11.25.0,lockSHA7615d2aa7b1fb643068284edf26ad0a40c749295ff2d96030e359e4b87988c90; functions3.10.1 Node>=20 Apache2 published2026-10-13T22:38:10.877Z;3.10.2 published2026-10-20T23:06:38.150Z excluded. Exact SDKpeerstdout retained: better-call1.4.0/2.0.2 wanted1.4.2;better-auth1.7.6 wanted^1.7.11;TypeScript6.0.3 wanted^5.0.0. Vercel CLI multiple-entrypoint warning and earlier probe termination EPIPE retained; no pristine-output claim. Corrected production browser console record[] and all selected checks pass.

## Self-review and boundaries

Reviewed own runtime/CI/proxy/retention/package/docs diff; fixed first-invalidation session retention, unsupported startup gate, missing effect metadata in Docker context, actual Vercel Node adapter contract, deterministic production closure, and tutorial overlap with regression evidence. Public verification doc includes actual failed/full versus covering counts. Root README's first path starts a playable guest Docker game; existing auth installation explicitly requires forward preparation before restart. No assets regenerated, masters deleted, original content/bot versions changed, secrets committed, parent-owned docs staged, or destructive cleanup performed. `git diff --check` and staged checks passed. Runtime source did not change after corrected build.

CI workflow is configured/reproduced locally, not remotely dispatched or executed on GitHub. Hosted build detection/config extraction and actual CLI request handling verified withoutlogin; real Vercel deploy/edgeheaders/envscope/quotas/OAuth/post-response lifetime remain awaitingexternalvalidation. APIwaitUntil is bounded, not durablequeue; CSP permits inline script/style and is notnoncehardening. Restrictedroleholds; ownercredentials outsideAPI/UIruntime. Stable two-project costs extraHTTP/functionhop, configuration and sharedlimitedproxycredential; Docker wrapper costs extraHTTPprocess/lifecycle; packager rejects unsupportedfuturedependency shapes. Rollbackneedscompatibleforwardexpansion, notdownmigration.

Release holds remain PERF-P95-01FAILED/OPEN21.4/21.7/22.5ms; BALANCE-CORE-01/UTILITY-01/PHASE-01OPEN withGOOD80%baseline;5people×2matches andphysicaltouch/Safari/AT/audio acceptance pending. BasicGooglelogin alreadyuserconfirmed; no redundantliveOAuthrun. DevelopmentNeonmigratedonlyreviewed0002/0003,productiondefaultneverqueried/mutated;interactiveDBexplicitoperatorstepstillpending. No production-ready/balanced/free-unlimited claim. Task18/wholebranch independent review follow this report.

## Commits

```
94d4b1b ci: verify isolated release flows and document acceptance holds
1784a43 fix(web): keep tutorial actions clear of card inspection
340b99f feat(ops): package trusted Docker and two-project Vercel profiles
e640567 feat(api): add replay-safe maintenance and bounded operation lifetime

```

## Files changed

- `.dockerignore`
- `.env.example`
- `.env.test.example`
- `.github/workflows/ci.yml`
- `.gitignore`
- `README.md`
- `apps/api/package.json`
- `apps/api/server.ts`
- `apps/api/src/app.ts`
- `apps/api/src/client-ip.ts`
- `apps/api/src/deadline.ts`
- `apps/api/src/maintenance/cli.ts`
- `apps/api/src/maintenance/retention.ts`
- `apps/api/src/maintenance/versions.ts`
- `apps/api/src/server.ts`
- `apps/api/src/shutdown.ts`
- `apps/api/tests/browser-server.mjs`
- `apps/api/tests/hosted-chain.test.ts`
- `apps/api/tests/hosted-next.test.ts`
- `apps/api/tests/lifetime.test.ts`
- `apps/api/tests/proxy-ip.test.ts`
- `apps/api/tests/release-safety.test.ts`
- `apps/api/tests/restore-drill.test.ts`
- `apps/api/tests/retention.test.ts`
- `apps/api/tests/runtime-package.test.mjs`
- `apps/api/tests/shutdown.test.ts`
- `apps/api/tests/ui-ingress.test.mjs`
- `apps/api/vercel.json`
- `apps/web/next.config.ts`
- `apps/web/src/app/api/forward-v1/[...path]/route.ts`
- `apps/web/src/server/api-proxy.ts`
- `apps/web/src/styles/match.css`
- `apps/web/tests/hosted-proxy.test.ts`
- `apps/web/vercel.json`
- `compose.db.yaml`
- `compose.yaml`
- `docker/api/Dockerfile`
- `docker/ui/Dockerfile`
- `docs/OATHFRONT.md`
- `docs/README.md`
- `docs/implementation/evidence/task18/tutorial-inspect-1024.json`
- `docs/implementation/evidence/task18/tutorial-inspect-1024.png`
- `docs/implementation/evidence/task18/tutorial-inspect-1440.json`
- `docs/implementation/evidence/task18/tutorial-inspect-1440.png`
- `docs/implementation/evidence/task18/tutorial-inspect-console.json`
- `docs/implementation/release-checklist.md`
- `docs/implementation/release-runbook.md`
- `docs/implementation/release-verification.md`
- `docs/implementation/restore-drill.md`
- `eslint.config.mjs`
- `package.json`
- `playwright.config.ts`
- `pnpm-lock.yaml`
- `scripts/build-api.mjs`
- `scripts/create-compose-env.mjs`
- `scripts/create-test-env.mjs`
- `scripts/package-api-runtime.mjs`
- `scripts/prepare-compose.mjs`
- `scripts/ui-server.mjs`
- `tests/e2e/accessibility.spec.ts`
- `tests/e2e/asset-fallback.spec.ts`
- `tests/e2e/auth-claim.spec.ts`
- `tests/e2e/block-recovery.spec.ts`
- `tests/e2e/deck-builder.spec.ts`
- `tests/e2e/evidence-path.ts`
- `tests/e2e/input-parity.spec.ts`
- `tests/e2e/match-foundation.spec.ts`
- `tests/e2e/motion.spec.ts`
- `tests/e2e/quality-fixtures.ts`
- `tests/e2e/recovery-fixtures.ts`
- `tests/e2e/responsive.spec.ts`
- `tests/e2e/test-origin.ts`
- `tests/e2e/tutorial-settings.spec.ts`
- `tools/assets/tsconfig.json`
- `tools/load/pve.ts`
- `tools/load/tsconfig.json`

## Evidence preservation caveat

`neon-migrations.json` contains sanitized post-write readback, not the original mutation response bytes. The seven successful statement results were observed in the MCP response and recorded in this report, but the original lock/assert wrapper formatting was not saved separately. Reviewed migration SQL files/hash identities and independent controller readback are retained. Do not describe this file as raw transaction-response capture. No repeat external mutation/query was performed to manufacture missing evidence.

Final post-commit byte audit found0runtime artifact mismatches; only controller-decisions.md and milestones.md remain unstaged and are parent-owned. No push performed.
