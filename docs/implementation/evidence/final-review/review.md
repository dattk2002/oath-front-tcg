# OathFront final whole-branch review

Reviewed 2026-10-21. **Technical integration: approved with minor follow-ups. Findings: 0 Critical, 0 Important, 3 Minor. Product/release acceptance: HOLD.** No new blocking cross-task defect was found. This verdict permits the controller to finish the authorized technical handoff; it does not approve deployment, declare M5 accepted, or waive an acceptance threshold.

## Scope and method

- Base: `6d19b11e7390e0a683a414af78a5fd30122b1668`, before all implementation. Head: `e0f9f31474440a8979f25a1f5a605dc43fe58c69`. HEAD and clean tracked status were checked during review. The mid-Task10 pushed checkpoint was not used as the review base.
- Consumed the supplied `review-6d19b11..e0f9f31.diff`: 15,213,119 bytes, 1,366 file entries, including 556 binary entries. Reviewed it in passes: inventory/provenance, persistence and authentication, engine/public/bot boundaries, runtime distribution, and browser state/presentation. Large generated simulation, manifest, and evidence files were parsed structurally rather than dumped. The inventory includes 466 documentation/evidence files and 410 web files, many of which are generated assets; it is not 1,366 separately hand-audited source files.
- Read the reviewer instructions, final handoff, project instructions, `docs/OATHFRONT.md`, plan Global Constraints/Review Focus, global execution amendments, milestones, controller decisions, deferred-item ledger, Task18 review, release verification/checklist and relevant tests/evidence. This is the broad integration review following 18 scoped reviews and their closures, not a repeated line-by-line engine implementation audit.
- Used code-review guidance, targeted `ui-ux-pro-max` review guidance and evidence-before-claims discipline. The UX query `reduced motion animation` returned the applicable reduced-motion preference guidance. Existing game design and semantic controls remain the reference; no redesign is proposed.
- Read-only review: no source, index, HEAD, branch, server, database, Docker or cloud mutation; no helpers/subagents. The only written file is this report. No full suite, build, browser run, load run, simulation matrix or hardware benchmark was repeated. Historical passing results below are explicitly retained evidence, not new test executions.

## Strengths and integration conclusions

1. **The transaction boundary is coherent across gameplay, identity and maintenance.** `apps/api/src/matches/repository.ts:44` centralizes sorted principal locking before match/checkpoint locking. HTTP mutations revalidate the session under that lock in `apps/api/src/matches/service.ts`; `apps/api/src/auth/claim.ts:35` acquires the subject advisory lock before sorted principals, then locks active matches. Claims transfer receipts with ownership, reject receipt-key collisions before changing either owner, and append the same administrative abandonment journal contract used by retention. `apps/api/src/maintenance/retention.ts:42` rechecks each owner after locking and uses normal replay-validated persistence for EXPIRED. The reviewed code does not introduce a principal/match lock inversion. The real concurrent-claim and retention tests cover the meaningful interactions, not only isolated mocks.

2. **Unknown results remain recoverable without optimistic gameplay.** `apps/api/src/deadline.ts:19` registers accepted work before a response can time out; `apps/api/src/matches/routes.ts` puts authorization and mutation inside that lifetime. `apps/api/src/matches/service.ts` checks an exact request-hash receipt before stale-revision rejection. `apps/api/src/matches/repository.ts:209` commits checkpoint, journal, events, terminal result and receipt in one transaction, and only permits a receipt-free transition for the closed administrative operation. `apps/api/server.ts:35` supplies bounded `waitUntil`, while standalone shutdown drains before ending the pool. `apps/api/tests/lifetime.test.ts:10` actually blocks a database transaction across 503/shutdown and checks one durable receipt. The browser's `intent-controller.ts` retains the exact uncertain envelope; `view-store.ts` prevents a late receipt from rolling back a newer revision. Bounded function lifetime remains an acknowledged hosted limitation, not a durable-queue promise.

3. **Version binding protects retained state and replay.** `apps/api/src/matches/initialization.ts:26` verifies the immutable catalog manifest/hash; initialization retains seed, RNG algorithm and exact deck snapshots. `repository.ts:78` verifies tutorial binding and checkpoint/row identity, `matches/replay.ts` regenerates initialization and verifies the complete journal/events, and `maintenance/versions.ts:30` includes scenario/hash/manifest version alongside rules/content/location/bot. Startup/readiness reject unsupported active bindings. The current supported set is v1; adding v2 requires retaining and dispatching supported v1 implementations, as the runbook already states. There is no claim that arbitrary future versions work now.

