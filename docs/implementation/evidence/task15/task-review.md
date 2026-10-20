# Task 15 review

## Spec Compliance

- ❌ Issues found: the illustrated asset pipeline and requested production groups are present, but the hero 404 fallback clips its retry control below the required 44px accessible target. See Important I1 (`apps/web/src/styles/assets.css:8`, `apps/web/src/features/match/ArtImage.tsx:23`).
- ✅ The requested files exist in the package: source manifest, validator, atlas builder, public exports, runtime manifest loader, manifest tests, fallback E2E and art review. The source manifest contract includes ID/version/source/provenance/license/bounds/anchor/size/atlasGroup (`tools/assets/types.ts:18`); the exporter writes both manifests (`tools/assets/export-assets.py:129`).
- ✅ Production counts are 6 heroes, 60 cards including 38 UNIT cutouts, 18 powers, 3 tokens, 8 terrain, 7 VFX, 18 SFX and 2 music loops. The additional shared board is used by the approved battle surface. Counts and source validation are covered by `tools/assets/tests/manifest.test.ts:7` and `:13`; atlas packing and 256/512 exports are defined at `tools/assets/export-assets.py:57` and `:94`.
- ✅ The preload boundary accepts public catalog version and quality only, with all eight terrain strips included regardless of hidden assignment (`apps/web/src/features/match/rendering/asset-manifest.ts:25`). The hidden-state projection/request comparison is substantive (`tools/assets/tests/manifest.test.ts:50`); retained browser evidence lists all eight terrain paths (`docs/implementation/evidence/task15/asset-browser.json:2`).
- ✅ Names, rules and statistics remain DOM text; decorative art does not introduce nested buttons in hand/unit/power controls (`apps/web/src/features/match/Hand.tsx:111`, `Board.tsx:75`, `HeroInspect.tsx:73`). Fallbacks retain supplied Vietnamese labels (`ArtImage.tsx:21`). No catalog/core_v1, engine, API or gameplay-rule change appears in this diff.
- ⚠️ The repository records 96 distinct requests/prompts, 92 distinct bulk output paths and four prototype records. I reviewed the retained provenance and controller acceptance, not the original generation session itself. Initial RED outcomes are documented in the implementation report; the retained focused GREEN log is directly available. Subjective audio, Safari/iOS autoplay, real device performance and assistive-technology acceptance remain external gates (`docs/implementation/art-review.md:29`).

## Strengths

- The four final contact sheets show a coherent illustrated set: rounded ivory/jade GOOD characters versus angular charcoal/ember EVIL characters. The board-scale sheet makes all 47 alpha cutouts inspectable at gameplay sizes; the final desktop/tablet/mobile hero screenshots show the six corrected face crops. No rules text or wireframe substitutes were visible in the reviewed sheets (`docs/implementation/art-review.md:7`, `:11`; `evidence/task15/art-contact-1.jpg` through `art-contact-4.jpg`, `board-scale-contact.png`, `heroes-{desktop,tablet,mobile}.png`).
- Provenance and export work are reproducible from selected masters, with no network generation during export. Hash/byte checks and independent Pillow dimension/alpha inspection complement the TypeScript contract (`tools/assets/validate.ts:13`, `:99`; `inspect-exports.py:8`). Targeted manifest entries for both factions, a trick, power, token, cropped terrain, board, VFX and audio agree with the generator interfaces. Both shared atlas pages contain 47 frames and remain below 2048².
- Audio uses authored decoded buffers while retaining the existing event mapping and buses; disposal during asynchronous loading cannot populate buffers or start late voices (`apps/web/src/features/settings/audio-manager.tsx:164`, `:259`, `:317`; `apps/web/tests/audio.test.ts:140`). The retained signal evidence distinguishes objective measurements from listening acceptance (`docs/implementation/evidence/task15/audio-signal.json:2`).
- The React/UI changes are small integrations around a shared decorative image component. The existing GSAP presentation clock remains responsible for motion; no new animation timing system was added (`apps/web/src/features/match/rendering/vfx.ts:64`). The explicit hero image sizing resolves the loaded-state grid overflow (`apps/web/src/styles/assets.css:41`), although the failure state still needs I1.

## Issues

### Critical (Must Fix)

- None found within Task15 scope.

### Important (Should Fix)

**I1 — Hero image failure clips most of the retry target.**

