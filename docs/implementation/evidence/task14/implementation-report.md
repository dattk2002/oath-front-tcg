# Task 14 — tutorial, settings, audio, M4 integration

Base: `f2dbfac73f6698725781f9ab55649964cad348b8`. Implementation/review evidence directory: `.superpowers/sdd/2026-10-20-oathfront-implementation/task-14-evidence/`. Status: DONE — implementation and bounded M4 follow-up verified; ready for controller review. Commits and exact gate outcomes below.

## Implemented

- Trusted, server-only typed tutorial registry transcribed from `docs/contracts/tutorial-v1.scenarios.json`, excluded from the public content export. A separate package export is consumed only by engine/API. Normal public create schemas still reject seed/board/script overrides.
- Engine tutorial state/allowlists/predicates implement A–E and G01–G08/E01–E02 using ordinary unit/trick/block/combat/location rules. Exact USED/KEPT signature branches, energy preservation, scripted GOOD GC01 lane5, fixed deck/power order, revealed terrain, and chapter restart behavior are covered. No damage, mana, invulnerability or skirmish overrides were added.
- Initial/next/restarted scenes are explicit `AUTO TUTORIAL_LOAD_SCENE` operations with scenario, manifest version, scene and ordinal. Scene loads preserve global identity/event/root counters, allocate new opaque instances, and emit a labeled TutorialAdvanced snapshot event instead of fictitious card-play events. Bot intents use the fixed script through the same legal action path and journal.
- Private tutorial checkpoint fields are conditional. SKIRMISH checkpoints get no new default fields during creation/decode/hash. Pre-T14-shaped checkpoint round-trip is checked without rewriting initialization or hashes. JSONB property ordering is handled using canonical comparison, including tutorial change detection/scripted actions.
- API tutorial creation uses the existing principal lock/active-match uniqueness/receipt model. Progress, scene changes and completion are transactional and independent of presentation. Both completion timestamps use COALESCE; skips mark neither completion. History remains SKIRMISH-only. Main and EVIL terminal outcomes retain NONE/TUTORIAL_COMPLETED, rematch=null and retained summary data.
- Controller-approved forward migration `0003_tutorial_result.sql` permits NONE only with TUTORIAL_COMPLETED reason. Persistence emits NONE only for a completed tutorial with that reason; existing ABANDONED/FAULTED/skip mapping remains. Earlier migrations and immutable core_v1 catalog/checksum are unchanged. Migration applied only through the isolated test fixture, never interactive DB or Neon.
- Controller-approved version pinning uses existing scenario_id/tutorial_manifest_sha256 plus private manifestVersion and an immutable versioned server registry. Creation/read/replay fail closed when bindings are missing/mismatched. Old registry versions must be retained for supported matches; docs/DATA.md records that release obligation.
- T8 minor closed: retained engineScheduler now resets a nonzero bot-intent guard on actual global turn change. Targeted turn5→6 with7 regression verifies0 and replay agreement.
- Home tutorial entry, nonmodal guidance, card/lane/energy highlights, chapter restart/skip, result replay/EVIL CTAs, settings entry from Home/match/pause, and native modal focus restoration. Pending create IDs use the App-owned principal storage context and stable ApiClient. Uncertain cross-faction creation first explains the retained faction, then requires explicit retry of the identical body.
- Versioned device settings persist separate music/SFX volumes, mute and reduced motion. Both VFX controls use the same setting; OS reduction remains the baseline. Real Web Audio graph is created/unlocked only after trusted pointer/keyboard gesture, has separate gain buses, stops/suspends for pause/hidden, resumes after prior unlock and disposes on unmount. Playback error fallback keeps gameplay usable. Presentation events map to18 SFX families and menu/battle accompaniment.
- Audio uses temporary procedural audition tones, explicitly labeled in UI/source. This is real playback/gesture/settings behavior, **not final authored sound assets**. Task15 owns authored assets/manifests/licensing and replacement of this temporary palette.

## Meaningful RED and investigation evidence

