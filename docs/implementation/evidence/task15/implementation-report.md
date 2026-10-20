# Task 15 — Illustrated asset pipeline and authored audio

## Implementation

Implemented all requested groups: 96 separate original built-in image_gen illustrations (6 heroes,60 cards,18 powers,3 tokens,8 terrains,1 shared board),47 genuine alpha cutouts (6 heroes+38 UNIT+3 tokens),7 reusable native VFX families,18 authored SFX and2 composed seamless music loops. Four prototype calls preceded bulk production; controller approved the four originals, actual-size crops/alpha measurements and consistency before the remaining92 calls. All96 saved successfully; no generation fallback/errors or duplicated retries. Selected PNG masters,96 exact prompts, request/provenance records and source/export SHA256 hashes are retained in the repository, independently of the generator output directory.

GOOD rounded ivory/jade/wood/glass and EVIL angular charcoal/ember/mask materials follow CONTENT/UI-MOTION. No downloaded illustration/sample/character or bitmap rules/logos were incorporated. assets/source/LICENSE.md records use/provenance honestly without claiming exclusive copyright in raw AI output. Every generated result was inspected, followed by all4 final contact sheets and all47 small gameplay cutouts. Deterministic main-scene crops remove extra decorative panels/gutters from volcano,frozen_lake,desert originals. Tight hero HUD crops preserve faces; broad bust/full portraits remain separate.

The deterministic Python/Pillow export pipeline emits256px thumbnails,512px inspect images/cutouts,6 hero portrait/bust/HUD/motif sets,8 terrain strips/icons,shared board,low/high padded atlases (924²/1820²) and source/runtime manifests. No generation or network operation occurs during export. Validator independently checks file SHA256/bytes,actual dimensions,true alpha,bounds/anchor and atlas bounds. tools/assets/build-atlas.ts invokes the reproducible exporter; Python/Pillow dependency is pinned in requirements.txt. Original audio composition source uses Python standard library; ffmpeg/libmp3lame exports18 layered SFX MP3s and exact-boundary stereo PCM WAV scores (menu80BPM24s,battle120BPM16s). These are authored multi-layer audio assets,not temporary single-tone audition oscillators or AI recordings. Independent signal audit verifies20 non-silent unclipped files and both exact-length low-jump loop boundaries.

Integrated art into hero selection/details/powers,legacy preset setup,home board preview,collection/deck inspect,hand,reserve,block response,match inspect,hero HUD,result,board units and revealed terrain. Fixed slots preserve layout; real Vietnamese names/rules/stats remain semantic text. Art404 falls back to a named silhouette with explicit retry where outside primary buttons. No interactive button nesting was introduced. Terrain rules use opaque dark semantic surfaces. Existing GSAP event clock owns native VFX; reduced motion/cleanup remain intact.

loadBattleAssets accepts only public catalogVersion/quality: selected shared atlas+all8 terrain strips+shared board. It cannot accept hidden assignment. Private match clones differing only in hidden location project identically and have identical complete preload sets. Inspect images stay lazy. Actual fixed-pool measurements including padded pages: low1,531,376B preload/10,132,544B decoded RGBA; high4,045,008B/19,967,040B. These explicit pools are below12MB/128MB respectively; they are not total browser memory/texture/audio/performance measurements. Gesture-loaded18 SFX exports add176,022B and both music loops3,528,088B. Task16 owns actual device profiling and the existing low-height battle layout gate.

AudioManager now fetches/decodes cached authored buffers and plays AudioBufferSourceNodes. SettingsProvider/useSettings,version1 key/schema/defaults,event-family mapping,gesture unlock,separate music/SFX buses,menu/battle switching,pause/hidden behavior and disposal are preserved. Async decode cannot create voices after disposal; failed device resume remains unavailable. No engine/content/API changes; immutable core_v1 catalog/checksum/canonical artKeys unchanged.

## TDD and checks

