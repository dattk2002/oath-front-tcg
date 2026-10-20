# Task 16 implementation report

Status: **DONE_WITH_CONCERNS**. Open release acceptance item **PERF-P95-01 — FAILED / OPEN**, p95=21.4/21.7/22.5ms against20ms. Base `21d7e200871290d9be9a3468b869965a420f0dfa`; authorized main, no push/deploy. Controller-owned `docs/implementation/milestones.md` excluded from commits.

## Scope and changes

- Responsive semantic battle layout at 1440×900, 1366×768, 1280×720, 1024×768 and 1024×640. Both hero HP panels, five lanes, ten-card hand and phase action fit measured viewport bounds. Optional inspect/log/reserve disclosures follow critical controls. G01/G02/block tutorial instructions and both block decisions fit the low tablet viewport. Small-screen/reflow fallback exposes five lanes and full own-hand/power descriptions.
- Normal account prompt moved after gameplay in DOM and visual order. Urgent AuthPanel status, SessionRecovery/Pause/Result and uncertain-command controls retained. No server, engine, private state, rules or public DTO changes.
- Native accessible names include visible content (brand, unit/hero/card stats). Focus order reaches board after header. Vietnamese text, 44px controls and contrast tokens checked. Pinned development-only axe scanner 4.14.0; official npm release2026-10-15, six days old, controller-approved, no broad upgrades.
- Version1 preferences retain volume/mute/reducedMotion; motion system/reduced and quality auto/low/standard added coherently. Auto maps small/reduced displays to low; standard high and low explicit. Renderer uses low resolution/antialias settings without changing rules.
- GSAP hover/focus now owns one reversible tween per live card, removes detached owners, and restores styles on teardown. The real harness200 repeated interactions previously retained200 context entries, now≤2.
- Renderer quality/reduced/retry recreation now keys a fresh canvas. Reusing a destroyed WebGL canvas hung both Chromium and Firefox; the covering settings switch passes both engines.
- No-Navigation-API deck traversal restores current Next history entry with pushState instead of overwriting the previous destination. Real Firefox configured API-absent passes Back/Stay/reload/Back/Leave. Stay retains draft; explicit Leave continues clearing it.

## Process and self-review

Read authoritative task16 brief and appended handoffs, root/web AGENTS, global constraints, OATHFRONT, UI-MOTION and applicable SCREENS. Applied SDD implementer prompt (no subagents), TDD, systematic debugging, gpt-taste primary, ui-ux-pro-max review, React checklist and verification-before-completion. Approved game layout superseded marketing/randomization guidance. No unrelated redesign or API rebuild.

Before production build, reviewed spec/source and development viewport screenshots including five sizes, G01/G02/G07, empty hand, pending command and atlas failure. Fixed objective findings together: below-fold gameplay, G07 rail overlap, accessible-name mismatch, keyboard order, quality switch hang. Next dev indicator obscured a card/tutorial corner only in development; final production screenshots omit it. React review: stable hooks, explicit cleanup for GSAP/Pixi/observer/listeners, semantic controls and authoritative store ownership retained. Styling follows existing CSS files; no new runtime dependency.

Development evidence archived at `task-16-evidence/development-final/`; final production evidence is `docs/implementation/evidence/task16/`. Task15 and earlier evidence not overwritten. Runtime source SHA256 snapshot before build: `task-16-evidence/prebuild-source-hashes.json`.

## Verification commands and exits

All commands use repository cwd. Logs below live in `task-16-evidence/`. UI3200/API3101 and disposable oathfront_verification_test only; listeners checked. User3000/3001/interactive DB and unrelated3100 were preserved. Browser profiles isolated. Playwright suites sequential after the one disclosed early collision below.