1. `pnpm --filter @oathfront/game-engine exec vitest run tests/tutorial-scenarios.test.ts`: initial2 tests failed, scene A expected GOOD_PLAY but got MULLIGAN; out-of-step pass expected TUTORIAL_STEP_MISMATCH but got WRONG_PHASE. After deterministic scene/progress integration, those tests passed, then exact later scenarios/branches were added and all10 passed.
2. API tutorial creation initially returned409 VERSION_UNSUPPORTED for the approved CreateMatchRequest; implemented server registry creation/persistence. The first draft test mistakenly added expectedContentVersion to tutorial create and returned400; corrected to the documented request before the meaningful RED.
3. `apps/api/tests/advance.test.ts`: new engineScheduler TURN_START case failed expected0/received7, then passed with replay agreement after the counter reset.
4. `pnpm --filter @oathfront/web exec vitest run tests/audio.test.ts`: expected initial failure because the audio module did not yet exist (collection failure, not a behavioral RED). After implementation3 behavioral cases passed: gesture gate and independent buses/mute/disposal; pause/hidden/error fallback; versioned bounded settings/family resolution.
5. `pnpm exec playwright test tests/e2e/tutorial-settings.spec.ts`: initial Home CTA RED failed within10s because Học cách chơi was absent. Same case passed after UI integration on isolated3200/3101.
6. Real API/PG traversal exposed existing match_results result_enums rejection at G08 completion. Controller approved the narrow forward migration above. Full persisted replay then caught POST_HASH at step5 caused by order-sensitive JSON.stringify comparisons after JSONB round-trip; canonical comparison fixed the root cause. Latest focused engine/API/scheduler command: **23 tests across3 files passed**.
7. Visual review found deck.css global `.card-cost` absolute positioning battle hand costs at the battle root. Both base/responsive selectors now read `.collection-card .card-cost`, preserving collection styling and restoring hand mana text. Existing tutorial visual case checks that the visible cost2 bounding box lies inside its Kỵ Sĩ Lá button. G02 energy/card highlight screenshot inspected after this fix.
8. Static preparation found a new optional boolean prop needed an explicit boolean conversion, and ESLint initially scanned generated `.next-e2e` artifacts. Both corrected; final typecheck and lint pass. An early attempt to use nonexistent packages/game-engine/tsconfig.json was replaced with the repository root TypeScript check. No failure is represented as passing evidence.

## UI/spec self-review before final production build

Used gpt-taste under the approved SCREENS game design (no generic marketing/randomized redesign), mandatory ui-ux-pro-max review with `focus not obscured --domain ux`, its accessibility/interaction/performance checklist, and React component review. Read TUTORIAL, RULES R19, SCREENS, UI-MOTION and AC35 before declaring source settled.

Verified native labeled44px controls, panel semantics, keyboard card/lane targeting and inspect, block reload and explicit choice, pause/settings access, reduced motion, mobile fallback, responsive settings and no horizontal overflow. Found/fixed hidden in-match settings, divergent VFX preference and the hand-cost selector collision. Tutorial/settings use existing Noto Sans/dark tokens; GSAP panel motion is scoped/cleaned and reduced motion is immediate.

Development evidence: full visible USED→G08→EVIL→restart→skip passed; real Chromium WebAudio graph test passed with0 contexts/starts before gesture, running context after gesture, independent0/.6 volumes, mute, reload restoration, event-driven SFX, actual paused context and resumed running context. Two contexts after navigation show old context closed/new context running; no page errors. Settings desktop1440×900/tablet1024×768/mobile375×812 and actionable tutorial/energy/block screenshots are retained. Initial turn0/loading screenshot was explicitly rejected and replaced after hand and renderer readiness. Known battle fold-height work remainsTask16; this task does not claim a new compact battle layout.

## Verification isolation and downstream interfaces

- User3000/3001 and `oathfront_interactive` reserved and untouched; no stop/reset/reseed/logout. Existing unrelated HuntingAlice process occupied3100, verified by cwd/process before starting anything; left untouched.
- Controller-approved durable test interface: `tests/e2e/test-origin.ts` exports `testPort = Number(OATHFRONT_E2E_PORT ?? 3200)` and `testOrigin`. Playwright uses that origin/port; browser API fixture receives `OATHFRONT_E2E_ORIGIN`. Existing Origin/CSRF/auth callback helpers use the shared value. API remains loopback3101; disposable DB remains `oathfront_verification_test`.
- Dev Playwright sets `OATHFRONT_TEST_DEV=1`, selecting `apps/web/.next-e2e`; production uses `OATHFRONT_E2E_PRODUCTION=1`, selecting normal `.next`. Test dev isolation does not alter production distDir. `.gitignore` and ESLint ignore only the added generated test directory.
- Production artifact must be built with **API_ORIGIN=http://127.0.0.1:3101 before build**. Runtime Playwright env cannot repair an incorrectly baked rewrite. Normal interactive/production launchers retain their independently selected origins.
- Do not repeat real Google callback proof: controller already recorded user-confirmed real Google→app claim. Automated signed-fixture identity tests are separate and not relabeled as real OAuth.
- Runtime secrets, cookies, tokens and raw OAuth URLs are excluded from selected evidence. Ignored Playwright traces are not deliverables.