RED before implementation:
- pnpm exec vitest run tools/assets/tests/manifest.test.ts:3 expected failures for missing source manifest/runtime loader (after correcting initial test import path).
- OATHFRONT_E2E_PORT=3200 OATHFRONT_TEST_DEV=1 pnpm exec playwright test tests/e2e/asset-fallback.spec.ts:expected missing retry control failure.
- Authored-buffer audio regression initially failed:expected20 loaded assets,received0 from old oscillator implementation.

GREEN:
- pnpm exec vitest run tools/assets/tests/manifest.test.ts apps/web/tests/audio.test.ts apps/web/tests/vfx.test.ts:8/8 passed,3files; retained focused-tests.log.
- pnpm exec tsx tools/assets/validate.ts:PASS source/export SHA256,dimensions,alpha,bounds,provenance/atlases; validator.log. One earlier invocation from API cwd failed because its relative path was wrong; corrected root invocation passed.
- Full deterministic atlas/export completed once; subsequent recorded crop-only export updated selected masters’ derivatives/hashes. python3 tools/assets/inspect-audio.py:20files,signal evidence in audio-signal.json.
- pnpm typecheck:PASS root+web; typecheck.log. pnpm lint:PASS; lint.log and final narrowed-source lint-final.log. git diff --check:PASS.

Browser/source chronology (all on isolated UI3200/API3101/oathfront_verification_test; protected user ports/databases untouched):
1. Dev integrated8-case run:6passed/2failed; dev-browser.log. Atlas404/slow/retry,all8 terrain requests,desktop/tablet/mobile/reduced,GOOD USED keyboard path,settings/realWebAudio and other unchanged tutorial checks passed. Hero retry failed because native radio overlay intercepted its pointer. Fixed retry z-index/independent44px target and asserted radio selection unchanged. TU12 KEPT clicked G06 before authoritative card became playable:trace had selected=true/playable=false,then refresh playable=true/selected=false. Intended-play helper now waits data-playable-unit=true; no runtime rule workaround.
2. Focused dev2-case follow-up:2/2passed37.9s; dev-followup.log.
3. After initial source/SCREENS/UI self-review, API_ORIGIN=http://127.0.0.1:3101 pnpm --filter @oathfront/web build:PASS; production-build.log. Production4-case gate:3passed/1failed28.5s; production-browser.log. Hero retry/slow,atlas/terrain/board/responsive and TU12 KEPT passed. Audio test assumed immediate source start after context resume; decoded assets are asynchronous. Changed assertion to poll actual buffer start; no audio runtime change.
4. Manual production hero screenshot review rejected clipped faces in wide80px banners. First narrow correction reused approved tight HUD exports with contain. A rebuild was already in flight when controller requested dev-first review; reported the crossed ordering transparently. production-build-crop-fix.log:PASS. Hero/audio follow-up2/2passed9.7s,production-followup.log; audio-browser.json has2contexts(closed/running),real buffer starts2,no page errors. Manual images still rejected the hero banners:intrinsic grid child height exceeded80px despite contain. Passing controls were not treated as visual acceptance.
5. Final correction explicitly constrains hero image height80px/min-height0; bounds assertions compare all6 images against their slots and require contain at1440/1024/375 widths. Dev hero-only verification and actual screenshot review precede the final rebuilt artifact (results appended below).

No full workspace suite was repeated; M4 had just passed. Production fixture API origin was baked before every build; unchanged API was not rebuilt. Logs contain harmless existing NO_COLOR/FORCE_COLOR warnings,not pristine-output claims. Intentional404 console messages are separated from unexpected errors in asset-browser.json. Raw Playwright traces and fixture secrets remain ignored,not published.

## Files and self-review