- `pnpm exec vitest run apps/web/tests` — exit0,54 tests/13 files; `web-unit-gate.log`.
- `pnpm typecheck` — exit0, root and web; `types-final.log`.
- `pnpm exec eslint apps/web/src/app/App.tsx apps/web/src/app/router.tsx apps/web/src/features/auth/AuthPanel.tsx apps/web/src/features/deck/DeckBuilder.tsx apps/web/src/features/match apps/web/src/features/settings apps/web/tests/audio.test.ts apps/web/tests/quality-harness.ts tests/e2e/accessibility.spec.ts tests/e2e/performance.spec.ts tests/e2e/performance-metrics.ts tests/e2e/quality-fixtures.ts tests/e2e/responsive.spec.ts playwright.config.ts` — exit0; `lint-final.log`.
- `OATHFRONT_BROWSER=firefox OATHFRONT_NO_NAVIGATION=1 pnpm exec playwright test tests/e2e/accessibility.spec.ts --grep 'keyboard settings|dirty Back|legacy'` — exit0,3/3,32.5s; `firefox-renderer-final.log`.
- `API_ORIGIN=http://127.0.0.1:3101 pnpm --filter @oathfront/web build` — exit0, standalone prepared, BUILD_ID `LqhLcdiU34U1RhsDAtRx1`; `production-build.log`.
- `git diff --check` — exit0.

No full engine/API suite repeated; full integration belongs to Task18. Existing NO_COLOR/FORCE_COLOR warnings remain assigned18.

## Earlier failures / RED and corrected harness results

These are retained separately and are not presented as final-source failures or passes. Exploratory filters are not all copied into log headers; exact final acceptance commands above/below are retained.

- `baseline.log`: meaningful layout RED,1440/1366 action below viewport;1 pass,2 fail,exit1. No artificial baseline defects.
- `settings-red.log`: missing motion/quality migration fields;1 fail/4pass,exit1 → `settings-green.log`5/5exit0.
- `hover-red-3.log`: meaningful GSAP retained200 vs≤2,exit1. Earlier `hover-red-2.log` was harness module-resolution failure (exit1), not product RED.
- `layout-1.log`5pass/2fail includes real1024-height issue plus trace ENOENT caused by an accidentally overlapping early Playwright launch. `hover-red.log` failed port3101 in use. This infrastructure collision was disclosed immediately; subsequent suites/resetting fixtures were sequential.
- `dev-quality-2.log`7pass3fail: layout and axe accessible labels. `dev-covering-3.log`1pass2fail: remaining brand/reflow + tutorial fixture advancing while command pending. `dev-review-4.log`7pass4fail1skip: fallback list selector counted nested ownhand, invalid mass fixture event IDs/order, tutorial pending race. Corrected fixture validates CommandResponse; no engine behavior changed to satisfy it.
- `dev-covering-5.log`2pass2fail: brand native text and G07 rail height. `dev-covering-6.log`3pass1fail: failure injection used incorrect atlas path; test corrected. `dev-covering-7.log`3/3exit0 covers tutorial, contrast and empty/failure/pending.
- `firefox-fallback-red.log`: second Back did not prompt after Stay (replace overwrote destination),exit1. `firefox-fallback-green.log` exercised traversal fix but failed incorrect test expectation that explicit Leave retains draft; corrected to prior product contract and added reload-after-Stay check.
- `dev-final-review.log`11pass1fail1skip: implicit quality label contained option text; explicit label added. `firefox-covering-final.log`1pass1fail: renderer canvas reuse hung quality change. `keyboard-quality-red.log`2fail: optional controls preceded board and canvas reuse reproduced in Chromium. `keyboard-quality-fix1.log`2/2exit0; final Firefox3/3exit0.
- `types-initial.log`, `types-2.log`: harness type import pulled app bundler imports into root NodeNext tsc; removed that cross-project type import. `types-3/4/gate/final.log`exit0. `lint-gate.log`8 harness unused-initialization errors; corrected; covering/final lint exit0.

## Acceptance limits

Automated keyboard/focus passes are real browser input, but independent human keyboard assessment remains awaiting_external_input. Axe zero violations does not close manual screen-reader acceptance. Color contrast for gradients is scanner-incomplete; token math and visible opaque HUD review separately support the4.5:1 requirement.720×450 is CSS reflow equivalent to200% of1440×900, not a human browser-zoom result. Physical tablet touch, Safari, Edge, system nativeFirefox150 execution, screen-reader speech/pacing and Task15 listening acceptance remain awaiting_external_input. No device/human/browser results fabricated.