## Final gate results

### Acceptance mapping

| Acceptance | Evidence |
|---|---|
| TU01 | Engine sceneA: mana0, GC01 lane2, hand3; browser mouse/keyboard placement |
| TU02 | Engine lane2 both dead, EVIL19/charge2 at TURN_END; visible G03 continuation |
| TU03 | Engine immediate trick death/mana0, same phase, lane2 pair leaves1/1 HP; browser G04/G05 |
| TU04 | Engine Forest reveal, old EC02 stays2/3, new B01 gets1/2+shield/mana2; browser G06 |
| TU05 | Engine block HP10/charge0/used1 and signature received once; API receipt/replay; browser block reload |
| TU06 | Engine/API/browser USED versus KEPT exact HP/stats/shield/reserve branches |
| TU07 | Engine/API/browser turn5 GOOD_PLAY, Spring revealed, EVIL18, kept signature remains |
| TU08 | Engine/API/browser E01→E02 preserves2 mana, GC01 lane5 dies to trick at mana0 |
| TU09 | Engine end combat GOOD18, GC02 lane2 HP1, EVIL EC01 dead; visible completion |
| TU10 | API reload and same-body receipt retry after every command in both scenarios/branches; full immutable-initialization replay; browser reload at block; engine stale CONTINUE rejection |
| TU11 | Engine restart preserves prior chapters and monotonic counters/new identities, skip NONE; API restart/replay fresh scene ordinal2 and skip leaves flags null; API rejects skirmish seed/board extras; browser restart/skip/replay |
| TU12 | API independent main/EVIL flags; browser keyboard USED/reduced and pointer KEPT/normal paths; DOM controls and smaller-screen fallback |
| Registry/compatibility | API unknown version/hash/scenario mismatch rejection; conditional private manifestVersion; legacy SKIRMISH encode/decode equality and unchanged hash |
| AC35 audio/settings | Audio unit3 cases, real Chromium AudioContext graph/gesture/SFX/pause/reload case, separate music0/SFX.6, mute and shared reduced-motion setting |
| T8 carried minor | `engineScheduler resets nonzero guard on actual TURN_START and agrees with replay` |

Full workspace gate: `pnpm test` ran once, including fresh compiled API. Result **565 passed / 1 failed, 56 passed files / 1 failed file,179.44s**. The only failure was the retired T07 expectation `fails closed for corrupted durable receipt and defers tutorial scenario setup to its registry`, expecting tutorial409 but receiving the now-correct201. Controller approved removal of only that retired subassertion and renaming the case; receipt-corruption500/no-leak checks remain. Runtime source/artifact unchanged by this test-only correction. Focused final command results follow below; the full run is not mislabeled as all-green.


### Exact commands and final-source evidence

All commands ran from `/home/bia/Works/Coding/oath-front-tcg`. Logs live in `task-14-evidence/` beside this report. Exit0 unless the failure is explicitly recorded.

| Command | Result / evidence |
|---|---|
| `pnpm test` | Once:565 passed/1 obsolete assertion failed,56 passed files/1 failed; `workspace-test.log` |
| `pnpm exec vitest run apps/api/tests/commands.test.ts` |6/6 passed,4.53s; `commands-final.log`, after test-only retirement above |
| `pnpm typecheck` | PASS before gate and after bounded UI follow-up; `typecheck.log`, `typecheck-followup.log` |
| `pnpm lint` | PASS before gate and after bounded UI follow-up; `lint.log`, `lint-followup.log` |
| `pnpm contracts:check` then `pnpm exec tsc -p tsconfig.build.json` then `API_ORIGIN=http://127.0.0.1:3101 OATHFRONT_TEST_DEV=0 OATHFRONT_INTERACTIVE=0 pnpm --filter @oathfront/web build` | First production build PASS; `production-build.log`; API compiled by the full workspace command |
| `OATHFRONT_E2E_PRODUCTION=1 pnpm exec playwright test tests/e2e/tutorial-settings.spec.ts tests/e2e/match-foundation.spec.ts tests/e2e/full-match.spec.ts tests/e2e/auth-claim.spec.ts tests/e2e/deck-builder.spec.ts -g 'new player|TU12|real Web Audio|settled tutorial|uncertain tutorial|guest preset|complete GOOD match|complete EVIL match|signed fixture identity|expired paused session|offline draft survives'` |12 passed/1 failed,2.1m; `m4-production-browser.log` |
| `API_ORIGIN=http://127.0.0.1:3101 OATHFRONT_TEST_DEV=0 OATHFRONT_INTERACTIVE=0 pnpm --filter @oathfront/web build` | One necessary follow-up web build PASS; `production-build-followup.log`; no API rebuild |
| `OATHFRONT_E2E_PRODUCTION=1 pnpm exec playwright test tests/e2e/tutorial-settings.spec.ts tests/e2e/deck-builder.spec.ts -g 'real Web Audio|offline draft survives|same route save edit reload|offline committed save reload'` |4/4 passed,10.2s; `m4-production-followup.log` |
| `git diff --check` and staged `git diff --cached --check` | PASS before commits |