4. **Public information is kept separate from authoritative state.** `packages/game-engine/src/projection.ts` constructs an explicit validated view, hides opponent hand/power identifiers and unrevealed assignments, and schema-filters public events. `apps/api/src/matches/events.ts` advances the bounded persisted-row cursor even through hidden rows. `packages/game-engine/src/preview.ts` takes only public view/action data and labels unknown outcomes; `packages/bot/src/evaluate.ts` uses that same boundary. `apps/web/src/features/match/rendering/asset-manifest.ts` chooses the complete public pool from catalog/quality only, with no hidden assignment input. The projection/fairness/preview dependency-graph tests and previously reviewed browser-wire generation provide complementary checks. No private engine state was found crossing these inspected interfaces.

5. **The runtime profiles preserve their intended trust and credential boundaries.** `apps/web/next.config.ts:22` isolates `/api/v1/*` from local `/api/auth/*`. The hosted forwarding handler validates a fixed HTTPS upstream, replaces incoming proof, sends the request once with manual redirects, preserves multiple Set-Cookie values and forces no-store. `scripts/ui-server.mjs:8` strips competing forwarding headers and stamps the actual socket address for the standalone chain. `apps/api/src/client-ip.ts:13` ignores forwarded input in direct mode and checks the distinct forwarding secret before accepting one IP in trusted modes. `apps/api/src/auth/csrf.ts` requires exact Origin and token, and session cookies are Secure/HttpOnly/SameSite=Lax. API credentials stay in the API profile; owner/migration credentials are outside hosted runtimes. Local chain tests establish these mechanics; actual first-ingress replacement is explicitly still a hosted gate.

6. **Packaging and recovery are demonstrated with real processes and data.** `scripts/build-api.mjs` and `scripts/package-api-runtime.mjs` agree on the pg/Ajv external runtime closure; the packager preserves package metadata and fails on unsupported duplicate-version flattening. Separate non-root API/UI runtime stages and the persistent PostgreSQL service match the required three-image topology. The retained Docker restart result preserves BLOCK_RESPONSE revision22, resumes23 and returns an equal duplicate receipt. The restore drill invokes real pg_dump/pg_restore and verifies restored replay; it does not substitute a row copy or mock database. The Next build-time API target and protected interactive database/ports are explicitly documented.

7. **Browser input, recovery and presentation have separate responsibilities.** `use-match.ts` owns refresh/pending recovery and the advance pump; `intent-controller.ts` resolves semantic actions against current legal actions; `motion/presentation-controller.ts` owns scoped GSAP playback and fast-forward; `BattleScene.tsx` owns preference/listener/renderer teardown and semantic fallback. Reconnect clears stale selection and advances presentation to the authoritative snapshot. The pause dialog exposes recovery inside the modal and ignores nested-dialog cancel events. The inspected code respects reduced motion and hidden/offline/small-viewport pauses. Task18's tutorial/inspector correction has retained non-overlap and hit-testing evidence on the corrected artifact. The atlas frame identifiers were structurally compared against placeholder identifiers: there is no overlap, so the suspected map-overwrite texture-loss path is not present in the current assets.

## Complete finding list

### Critical

None found.

### Important

None found.

### Minor

**M1 — Omitted load-tool concurrency does not use its advertised fallback.**

- **Location:** `tools/load/pve.ts:13`–15.
- **Problem:** When `--concurrency` is absent, `indexOf` returns -1 and the code reads `argv[0]`; converting the Node executable path produces NaN, so the guard rejects the invocation instead of defaulting to20.
- **Impact:** A maintenance-tool invocation that appears supported fails. The explicitly documented/CI `--concurrency 20` path and retained load measurements remain valid; this does not affect gameplay or production traffic.
- **Evidence:** A fresh side-effect-free Node expression check produced absent→NaN and explicit20→20. No load process was launched.
- **Recommendation:** Resolve the option index first, then apply the default only when absent; validate a missing explicit value. A tiny parser check is sufficient—do not rerun the20-match workload for this fix. This is an inexpensive final follow-up, not a technical integration blocker.

**M2 — Managed-auth dependency peers remain incompatible with declared ranges.**

