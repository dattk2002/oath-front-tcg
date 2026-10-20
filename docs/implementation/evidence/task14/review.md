# Task 14 review

## Spec compliance

**❌ Issues found.** The requested tutorial engine/API/settings/audio implementation is present, including both exact G07 branches, E01–E02, journaled scene loads, principal completion flags, registry pinning and the approved forward migration. One keyboard interaction violates the pause/settings behavior: Escape from settings opened inside the pause dialog also submits RESUME (`apps/web/src/features/settings/SettingsDialog.tsx:109`, `apps/web/src/features/match/PauseDialog.tsx:33`).

**⚠️ Cannot fully verify:** The legacy regression uses a checkpoint produced by the new code, not a retained pre-T14 initialization/journal resumed through the API (`apps/api/tests/tutorial.test.ts:135`). Static inspection supports unchanged SKIRMISH behavior, but that test alone does not prove the full historic replay/resume boundary. Physical touch, Safari/iOS autoplay, device audio output and subjective mix remain unverified. Authored/licensed audio belongs to Task 15; the current procedural tones are explicitly temporary. Interactive/Neon migration rollout and production deployment are outside this task's authorization. Real Google acceptance remains prior controller/user evidence, not a fresh Task 14 provider check.

## Strengths

- `packages/game-engine/src/tutorial.ts:79`, `:211`, `:330`, and `packages/game-engine/src/actions.ts:307` separate trusted setup, authoritative progress predicates and allowlists from ordinary engine action resolution. Scene loads preserve identity/event/root counters and emit a labeled tutorial event; no damage/mana override was introduced. Tests assert the fixture's exact HP, energy, shield and reserve outcomes instead of changing expected values to match implementation.
- `packages/game-engine/src/replay.ts:53` describes scene loads with scenario, scene, ordinal and manifest version. `apps/api/src/matches/tutorial.ts:35`, `initialization.ts:64`, and `repository.ts:82` reject mismatched registry bindings at creation and reads; the public replay entry reads that verified record before auditing immutable initialization. Conditional checkpoint fields avoid adding tutorial defaults to SKIRMISH hashes.
- `apps/api/src/matches/service.ts:66` retains the active-match check under the existing principal transaction. Completion updates at `:281` select the correct independent flag with COALESCE. The API tests traverse both scenarios with repeated receipts and reload after commands, audit full replay, assert tutorial history exclusion and verify skip does not set flags (`apps/api/tests/tutorial.test.ts:17`, `:167`).
- `packages/db/migrations/0003_tutorial_result.sql:1` changes the result constraint forward, allowing NONE only with TUTORIAL_COMPLETED. `apps/api/src/matches/results.ts:104` emits that result only for completed tutorials and preserves other lifecycle mappings. The existing immutable content release is untouched.
- `apps/web/src/features/settings/SettingsDialog.tsx:42`, `audio-manager.tsx:218`, and `BattleScene.tsx:59` implement trusted-gesture unlock, separate gain buses, device preferences, hidden/pause suspension, disposal and event-driven SFX. The retained Chromium evidence records no context before gesture and real AudioContext behavior afterward, rather than relying solely on mocked audio units.
- `apps/web/src/features/tutorial/TutorialOverlay.tsx:18` scopes and cleans GSAP motion, honors reduced-motion preferences, and leaves guidance in normal document flow. Settings and tutorial actions use semantic Vietnamese controls. The reviewed screenshots show readable settings at desktop/mobile, visible G02 energy/card highlights, an explicit block choice, and the supported small-screen fallback without horizontal clipping. The known battle fold-height work remains Task 16.
- `apps/web/src/features/deck/DeckBuilder.tsx:126` contains the authorized narrow saved-status follow-up; the explicit pause focus selector avoids selecting the newly added Settings button. Evidence clearly distinguishes the original production artifact from the bounded follow-up artifact.

## Issues

### Critical

None found.

### Important

1. **Escape from nested settings resumes the paused match.** `apps/web/src/features/settings/SettingsDialog.tsx:109` calls preventDefault and onClose but does not stop propagation. When rendered inside `PauseDialog` at `apps/web/src/features/match/PauseDialog.tsx:92`, React propagates the synthetic cancel event to the parent's `onCancel` at `:33`, which submits `{ kind: "RESUME" }` at `:36`. A user trying only to dismiss settings therefore resumes gameplay and audio, and any pending automatic work can continue. If the pause confirmation is open, the same event unexpectedly clears that confirmation instead.

   A single in-memory Chromium component probe using the actual PauseDialog, SettingsDialog and keyboard helper reproduced `calls: [{"kind":"RESUME"}]` after Pause → Settings → Escape. RecoveryControls was stubbed only to remove unrelated session dependencies; no server, DB or application state was used. The existing real-audio E2E closes nested settings with the close button (`tests/e2e/tutorial-settings.spec.ts:319`), so its passing result does not cover this path.

   Stop cancellation propagation in the child dialog, guard the parent's handler against descendant cancel events, or render the dialogs as siblings. Add one focused regression that presses Escape in nested settings, verifies the match remains PAUSED with audio suspended, and verifies focus returns to the pause dialog's Settings button. Only an explicit subsequent Resume/Escape on the pause dialog should resume.