Firefox157 is Playwright-patched, launched with the supported dom.navigation.webidl.enabled=false preference and feature absence asserted. It is not claimed as unmodified native150 or Safari. Headed Chrome uses actual Intel Mesa; headless SwiftShader data is separately labeled and not physical-GPU acceptance. NVIDIA inventory does not imply it rendered the benchmark.

## Production gate

- `OATHFRONT_E2E_PRODUCTION=1 OATHFRONT_MOTION_EVIDENCE_DIR=docs/implementation/evidence/task16/motion OATHFRONT_ASSET_EVIDENCE_DIR=docs/implementation/evidence/task16/assets pnpm exec playwright test tests/e2e/responsive.spec.ts tests/e2e/accessibility.spec.ts tests/e2e/performance.spec.ts tests/e2e/motion.spec.ts tests/e2e/asset-fallback.spec.ts` — exit1,18passed/2failed/2skipped,2.9min. Both failures were stale selectors: case-sensitive `/OathFront/` after accessible name uses native visible uppercase, and old Task10 retry wording `Thử lại hình khối` changed by Task15 to `Thử lại hình ảnh`. Snapshot/trace confirms controls present; preserved in `production-first-failures/`.
- Corrected only those two test selectors; **no runtime rebuild**. `OATHFRONT_E2E_PRODUCTION=1 OATHFRONT_MOTION_EVIDENCE_DIR=docs/implementation/evidence/task16/motion pnpm exec playwright test tests/e2e/motion.spec.ts --grep 'actual WebGL signature|failed renderer'` — exit0,2/2,9.4s (`production-motion-covering.log`). This covers reconnect mid-tween, remount, fast-forward before keyboard, OS+explicit reduction and transient renderer retry with one canvas.
- Combined production coverage:20 distinct passing tests; explicit hardware benchmark and Firefox-only traversal were separately gated. No pass inferred from a skipped test. Five-size viewport bounds and tutorial G01/G02/G07 passed; screenshots inspected at1024×640 and1440×900 including pending/empty/failure. Production no longer shows Next dev indicator.
- Task15 hero-selection80px portrait,44px fallback retry and responsive asset pool regression:2/2passed in this production artifact.
- Axe battle/settings/reflow: zero violations. Token minimum6.256:1 across tested foreground/surface pairs, above4.5; gradient-incomplete scanner outcomes retained honestly.

## Measured budget failure and focused correction

First hardware benchmark command: `OATHFRONT_E2E_PRODUCTION=1 OATHFRONT_BROWSER=chrome OATHFRONT_BENCHMARK=1 pnpm exec playwright test tests/e2e/performance.spec.ts` — exit1,1pass/1fail,3.9min. Three60000ms runs completed,133/131/133commands; actual Intel Mesa renderer. Median16.7ms, p95=21.7/21.6/21.9ms (FAIL20), p99=23.8/23.6/23.6ms, zero longtasks.20/20unmounts zero observed live textures; GCheap11,546,072→13,004,464B. Shell303,025B, battle167,788B, assets+fonts8,286,642B, peakuploads13,487,176B, CLS.004277. Raw baseline and failuretrace retained as hardware-baseline.json/png and hardware-first-failures/.

Controller clarified ambiguous KB/MB budgets conservatively as decimal:300,000/900,000/12,000,000/128,000,000B. The original harness used1024 multipliers; corrected without relaxing frame limits. Thus shell303,025B was a3,025B overage, not a pass. Dynamic DeckScreen import removes an unnecessary eager route component from the home shell.

A10s blank WebGL-clear diagnostic on identical Chrome/Intel renderer had median16.8/p9520.4/p9920.7ms (framepacing-diagnostic.json). It is environmental context only, not subtracted from application timing. A targeted actual-app diagnostic found idle p9516.7ms versus active p9521.0ms. CDP CPU sample profile was mostly idle; hottest app-linked native work was Pixi resizeCanvas.