- assets/source/:masters,prompts,provenance,manifest,crops,audio,VFX and license.
- tools/assets/:catalog/prompt preparation,deterministic export/atlas,validator,signal/alpha inspection,review sheets and focused manifest tests.
- apps/web/public/assets/core-v1/:bounded WebP/atlas/audio/runtime manifest.
- Web rendering/assets/ArtImage and existing hero/deck/setup/match/settings surfaces; assets.css; audio-manager and focused tests; Vitest include.
- tests/e2e/asset-fallback.spec.ts; tutorial-settings fixture waits,instrumented buffer sources and optional evidence directory.
- docs/implementation/art-review.md and evidence/task15/.

Applied gpt-taste within existing game language; marketing AIDA/randomized layout does not apply to approved game screens. ui-ux-pro-max and React checklist covered native semantics,44px retry targets,decorative alt text,readable text/scrims,fixed slots,lazy inspect,viewport overflow,motion lifecycle and hidden information. Objective findings fixed:3 terrain scene crops,tight HUD follow-up,radio retry overlay,obsolete prototype captions,asynchronous fixture waits,and actual hero grid-image overflow. Tablet inspect illustration hiding and small-screen battle fallback preserve existing approved behavior. General low-height layout remains Task16.

External gates remain explicit:subjective headphone/speaker mix,timbre quality,Safari/iOS autoplay,touch/device FPS/memory and screen-reader validation were not performed. Signal audits and automated Chromium decode do not replace listening/device acceptance. No push/deploy/publish. Controller-owned docs/implementation/milestones.md edit is excluded from our commits.

## Final result and commits

Final dev hero-only gate passed1/1(14.4s),dev-hero-bounds.log. Viewed desktop/tablet/mobile screenshots:all6 complete faces/masks with constrained80px image boxes,contain and no slot overflow. Controller independently viewed desktop and accepted the correction before final rebuild. Final CSS-only source delta:explicit80px/min-height0 on hero-selection images; added all6 bounds/object-fit assertions. No further runtime/audio/engine changes.

Final API_ORIGIN3101 production build passed:production-build-final.log. Hero-only production covering gate passed1/1(5.5s),production-hero-final.log. Viewed the final production hero screenshot again and accepted all6 crops. Other integrated battle/terrain/404/retry/TU12 checks passed on the first production artifact;audio passed on the second;the final source delta is only the covered hero CSS constraint. final-artifact.json records final BUILD_ID,source/manifest/artifact SHA256 and baked3101 rewrites. Original failure/success logs are retained;terminal trailing whitespace/progress CRs were normalized only for clean Git whitespace checks.

Commits:
- 7a30f74 feat(assets): author core art and reproducible audio pipeline
- e43501d feat(web): integrate illustrated battle assets and authored sound

All requested Task15 production groups and integrations are complete. No unresolved automated/runtime defect is known. External subjective audio/Safari/device/screen-reader gates and Task16 viewport/performance work remain explicit. Working tree contains only the controller-owned milestones.md edit;no push/deploy/publish.

## Fix round1 — Review I1 (base e43501d)

Confirmed the reviewer’s fallback clipping:32px silhouette+20px name+44px retry+8px gaps produced104px inside an80px portrait. The earlier hero tests only verified loaded-image bounds and clickable remainder,so they did not establish a full44px error-state target. This finding supersedes the earlier no-known-defect statement.

Scoped fix adds11 CSS lines,only under `.hero-tile .hero-portrait .art-fallback`:constrain the fallback to80px/min-height0,hide the decorative silhouette,and prevent retry flex shrinking with max-width100%. Vietnamese fallback label,44px button,native radio semantics and loaded-state crops are unchanged. No ArtImage JSX,broader layout,game rule,audio or artwork/source/export changes.

Extended the existing missing-art E2E to select the last hero while the first hero’s image fails,then assert rectangle containment horizontally/vertically,minimum44×44 size,visible height44,and actual elementFromPoint edge/center hit tests at1440×900 and375×812. Retry restores the actual image without selecting its native radio. The test captures failure/recovered screenshot pairs and still checks existing slow-image slots/all6 loaded crops. Optional OATHFRONT_ASSET_EVIDENCE_DIR keeps fix evidence separate,preserving the original Task15 evidence and controller-owned publication files.