First production browser artifact passed the complete GOOD and EVIL result→reload→history→expiry→rematch loops; both hero/preset→mulligan→play loops; signed identity claim/draft recovery and expired-session modal login/identical command resume; both exact tutorial signature branches through main completion→EVIL→restart/skip/replay; settings/audio; actionable responsive tutorial layout; uncertain-create identity recovery.

The sole browser failure was a **pre-existing saved-draft status defect**, found in the required M4 loop. DeckBuilder restored the exact committed base and clean draft after successful retry/navigation, but always displayed “chưa lưu trên máy chủ.” Disabled Play for29 cards and server state confirmed this was status-only. Controller approved a narrow fix: compare the restored DeckInput with the committed base using the existing baseline convention, and display “Đã lưu” only when equal and pending=null. Revision, base, pending receipt and dirty semantics are unchanged. Covering browser cases now pass saved retry/reload→saved-source match, unsaved edit/reload with the unsaved message, and uncertain committed-save original receipt plus stale revision recovery.

The same bounded follow-up fixes a material focus seam created by the added match settings control: PauseDialog previously selected the first `.match-heading button`, which became Settings. The actual pause button now has `data-pause-control`; restoration selects `[data-pause-control]`. The real-audio pause/resume case now asserts focus returns to Tạm dừng. No additional engine/API changes followed the original gate. The full workspace suite and all13 browser cases were **not rerun** after these bounded changes; the exact changed runtime is covered by the4 follow-up cases.

Node/Playwright emitted the existing NO_COLOR/FORCE_COLOR warning; intentional offline tests emitted expected network failures. Browser captured page errors are empty. `audio-browser.json` from final artifact records old context closed/new context running, music0/SFX≈.6,2 sound starts and restored muted=false/reducedMotion=true. These are real Chromium AudioContext calls, not mocked audio behavior.

### Source/artifact identity

`settled-source.json` captures pre-gate source. `production-source.json` records the first production source; the only changes since initial settling were the obsolete commands test correction and Next-generated next-env reference. Production build restored next-env to its original tracked form without manual cleanup.

`final-source.json` captures final source and was rechecked against disk with **no differences** before commits. Its only delta from `production-source.json` is:

- `apps/web/src/features/deck/DeckBuilder.tsx`: narrow committed/unsaved status logic.
- `apps/web/src/features/match/MatchShell.tsx` and `PauseDialog.tsx`: explicit focus target.
- `tests/e2e/deck-builder.spec.ts` and `tutorial-settings.spec.ts`: covering status/focus assertions.

`production-artifacts.json` and `final-artifacts.json` each record2288 artifact SHA256 values, excluding cache/dev/env files. API dist hashes are identical across both builds. Both route manifests explicitly verify `/api/v1/:path*`→`http://127.0.0.1:3101/api/v1/:path*`; actual UIorigin is `http://localhost:3200`.

| Manifest | SHA256 |
|---|---|
| production-source.json | `d7c153741d21aabacb5f48d17f440b7a2168f2d634e7e758584531666cbcdad0` |
| production-artifacts.json | `4119d640d8f63593f11c5bef0876f314d5ae1e1013baeeaf9794571836f208ec` |
| final-source.json | `dc26c5393b05afd8f1c48a66dbc393879d51c9950f145c4379f0984ad85fb1c1` |
| final-artifacts.json | `378d39b12dd39c4bf490c807b20368b217cc7ca2d1ba0454de9a2b96a5b11c73` |

### Commits, handoff and limits