`OATHFRONT_E2E_PRODUCTION=1 OATHFRONT_BROWSER=chrome OATHFRONT_BENCHMARK=1 OATHFRONT_FRAME_DIAGNOSTIC=1 pnpm exec playwright test tests/e2e/performance.spec.ts --grep 'measured full'` — first exit1 on corrected shell budget (`app-diagnostic.log`); subsequent instrumented RED exit1 on stable canvas assertion (`canvas-resize-red.log/json`). Ten seconds/22commands produced86 width/height writes alternating1393×926 at motion-control height0 and1393×970 at44px. The optional fast-forward row was changing the root canvas extent;44px reserved row fixes that cause without reducing essential gameplay.

Source self-review repeated only for these new findings. `OATHFRONT_BROWSER=firefox OATHFRONT_NO_NAVIGATION=1 pnpm exec playwright test tests/e2e/accessibility.spec.ts tests/e2e/responsive.spec.ts --grep 'dirty Back|fit 1024x640'` — exit0,2/2,29.6s, dev-profile-fix.log. Development1024 screenshot inspected: HP/five lanes/ten cards/action still fit; archived profile-fix-development-1024.png. `pnpm typecheck` exit0(types-profile-fix.log). Focused ESLint found one test-only unused initial value; removed it, covering lint exit0. No additional runtime change.

Second production build is justified by the two runtime corrections; previous test-only selector changes did not cause a rebuild. Both builds bake API_ORIGIN3101. Source snapshot prebuild-profile-fix-source-hashes.json.

Second build exit0: `API_ORIGIN=http://127.0.0.1:3101 pnpm --filter @oathfront/web build`, log production-profile-fix-build.log, BUILD_ID `ZipcVWCZHw8l3sc-rmia3`. No runtime edits after this boundary.

Short GREEN uses the same diagnostic command as RED: exit0,1/1,29.1s (canvas-resize-green.log/json). Zero canvas dimension writes during22commands; active median16.7/p9519.7/p9921.9ms, idlep9516.7. Shell264,942B (38,083B reduction); battle196,235B. These short/profiled results justified one final full benchmark; they do not replace3×60s acceptance. CPU profile overhead is present in diagnostic only.

## Acceptance mapping

| Requirement | Evidence / boundary |
|---|---|
| AC37 desktop/tablet bounds | Five exact viewport dimensions, ten units/cards, no horizontal overflow; real bounding rectangles plus screenshots |
| Tutorial guidance/action | Real G01/G02/G07 at1440×900 and1024×640; HP, lanes, energy, hand and block choices fit |
|375px and200% reflow |375 fallback and720×450 CSS equivalent; readable five lanes and full ownhand/power text; manual zoom pending |
| Vietnamese glyphs | Local Noto Sans; screenshots and accessible labels preserve Vietnamese |
|44px / keyboard/dialog | Hand targets and tutorial controls; settings trap/Escape/restore and natural board-first Tab order; human pass pending |
| Contrast | Token minimum6.256:1, zero axe violations; raw gradient-incomplete results not relabeled passes |
| Motion/recovery | Real WebGL interrupted/remount/offline reconnect, reduced motion, fast-forward and retry tests pass; rules/private projections untouched |
| Settings migration | Existing v1 volume/mute/reducedMotion retained; public motion/quality fields tested; low assets requested |
| GSAP ownership |200 interactions retain≤2entries, restore styles; detached owners disposed |
| No Navigation API | Actual Firefox157 with supported preference and absence assertion; Stay/reload draft retained, Leave reaches destination and clears draft |
| Task15 regression |80px portrait/44px retry, complete atlas/terrain retry verified against firstproductionartifact; runtime asset contracts unchanged by later footer/lazy import |
| Performance | Three60s workloads and20cycles, actual renderer, raw frame/longtask/heap/texture/bundle/preload/CLS data; final outcomes below |
| Manual/browser external gates | Safari/Edge/physicaltablet/screenreader/human keyboard+zoom/listening remain awaiting_external_input |

## Final measured hardware outcome