- Location: `apps/web/src/styles/assets.css:8` (vertical fallback), `:21` (32px nonshrinking silhouette), `:27` (44px retry), `:34` (portrait clipping), and `apps/web/src/features/match/ArtImage.tsx:23`. The existing parent is an 80px grid slot (`apps/web/src/styles/deck.css:46`).
- On 404, the fallback needs 104px: 32px silhouette + 20px name + 44px retry + two 4px gaps. Grid automatic minimum sizing lets that child exceed the slot; overflow:hidden clips the bottom 24px of the retry button. Only 20px of its 44px box is visible and can receive a pointer hit. This affects the explicit error/retry flow and touch accessibility, even though Playwright can click the remaining portion.
- Focused verification: launched one temporary headless Chromium page with the actual tokens/shell/deck CSS and the reviewed assets.css extracted from the diff, using the exact An Nhiên fallback markup. No app server, API, database, build or test suite ran, and no screenshot/artifact was written. Measured portrait top=22/bottom=102/height=80; fallback top=22/bottom=126/height=104; retry top=82/bottom=126/height=44; visible retry height=20. Probe exited 0.
- Fix: keep the entire failure layout within the fixed slot, for example omit/rearrange the decorative silhouette in the compact hero fallback while retaining the Vietnamese name and full 44px retry button. Preserve independent retry activation and native radio selection.
- Regression: extend `tests/e2e/asset-fallback.spec.ts:31` while the image is still failed to assert the retry rectangle lies fully inside the portrait and its visible/hit-testable target is at least 44px. Existing visibility/click checks and the later successful-image bounds checks (`:90`) do not detect this clipping. Cover desktop and narrow hero cards without rebuilding unrelated runtime checks.

### Minor (Nice to Have)

- No additional Task15 finding. Existing NO_COLOR/FORCE_COLOR warnings remain visible in retained logs and are assigned to Task18; they are not pristine-output evidence. General low-height layout, bounded hover-resource behavior and device profiling remain Task16 responsibilities rather than duplicated Task15 defects (`docs/implementation/art-review.md:21`, `:35`).

## Verification and Coverage Limits

- Consumed the supplied `5bc6f3ed17f000f69db61c2c05d329c6d5ab9a83..e43501d` package in bounded passes. Reviewed all handwritten runtime/tool/test changes, generators and typed boundaries; sampled generated entries and representative exact prompts rather than dumping every generated manifest/prompt line. All 96 art subjects were visually reviewed in the four contact sheets; this was not individual full-resolution pixel inspection of every PNG.
- Viewed gameplay screenshots at desktop/tablet/mobile and reduced motion, the all-cutout sheet, and final hero screenshots. Reviewed prototype alpha measurements, 20-file signal audit, real WebAudio evidence, fixed-pool budgets and retained build/test logs. Gameplay screenshots cover representative units/hand/inspect/HUD and mobile fallback; they do not prove every card in a live match or every terrain expanded state.
- Retained evidence chronology is dev 6/8 then focused 2/2; first production 3/4; hero/audio follow-up 2/2; after two manually rejected hero crops, final 80px box correction received dev hero 1/1 plus screenshot review, final build, and production hero 1/1. This is incremental covering evidence, **not one fresh final 4/4 run** (`dev-browser.log:102`, `dev-followup.log:29`, `production-browser.log:46`, `production-followup.log:17`, `dev-hero-bounds.log:20`, `production-hero-final.log:16`, all under `docs/implementation/evidence/task15/`).
- Retained focused tests show 8/8 across three files (`focused-tests.log:5`), validator records success (`validator.log:1`), and typecheck/lint/build logs were read. The controller independently matched 60 recorded hashes plus BUILD_ID/routes with no mismatch (`.superpowers/sdd/2026-10-20-oathfront-implementation/task-15-controller-verification.json:3`). I did not rerun these suites, builds or hash audits.
- The recorded low pool is 1,531,376 encoded bytes / 10,132,544 RGBA bytes; high is 4,045,008 / 19,967,040. These are the fixed atlas/terrain/board pools, not total runtime memory (`docs/implementation/evidence/task15/asset-budgets.json:2`).
- Named focused lookups outside complete diff hunks: (1) the bundle/scene cancellation and failure ownership risk required the cut-off `BattleScene.tsx` setup/cleanup and `rendering/scene.ts` release/init context; no additional blocker found; (2) the 404 fallback's ancestor clipping required the existing hero portrait/radio CSS lookup, followed by the single offline layout probe above. No repository crawl, production edit, Git mutation, server, database, subagent or deployment occurred.
- Applied ui-ux-pro-max accessibility, touch, fixed-slot/loading, contrast, responsive and motion review, including its verified Content Jumping guidance; applied the React checklist to hooks, async lifecycle, image loading and semantic controls. The approved game design governs visual direction. Screen-reader, hardware listening and Safari/device gates remain unperformed.

## Assessment

**Task quality: Needs fixes.**

The asset production and runtime integration are coherent and backed by retained validation with honest limits. Fix the confirmed hero failure-state clipping and add its focused bounds regression before accepting Task15; no broader suite repetition or redesign is requested.