- `c606602` — `feat(tutorial): persist scripted scenarios through engine journal` (engine/content/API, persisted compatibility, migration, tests and DATA pinning documentation).
- `b05c3c8` — `feat(web): guide tutorials with persistent settings and gesture audio` (UI/settings/playback, test-origin isolation, M4 saved-status/focus follow-up and coverage).
- No push, deploy, remote mutation or dependency upgrades. Report/evidence remain in the controller's ignored implementation workspace for packaging. No user runtime or unrelated application was stopped or reset.
- Task15 must replace temporary procedural tones with authored/licensed manifest assets, preserving the established gesture/settings/pause bus behavior; current tones are not final assets. Registry versions must remain immutable and retained. Forward migration still needs normal authorized rollout to interactive/Neon environments; only disposable testDB was migrated here.
- Chromium desktop automation covers keyboard/reduced and pointer/normal paths, 1440×900/1024×768 layouts and375×812 fallback. Physical touch, Safari/iOS autoplay/device audio output and subjective audible mix were not verified. Basic real Google acceptance remains controller/user-confirmed prior evidence. Task16 owns the already-recorded battle fold-height improvement.
- Self-review found no remaining correctness blocker. Controller review is still required before treating M4 as approved for Task15.

Controller independently matched final-source.json (368 entries) and final-artifacts.json (2,288 entries) with zero mismatches and verified3200/3101 origins; evidence: `task-14-evidence/controller-verification.json`. No controller test/build reruns. Final native `git status --short` after both commits was empty.


## Review fix round1 — FIX_BASE b05c3c8f958c960a38827b82d284c4af73e49358

Addressed Important1, Minor1 and Minor2 from `task-14-review.md`. Minor3 NO_COLOR/FORCE_COLOR harness noise remains explicitly assignedTask18. Existing report/gate evidence above is preserved; historic checkpoint evidence below supersedes the earlier new-state round-trip limitation.

### Changes and root causes

- SettingsDialog's React synthetic `cancel` event bubbled through its parent PauseDialog. `preventDefault` alone prevented native closure but did not isolate the event, so the parent submitted RESUME. Settings now stops cancellation propagation; Pause also ignores cancellation whose target is a descendant. No dialog framework/layout refactor. Existing browser audio case presses Escape in nested Settings, verifies only Settings closes, PAUSED persists, AudioContext stays suspended and focus returns to Settings inside Pause; it then reopens and button-closes Settings, explicitly resumes, and separately verifies Escape on Pause resumes normally.
- E02 result copy now says “Kỵ Sĩ Lá còn 1 HP” instead of an internal card ID. The existing USED tutorial→EVIL flow asserts the canonical text before completion; no separate copy suite.
- Replaced current-created “legacy” round-trip test with retained `apps/api/tests/fixtures/pre-t14-skirmish.json` and provenance markdown. Source commit is `f2dbfac73f6698725781f9ab55649964cad348b8`. `git archive` extracted prior source in ignored scratch; esbuild aliases pinned all @oathfront runtime modules to that archive. The bundle metafile contained48 baseline workspace source inputs plus the generator; every one of those48 was SHA256-checked against its original Git blob. Only third-party installed npm sources were reused, without workspace symlinks.
- The fixture uses the public deterministic test seed bytes0–31, not user data. Archived createMatchWithEvents/checkpoint encoder/journal recorder produce GOOD empty mulligan → BOT EVIL empty mulligan → BOT deployment pass → HUMAN pause, preserving4 entries and27 events at turn1 GOOD_PLAY. Archived RESUME computes a separate fixed expected resumed hash. Current test imports durable records directly into isolated verificationDB, audits initialization/journal/event replay, reads PAUSED through API, submits RESUME at revision4→5, audits replay again against the old resumed hash, and verifies immutable initialization was never rewritten. It never calls current createMatch to generate expected data.

| Historical artifact | SHA256 |
|---|---|
| Initial state | `a968d4ae5f6afe5b3e386589f9bb7e7c059c443acb0a2a3bf5d0296451df55ad` |
| Paused checkpoint (literal assertion in regression) | `5ede397fb173a44b4cb3fe243f3a847e1848a6a25e6f50043255ad1e3630892a` |
| Resumed state | `4b5508561b15aefdef340737e54e8c322e5c793f46ab5c3ec2e98af0acdaed1d` |
| Retained JSON file | `fa96c1d1f8d5e15182319a279548fa908737eb9342042551567bb3f408c0aaa1` |