`OATHFRONT_E2E_PRODUCTION=1 OATHFRONT_BROWSER=chrome OATHFRONT_BENCHMARK=1 pnpm exec playwright test tests/e2e/performance.spec.ts --grep 'measured full'` — exit1, completed3×60s and20cycles; hardware-benchmark-final.log and hardware-final-failures/. **p95 not_met**,21.4/21.7/22.5ms vs20. Median16.7all, p9923.3/23.3/23.5ms;133commands/run; zero longtasks and zero canvas-size writes. ActualChrome155.0.8059.39/ANGLEIntelMesaUHDCMLGT2/Mesa26.0.3/DPR1. No flags changed to force acceptance.

All decimal resource budgets pass: shell264,942B, incrementalbattle196,235B, artwork/audio/fonts8,286,642B, peakobservedRGBAuploads13,487,176B, CLS.004290. No particle systems (0particles; bounded sharedGraphicsmarkers).20/20observedunmounts have0liveWebGLtextures/0uploadedbytes. GCheap11,424,600→12,969,008B (+1,544,408); cycle10→20delta230,224B. Rawsequence retained; not labeled zero-growth/leak-free. Driver/framebuffer/DOMdecoded/audio memory excluded from GLaccounting; totalnativeprocessmemory notclaimed.

The fixed resize and shell defects are verified, but full-duration p95 failure remains real. Short19.7ms profile did not establish fullbudget success. Blank20.4ms vs actualidle16.7ms does not prove an exclusivelyhost cause. Asked controller for narrow disposition rather than endlessly rerunning unchanged workloads.

`OATHFRONT_E2E_PRODUCTION=1 OATHFRONT_MOTION_EVIDENCE_DIR=docs/implementation/evidence/task16/motion pnpm exec playwright test tests/e2e/responsive.spec.ts tests/e2e/motion.spec.ts --grep 'ten cards|375px|actionable tutorial|empty hand|actual WebGL signature'` — exit0,9/9,33.4s (production-layout-covering-final.log). This covers allfivebounds,375fallback, actualtutorialG01/G02/G07, empty/failure/pending, reconnectmid-tween, remount, OS/explicitreduction after the44px reservedrow change.

`OATHFRONT_E2E_PRODUCTION=1 OATHFRONT_BROWSER=firefox OATHFRONT_NO_NAVIGATION=1 pnpm exec playwright test tests/e2e/accessibility.spec.ts --grep 'dirty Back'` — exit0,1/1,7.9s (firefox-production-final.log). Actualversion157.0 and navigationApi=false recorded in evidence/task16/firefox.json on finalartifact. `pnpm exec tsc --noEmit` exit0(test-types-final.log).

Metric definition review: primary intervals are differences of rAF callback-supplied timestamps, not performance.now callback-entry times and not GPU/compositor presentation timestamps. Firstinterval excluded; same definition across primarybaseline/final. [Official MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) documents shared rAF timestamp semantics. Lowdiagnostic adds callback-entry intervals as secondary evidence only; primary metric and20ms threshold unchanged. The actualdisplay presentation cadence remains unmeasured.

## Authorized bounded low-mode diagnostic

Controller authorized exactlyone60s low-mode workload, preserving the primary result. `OATHFRONT_E2E_PRODUCTION=1 OATHFRONT_BROWSER=chrome OATHFRONT_BENCHMARK=1 OATHFRONT_LOW_DIAGNOSTIC=1 pnpm exec playwright test tests/e2e/performance.spec.ts --grep 'measured full'` — exit1 onp95; low-diagnostic.log/failures, separateperformance-low-diagnostic.json/png. Explicitpersistedqualitylow, actualcutouts-low.webp;60,003.2ms/133commands; sameChrome/Intelrenderer/DPR1. rAFmedian16.7,p9521.9,p9923.3; secondarycallback-entry16.8/22.7/25.0ms. Assets5,773,010B; peakuploads3,652,680B; zero particles/sizewrites/longtasks. Lower quality does notcloseobservedgap. No thirdfullbenchmark or speculativearchitecture refactor.