RED command before CSS fix:
`OATHFRONT_E2E_PORT=3200 OATHFRONT_TEST_DEV=1 pnpm exec playwright test tests/e2e/asset-fallback.spec.ts --grep 'missing artwork'`
Result:1 expected failure at retry.bottom containment:expected≤375.84375,received399.84375. Measured visibleHeight20 and hitTestable=false. Retained fix1-red.log,fix1-hero-fallback-bounds.json,fix1-hero-failed-desktop.png.

First post-CSS dev attempt retained as fix1-dev.log/fix1-dev/:rectangles and visibleHeight44 were correct,but the original nine-point probe rejected legitimate rounded button corners. Adjusted hit-test probes to five top/bottom/side midpoints and center,while preserving all full-rectangle containment/minimum-size assertions. No runtime change for that test correction.

Dev GREEN command:
`OATHFRONT_E2E_PORT=3200 OATHFRONT_TEST_DEV=1 OATHFRONT_ASSET_EVIDENCE_DIR=docs/implementation/evidence/task15/fix1-dev-green pnpm exec playwright test tests/e2e/asset-fallback.spec.ts --grep 'missing artwork'`
Result:1/1passed14.2s;fix1-dev-green.log. Both viewports report101×44 retry,visibleHeight44,hitTestable=true,inside80px portrait. Viewed all4 failed/recovered desktop+narrow screenshots before starting the production build:complete retry and readable label,no clipped button;restored art keeps the accepted crop. ui-ux-pro-max touch/fixed-slot review confirms the project’s44px requirement,not a universal web-standard claim.

Static checks: `pnpm exec eslint tests/e2e/asset-fallback.spec.ts` exit0(fix1-eslint.log);`pnpm exec prettier --check apps/web/src/styles/assets.css tests/e2e/asset-fallback.spec.ts` exit0,“All matched files use Prettier code style!”(fix1-format.log).

One settled build:`API_ORIGIN=http://127.0.0.1:3101 pnpm --filter @oathfront/web build` exit0(fix1-production-build.log),including web TypeScript verification. No unrelated suite/API build,image generation or asset re-export ran. Inspected listeners before test starts;UI3200/API3101 and verification database only. The source/artifact delta is the hero-fallback CSS and focused E2E;fix1-artifact.json records base,BUILD_ID,source/manifest hashes and baked3101 rewrites separately from the earlier artifact.

Production covering result and commit appended after completion below.

Production command:`OATHFRONT_E2E_PORT=3200 OATHFRONT_E2E_PRODUCTION=1 OATHFRONT_ASSET_EVIDENCE_DIR=docs/implementation/evidence/task15/fix1-production pnpm exec playwright test tests/e2e/asset-fallback.spec.ts --grep 'missing artwork'`. Result1/1passed6.0s(fix1-production.log). Both desktop+narrow retry targets are101×44px,visible44px and all five hit probes true;selection independence,recovery,slow slots and loaded crops pass. Viewed production failed desktop/narrow and recovered narrow screenshots;they agree with the accepted dev layout. Build/source hashes and3101 rewrite are in fix1-artifact.json. Existing NO_COLOR/FORCE_COLOR warnings remain;no page errors. Normalized only new fix log trailing terminal whitespace for clean Git checks;original evidence files unchanged.

I1 is resolved with no new known concern. External Task15 audio/Safari/device and Task16 layout/performance gates are unchanged. Only scoped CSS,test,art-review and new fix evidence will be committed;all enumerated controller files remain excluded. Commit recorded below after creation.

Fix round1 commit:`2608d6c fix(web): keep hero artwork retry fully within its slot`. Post-commit diff check passes;remaining working-tree files belong to the controller. No push/deploy.