Exact generator/bundler and workspace-input hash proof: `fix1-baseline-generate.ts.txt`, `fix1-baseline-bundle.mjs.txt`, `fix1-baseline-provenance.json` in evidence. Generation setup first used an incorrect mulligan field and incorrectly assumed an AUTO root after mulligan; the archived recorder rejected both. Corrected to the archived legal action field and actual direct transition to deployment before producing the retained fixture. These were generator setup errors, not application regressions or passing tests. Scratch is preserved at `/tmp/oathfront-t14-pre14-xr0m7oxb/baseline` outside repository lint traversal; no checkout/branch/reset/dependency upgrade occurred.

### Narrow verification

- RED: `OATHFRONT_E2E_PRODUCTION=1 pnpm exec playwright test tests/e2e/tutorial-settings.spec.ts -g 'real Web Audio'` against unchanged FIX_BASE artifact. Failed at the new assertion after nested Escape: expected PAUSED, received ACTIVE. This is actual API state after the mistaken RESUME, not a timeout-only failure. Log `fix1-escape-red.log`.
- `pnpm exec vitest run apps/api/tests/tutorial.test.ts -t 'retained pre-T14'`: **1 passed/4 skipped,1.49s**, `fix1-legacy.log`. This coverage gap had no known engine defect, so the independent historical test passes without a fabricated RED or runtime API edit.
- `pnpm typecheck`: PASS, `fix1-typecheck.log`.
- Initial `pnpm lint` traversed the Git-ignored archive and reported491 parser/config errors because that archive carried a second eslint/tsconfig tree. Preserved `fix1-lint.log`; moved only generated scratch to/tmp, then `pnpm lint` PASS in `fix1-lint-final.log`. No ESLint configuration or production source adjustment was needed.
- One necessary final web build after source self-review: `API_ORIGIN=http://127.0.0.1:3101 OATHFRONT_TEST_DEV=0 OATHFRONT_INTERACTIVE=0 pnpm --filter @oathfront/web build`, PASS, `fix1-build.log`. API runtime unchanged and not rebuilt.
- Production affected-case command: `OATHFRONT_E2E_PRODUCTION=1 pnpm exec playwright test tests/e2e/tutorial-settings.spec.ts -g 'real Web Audio|TU12 visible GOOD USED'`; outcome appended below. No full566-unit/13-browser repeat.

### Source/artifact scope

`fix1-source.json` records370 source hashes; `fix1-artifacts.json` records2288 artifact hashes. API dist is byte-identical to the prior final artifact; the rebuilt web manifest still bakes API3101 and runs at UI3200. Fix runtime delta is exactly SettingsDialog cancel isolation, PauseDialog cancel ownership and tutorial result text. Test delta is tutorial.test.ts, tutorial-settings.spec.ts and2 retained fixture/provenance files. Controller-owned README/milestones changes appear in the broader source manifest and are expressly excluded from my commits, as are controller-owned docs/implementation/tutorial-settings-audio.md and docs/implementation/evidence/task14/.

- fix1-source.json SHA256: `68c43ae2ac153bb9bd886138debf1cd3f4d528127d574ad761fd830ca75a1244`
- fix1-artifacts.json SHA256: `1822aa0ce63450c059af9c4658ccdadb7a426e59bcacf561bb9d66301ff19f1e`

No user interactive runtime, database or sessions touched; no remote mutation/push/deploy. Final authored assets, physical Safari/touch/device mix and migration rollout remainTask15/16/18 gates. Existing realGoogle acceptance is unchanged. ui-ux-pro-max keyboard/focus criteria were applied to the bounded cancellation fix; no layout or motion redesign.


Round1 final outcome: **2/2 affected production browser cases passed in23.2s** (`fix1-production-browser.log`): USED tutorial→EVIL canonical result→replay/skip17.4s, real audio/settings/nested Escape and explicit Resume/Escape2.9s. Captured page errors remain empty; known color-environment warnings remainTask18. Controller independently matched fix1-source370 and fix1-artifacts2288 with zero mismatches (`fix1-controller-verification.json`); no extra checks requested or run.

Fix commits:
- `b3ac70f` — `test(persistence): resume retained pre-tutorial match fixture`.
- `dff5aa3` — `fix(settings): keep nested Escape inside paused match dialog` (includes canonical result copy and existing-flow assertions).

Both staged diffs passed `git diff --cached --check`. Only controller-owned docs/README.md, docs/implementation/milestones.md, docs/implementation/tutorial-settings-audio.md and docs/implementation/evidence/task14/ remain outside my commits. Round1 status: DONE, ready for scoped controller rereview; no new correctness concerns.