Displaycontext: existing GNOMEWayland desktop, DISPLAY=:0/WAYLAND_DISPLAY=wayland-0, rootlessXwayland present; noXvfb or pacingflags introduced. Browserheadedtemporaryprofile isolated fromuser. ActualphysicalGPU confirmed; physicalmonitor refresh/presentation not independentlymeasured. xrandr command unavailable (inspectionexit1, noinstallationattempt). document.visibility/focus notsampled duringrecordedbenchmarks; this is explicitlyunknown, not a foregroundclaim. Controlleraskedforremainingp95disposition afterthisboundedprobe.

## Last authorized post-fix trace

`OATHFRONT_E2E_PRODUCTION=1 OATHFRONT_BROWSER=chrome OATHFRONT_BENCHMARK=1 OATHFRONT_FRAME_DIAGNOSTIC=1 OATHFRONT_FRAME_TRACE=1 pnpm exec playwright test tests/e2e/performance.spec.ts --grep 'measured full'` — exit0, diagnostic assertions only;10s/22commands, finalunchangedruntimeartifact. Explicitfocus/visibility sampling atstart/end visible+true, no intervening events. rAFp9519.2/callback-entry19.5ms; shortprofile notacceptance substitute.

ExistingCDPProfiler/Tracing categories devtools.timeline/blink.user_timing/disabled-by-default-devtools.timeline.frame; no newdependency/framework. Rawpostfix-frame-trace.json and app-diagnostic.cpuprofile retained ignored; committedtrace-summary.json recordsSHA256+aggregates. Layout71,total27.86/max1.34ms; Paint119,total69.90/max2.33; UpdateLayoutTree52,total17.16/max1.81; FireAnimationFrame1768,total339.66/max11.93. Inclusiveeventdurations are nested, notadditive. Samplesmostlyidle/program; resizeCanvashotspot gone. No attributable new smallappdefect established.

BrowserBeginFrame tracecadence16.666ms; AnimationFrame::Presentation spacings median16.857/p9521.378/p9932.979ms acrossentiretrace (setup/teardownincluded). Notphysicalpanelmeasurement and notreplacementbudgetmetric. Laterfocusobservation doesnotretroactivelyprovefocusinprimary3×60. Finalp95 remainsFAILED/unresolved. Requestedcontrollerdisposition; no furtherperformanceexperiments planned.

## Controller disposition and release carry

Controller authorized closing implementation with concerns after the bounded post-fix trace. UI-MOTION127 defines an optimization target; Task16 requires real measurement/comparison. The attributable resize and shell defects are fixed, but PERF-P95-01 remains FAILED/OPEN. No host-only cause is asserted. The20ms target is unchanged and deployment remains unauthorized. Carry PERF-P95-01 into the controller's Task18 release checklist: this Intel/Wayland workload needs future performance/device validation before an unqualified performance or production-ready claim. Manual/device/browser gates remain awaiting_external_input separately.

Latest trace harness static check found its CDP stream type was overly narrow (Chrome payload permits an absent stream). Changed only the optional type plus an explicit missing-stream error; no runtime/UI change, rebuild or benchmark repeat. Focused final tsc/lint results recorded below.

## Final static, evidence and commit boundary

- `pnpm exec tsc --noEmit` — exit0, types-trace-covering.log (after optional CDP stream type correction). `pnpm exec eslint tests/e2e/performance.spec.ts` — exit0, lint-trace-covering.log. `git diff --check` / staged equivalent — exit0. No further build or browser rerun for this test-only type guard.
- Final runtime matches all16 SHA256 entries in prebuild-profile-fix-source-hashes.json. Final build ZipcVWCZHw8l3sc-rmia3; first build LqhLcdiU34U1RhsDAtRx1 evidence remains explicitly separated in artifact-manifest.json. Source hashes,72 requested/build/API artifact hashes and evidence hashes are committed. API artifact was unchanged/not rebuilt.
- Primary measurements precede later test-only callback-entry/focus/trace observations. Runtime/build and primary rAF metric did not change. Historical harness file hashes were not separately captured; final harness hashes are recorded, without inventing historical hashes.
- Final production1440×900 battle and1024×640 actionableG02 screenshots inspected again; no dev indicator, critical controls/readable tutorial fit. Previous failure/empty/pending/G07 review and geometric checks retained.
- Owned test listeners3200/3101 are closed. No user ports/DB/tabs modified; no push/deploy/external messages. Controller-owned milestones.md remains unstaged.
- Implementation/tests commit: `92c55e43177aae672db59c02a212b60d14db2d42` — Improve battle layout, accessibility and resource ownership.