- **Location:** `docs/implementation/release-verification.md:32`; exact retained output `docs/implementation/evidence/task18/logs/sdk-peers.log:1`.
- **Problem:** The pinned official SDK brings better-call1.4.0/2.0.2 versus1.4.2 requirements, better-auth1.7.6 versus^1.7.11, and the logger's TypeScript^5 range versus workspace6.0.3. The peer checker exits1 even though frozen installation succeeds.
- **Impact:** Compatibility debt and a non-clean peer gate remain. Existing functional/auth evidence, including the user's basic Google login confirmation, does not prove every provider/plugin path compatible.
- **Recommendation:** Preserve the explicit scoped exception and address it in an authorized SDK compatibility update with relevant auth coverage. Do not force a broad dependency upgrade in this final review. This remains a disclosed Minor, not an observed authentication failure or reason to repeat basic Google login acceptance.

**M3 — Vercel local detection still sees two possible API entrypoints.**

- **Location:** `apps/api/server.ts:1`, `apps/api/src/app.ts:46`; warning evidence `docs/implementation/evidence/task18/logs/vercel-local.log:12`–16.
- **Problem:** The builder reports `server.ts, src/app.ts` and chooses `server.ts`; the shared factory filename is also detected.
- **Impact:** No current runtime failure was demonstrated: the retained actual requests exercise the selected handler successfully. The ambiguity adds warning noise and makes builder/layout changes more fragile.
- **Recommendation:** Keep the selected-handler regression and warning visible. Resolve via a supported entrypoint/layout configuration when practical; do not rename the shared factory or change hosting topology solely to silence output without covering selection. This is nonblocking tooling debt.

These are the three carried Task18 minors, triaged independently. No additional issue is hidden in the recommendations or the declined-to-judge list.

## Earlier deferred findings

The progress ledger and published milestone/re-review chain account for earlier deferred items: malformed catalog classes, zero-card mulligan invariance, queued combat-source invalidation, FAULTED invariant, scheduler guard reset, storage/recovery/trick targeting, hover tween retention, exact rematch/deck source, claim/history/provider logout, nested Escape and historic compatibility, compact art fallback, spacing/status/error collectors, and diagnostic provenance/guards. Current relevant code/tests were spot-checked at those interfaces; they are not reopened merely because the whole diff includes their original code. Task18 owns and closes the runner color warning and final typecheck/retention/packaging integration. The SDK exception remains M2 above. The upstream OFL whitespace is intentionally preserved licensing text, not a source-quality defect.

## Verification evidence and its limits

Fresh read-only checks in this review:

- Parsed the supplied diff inventory and large900/400 simulation artifacts. Those artifacts contain900 baseline and400 stress records with recorded faultCount0 and explicit v1/RNG/source identities; this was structural inspection, not resimulation or a balance approval.
- Hashed **all88 published Task18 evidence files** against `evidence-sha256.json`: **0 mismatches/missing**.
- Compared **627 implementation files** under apps/packages/scripts/tools from the retained corrected-source manifest against current checkout bytes: **0 mismatches/missing**. Documentation-only publication after the runtime gate is therefore not silently being treated as a new runtime test.
- Confirmed the current atlas identifiers do not overwrite placeholder keys; reproduced M1 with an isolated expression; inspected HEAD/status. No additional runtime test was necessary to resolve the inspected doubts.

Retained exact evidence consumed:

- `docs/implementation/evidence/task18/logs/final-gate.json` and `final-test.log:6`–10: contracts/test/build exit0, **72 files/603 tests passed**, real migration and restore metrics. The restore record reports **73,469 bytes**, **449.036671ms**, **0 lost committed revisions**, BLOCK_RESPONSE22→23, explicitly a quiescent local logical snapshot rather than Neon PITR/RPO assurance. Restore commands and procedure remain in `docs/implementation/restore-drill.md` and the retained implementation report.
- `final-e2e.log`: initial **72 passed/6 failed/2 skipped**. `corrected-gate.json` and `corrected-e2e.log`: corrected production **14/14**, covering all six failures and affected responsive/accessibility cases. There is **no fresh full-green browser run** on that corrected artifact; this review does not relabel it.
- `corrected-load.log`: **20 matches,500 actions**, warm HTTP p95 **312.07ms**,275 automatic batches p95 **308.60ms**, max346.73ms, cold284.00ms. This is API/load evidence, not frame-time acceptance.
- `docker-corrected-smoke.json`: final UI `24fd2649…`, API `9c3aa51f…`, DB `9ce98c99…`, three services and exact restart/receipt result. Earlier UI image evidence is separately identified.
- `controller-hash-check.json`: corrected build **V0isFAUtbXD_Bsuxb73A6**, previously audited1,331 source/2,541 artifact entries including21 symlinks with no mismatches. I consumed that retained full artifact audit; I did not recreate all2,541 artifact checks.
- `neon-controller-readback.json`: independent resulting development migration-ledger verification of all three hashes. The original migration response bytes were not retained; resulting-state evidence does not reconstruct the original statement sequence. No database query or migration was repeated.