### Minor

1. **Historic compatibility coverage is weaker than the requested boundary.** `apps/api/tests/tutorial.test.ts:135` creates a fresh SKIRMISH with current `createMatch`, computes its current hash, then checks a decode round-trip. This detects unwanted inserted tutorial fields but cannot catch a change applied consistently to both current creation and hashing, and exercises neither an old journal nor API resume. Retain one baseline-generated initialization/checkpoint/journal fixture and expected hash, then cover replay plus a resumed command without regenerating the expectation from the new implementation. This is a coverage gap, not an observed SKIRMISH regression.

2. **A tutorial result exposes an internal card ID.** `apps/web/src/features/tutorial/tutorial-controller.tsx:27` displays “GC02 còn 1 HP” after E02. Use “Kỵ Sĩ Lá còn 1 HP” so the result identifies the same card name the learner sees on the board.

3. **Recorded browser output is not pristine.** `playwright.config.ts:28` runs the fixture under inherited environment settings; both retained production browser logs report the existing NO_COLOR/FORCE_COLOR warning. This does not invalidate the results, but keep it recorded as harness noise and normalize the conflicting flags in a suitable harness maintenance task. Intentional offline network failures are distinct from this warning and are not treated as new application defects.

## Focused checks and evidence

- Reviewed `review-f2dbfac..b05c3c8.diff` for BASE `f2dbfac73f6698725781f9ab55649964cad348b8` through HEAD `b05c3c8f958c960a38827b82d284c4af73e49358` in bounded passes. The generated Drizzle snapshot was assessed structurally by its 15 tables and constraints, including the changed result constraint; it was not treated as handwritten runtime code. Read the task brief/rulings, global constraints, OATHFRONT, TUTORIAL, R19, AC35 and implementation report.
- **Registry/replay propagation risk:** the diff did not include the complete replay caller. Inspected `apps/api/src/matches/repository.ts:199` and unchanged `apps/api/src/matches/replay.ts:15`; replay calls verified readRecord, then regenerates immutable initialization and compares final state/events. Also inspected the omitted transition consistency check at `repository.ts:239`, which retains immutable deck/version validation.
- **Nested native-dialog keyboard risk:** inspected unchanged `apps/web/src/features/match/keyboard.ts:36`, then ran the single focused component probe described above. Its initial in-memory bundle attempt could not resolve React from the workspace root; correcting only the resolve directory to apps/web allowed the same probe to run. No test suite, production build, dev server or DB operation was run, and no probe files were written.
- Applied ui-ux-pro-max's targeted “focus not obscured” guidance and accessibility/touch/responsive/motion checklist. Inspected `settings-desktop.png`, `settings-mobile.png`, `tutorial-tablet.png`, `tutorial-mobile.png`, `tutorial-energy.png`, and `tutorial-block.png`. Read `audio-browser.json`: previous context closed, current context running, music 0/SFX approximately .6, two sound starts, restored preferences, and no captured page errors.
- Read retained `workspace-test.log`: **565 passed / 1 failed** on the retired tutorial-rejection expectation. Read `commands-final.log`: **6/6 passed** after its narrow test correction. The full workspace suite was not rerun and is not represented as all-green.
- Read `m4-production-browser.log`: **12 passed / 1 failed**, with the saved-draft status defect explicitly recorded. Read `m4-production-followup.log`: **4/4 passed**, covering the saved/unsaved/uncertain-save paths and audio/pause focus on the rebuilt UI. Read both production build logs and final typecheck/lint logs; they contain successful recorded results. No fresh reviewer build/typecheck/lint success is claimed.
- Read `controller-verification.json`: controller independently matched **368 source hashes and 2,288 artifact hashes**, zero mismatches. This is accepted controller evidence, not a duplicate hash audit. The controller's subsequent documentation/evidence packaging is outside the reviewed commits and does not change runtime/artifacts.
- No Git state changes, application/source edits, protected runtime access, migration, deployment or external mutation were performed. The only checkout write is this review report.

## Assessment

**Task quality: Needs fixes.** The deterministic tutorial and persistence paths are coherent and supported by substantive engine/API/browser evidence. Fix the confirmed nested-dialog cancellation defect before accepting Task 14; the remaining findings are bounded coverage, copy and harness-noise follow-ups.