- Documentation/evidence commit: `f9272640f042d0bea2ec7771cc3b12e1d3743a5d` — Record Task16 visual and performance acceptance evidence.
- Final evidence verification passed:27source hashes,72artifact hashes,54evidence hashes, allJSON parse, rawaxe violation lists empty. Gradient-incomplete records retained. Both staged diffs passed whitespace checks.
- Final outcome: DONE_WITH_CONCERNS. PERF-P95-01 remains FAILED/OPEN by controller disposition; all independent implementation work and scoped commits complete. No further benchmark/build repeats, push or deployment performed.

# Task 16 review fix round 1

Base: f9272640f042d0bea2ec7771cc3b12e1d3743a5d. Findings1–3 verified against source and addressed. Overall task remains DONE_WITH_CONCERNS because PERF-P95-01 and external gates are unchanged. Scoped re-review requested after commit.

Runtime changes are deliberately limited to restoring hand gap4→8px and marking the redundant visible status fragment aria-hidden. Complete status text remains in the button name once. No graphics behavior, rules, API, auth or recovery runtime changes. Five-size tests now measure every adjacent card gap and44×44 minimum, alongside viewport bounds. A four-status fixture asserts the exact complete accessible name, including the fourth status omitted by the visual summary.

Browser-error collection is asserted in normal responsive/accessibility cases, including prepared match fixtures and real tutorial/contrast cases. The fallback exception requires both an intentionally aborted atlas.webp URL and exact Chromium net::ERR_FAILED console text. Page exceptions are never filtered. An explicit sentinel test confirms unexpected console/page errors remain collected. Public guest prebootstrap supplies a valid session for real tutorial/contrast before monitoring; real G01→G02→G07 transitions still execute. No401 exception was added. Evidence output accepts an explicit task-fix destination, preserving old evidence.

## RED/GREEN and verification

- Initial two-case RED: gap assertion observed4 vs required8 (meaningful). Status fixture mistakenly set armor2, which public schema limits to1; the request was rejected and no board loaded. This is recorded as a fixture failure, not duplicate-name RED. Added validation at fixture preparation to reject future mutated invalid DTOs promptly.
- Corrected status RED: exact accessible name contained repeated Khiên/Giáp1/Độc plus the visual +1status suffix. Raw log/trace retained separately.
- Development covering9/9 passed35.6s after the two runtime edits. Reviewed1024×640 development screenshot before the single build, preserving all ten cards, both HP panels, five lanes and action. Applied the existing gpt-taste direction, ui-ux-pro-max touch/spacing/accessibility review and React semantic review; no redesign or new runtime dependency.
- One production web build passed, API_ORIGIN3101 embedded, standalone prepared. No API rebuild.
- Production covering9passed/1failed25.8s: tutorial reachedG07 and geometric checks passed, but zero-error assertion caught two expected unauthenticated session bootstrap401s. Retained this failure.
- Test-only guest setup fixed the fixture boundary; tutorial+contrast2/2 passed13.0s on unchanged artifact. This is not a fresh10/10 run. No rebuild for that test-only correction.
- Root/web typecheck, final focused root tsc/lint and whitespace checks passed. Final production1024×640 screenshot visually inspected. No Firefox, engine/API full suite, performance benchmark or extra build repeated.

Exact commands and exits (logs under task-16-evidence/fix1 and committed fix1/logs):

- `OATHFRONT_QUALITY_EVIDENCE_DIR=.superpowers/sdd/2026-10-20-oathfront-implementation/task-16-evidence/fix1/dev pnpm exec playwright test tests/e2e/responsive.spec.ts tests/e2e/accessibility.spec.ts --grep 'fit 1024x640|keyboard settings'` — exit1; `red.log`.