The retained restore was executed inside the full `pnpm test` gate. Its actual process commands are `docker exec <test-container> pg_dump -U <test-owner> -Fc --no-owner --no-acl <verification-database>` and `docker exec -i <test-container> pg_restore -U <test-owner> -d <fresh-restore-database> --no-owner --no-acl --exit-on-error`; target substitutions are fixture-derived, with dump bytes passed only in memory. A future focused reproduction is documented as `pnpm --filter @oathfront/api exec vitest run tests/restore-drill.test.ts`; it was not launched by this review.

## Declined to judge / boundaries requiring controller disposition

Each behavior considered and set aside from this technical verdict is listed explicitly:

- **Whether the game is balanced or enjoyable:** not adjudicable from technical integration; the immutable900-game baseline is GOOD80%, and BALANCE-CORE-01/UTILITY-01/PHASE-01 remain OPEN. No unversioned formula/card change or threshold waiver is authorized by this review.
- **Whether bot_v2 would remedy the utility/phase issues:** no bot_v2 is implemented or validated; it requires separately versioned design/evaluation while retaining v1 support.
- **Whether current artifacts meet physical frame p95≤20ms:** Task16 measured21.4/21.7/22.5ms on a distinct artifact. PERF-P95-01 remains FAILED/OPEN; later CSS/ARIA and release builds were not hardware-benchmarked.
- **Whether five people complete and accept two games each:** the human playtest requirement awaits external participants; automated games cannot stand in for it.
- **Physical touch, manual assistive technology, real-device zoom, Safari/Edge, and subjective audio acceptance:** retained automation is useful but does not establish those device/human experiences; the existing external gates remain open.
- **Real hosted first-ingress header replacement, project environment isolation, quotas, deployment routing and post-response lifetime:** local equivalent-chain tests establish mechanics only. No production deployment was authorized or performed; these must be checked on the actual authorized target.
- **Production OAuth/origins and real-provider merge/logout/device round trips:** basic development Google login is already user-confirmed and is not requested again; these additional production/provider variants remain separate acceptance items.
- **Cloud recovery SLA/PITR, production migration and hosted maintenance scheduling:** the real local restore drill is not a cloud SLA. Production was untouched, and operational target checks belong to an explicitly authorized rollout.
- **Applying0003 to the user's existing interactive database:** pending operator maintenance, outside a read-only review; the prepared forward-migration procedure must be used before the next interactive restart without resetting data.
- **Claiming a newly rerun full-green browser suite:** no such result exists for the corrected build. The14 covering cases are accepted as scoped correction evidence, with the original full-run failures retained transparently.
- **Reconstructing missing original Neon mutation-response bytes:** impossible from resulting-state readback; the limitation is documented, and no fabricated transcript or replayed external write is appropriate.
- **Future arbitrary-version compatibility or a comprehensive adversarial security certification:** current v1 bindings and the concrete named trust/private-state boundaries were reviewed. There is no implemented future registry or exhaustive penetration-test evidence to certify beyond that scope.
- **Rejudging every authored raster image or rerunning earlier settled engine acceptance:** the prior scoped reviews and exact evidence are the applicable basis; this pass inspected integration/asset-selection boundaries and did not create a new subjective art or full-rule audit.

## Assessment

**Ready for technical branch handoff: Yes, with the three nonblocking Minor items recorded.** The implementation's central contracts align: authoritative engine/public projection, deterministic journal and receipts, principal-first ownership changes, explicit version binding, same-origin forwarding, recoverable browser state, and separately owned presentation/runtime lifecycle. A narrow M1 parser fix is worthwhile; M2/M3 are documented compatibility/tooling debt with no observed blocking failure.

**Ready for unqualified product acceptance or production release: No.** Performance, balance, human/device/provider/cloud gates remain explicitly held. The final authorized native push is a separate controller action after fresh local/remote inspection; this reviewer did not push, create a PR, publish images, or deploy.