- `OATHFRONT_QUALITY_EVIDENCE_DIR=.superpowers/sdd/2026-10-20-oathfront-implementation/task-16-evidence/fix1/dev pnpm exec playwright test tests/e2e/accessibility.spec.ts --grep 'keyboard settings'` — exit1; `status-red.log`.

- `OATHFRONT_QUALITY_EVIDENCE_DIR=.superpowers/sdd/2026-10-20-oathfront-implementation/task-16-evidence/fix1/dev pnpm exec playwright test tests/e2e/responsive.spec.ts tests/e2e/accessibility.spec.ts --grep 'ten cards|keyboard settings|empty hand|error collector|WCAG'` — exit0; `dev-covering.log`.

- `API_ORIGIN=http://127.0.0.1:3101 pnpm --filter @oathfront/web build` — exit0; `build.log`.

- `OATHFRONT_E2E_PRODUCTION=1 OATHFRONT_QUALITY_EVIDENCE_DIR=docs/implementation/evidence/task16/fix1 pnpm exec playwright test tests/e2e/responsive.spec.ts tests/e2e/accessibility.spec.ts --grep 'ten cards|keyboard settings|empty hand|error collector|WCAG|actionable tutorial'` — exit1; `production-covering.log`.

- `OATHFRONT_E2E_PRODUCTION=1 OATHFRONT_QUALITY_EVIDENCE_DIR=docs/implementation/evidence/task16/fix1 pnpm exec playwright test tests/e2e/responsive.spec.ts tests/e2e/accessibility.spec.ts --grep 'actionable tutorial|normal text token contrast'` — exit0; `production-fixture-covering.log`.

- `pnpm typecheck` — exit0; `types.log`.

- `pnpm exec eslint apps/web/src/features/match/Board.tsx tests/e2e/accessibility.spec.ts tests/e2e/responsive.spec.ts tests/e2e/quality-fixtures.ts` — exit0; `lint.log`.

- `pnpm exec tsc --noEmit` — exit0; `types-fixture.log`.

- `pnpm exec eslint tests/e2e/quality-fixtures.ts tests/e2e/responsive.spec.ts tests/e2e/accessibility.spec.ts` — exit0; `lint-fixture.log`.

## Artifact and release boundary

Fix build: `mPRxwzNVtnRYVPLtxR3DM`. Runtime SHA256 exactly matches the prebuild snapshot; source/test and built JS/CSS hashes are in `docs/implementation/evidence/task16/fix1/manifest.json`. Original performance.json SHA256 remains `932d3f333149bc0f43b4be68c8a6180ffe654654e1348911bc17611ec7114e5c`. The three60-second performance results belong to **preceding** build `ZipcVWCZHw8l3sc-rmia3`; this CSS/ARIA fix artifact was not benchmarked. PERF-P95-01 stays FAILED/OPEN at21.4/21.7/22.5ms vs20ms. No threshold, release gate or deployment boundary changed. Original artifact/evidence manifests and previous screenshots preserved.

Initial/status RED traces remain under ignored fix1/initial-red-artifacts and fix1/status-red-artifacts; first production failure under fix1/production-first-failures. New screenshots/scanner outputs/logs are confined to committed evidence/task16/fix1. Controller-owned docs/README.md, milestones.md, controller-verification.json, implementation-report.md and parent evidence/task16/logs directory are excluded from this commit. Minor4 warning normalization remains Task18. Owned ports3200/3101 are closed; user ports/databases/tabs were preserved. No push/deploy/subagents.

Committed log copies normalize trailing whitespace/CR progress lines after the staged whitespace check identified them; raw originals remain unchanged in ignored fix1 logs. Evidence hashes were refreshed after normalization. No source/runtime/test outcome changed.

Fix1 commit: `4ba49fe6f78cfce55b343c3c5b85ce93894378c1` — Fix reviewed hand spacing and accessible status names. Final source/artifact/evidence hash verification passed (5 source files, 51 build artifacts, 29 evidence files); preceding performance hash unchanged. Scoped fixes complete and ready for re-review. Parent-owned files remain outside the commit.
