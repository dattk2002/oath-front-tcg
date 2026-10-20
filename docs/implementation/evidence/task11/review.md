### Spec Compliance

- ❌ Issues found: the pause modal strands exact-command retries when a pause/resume/surrender request has an unknown outcome. The only retry control is outside the native modal, while pending state disables its internal controls (`apps/web/src/features/match/MatchShell.tsx:119`, `PauseDialog.tsx:26`, `use-match.ts:251`). This blocks the T11 no-input/state/reconnect-blocker gate.
- ✅ The remaining task-scoped implementation matches the brief and its boundary ruling: independent scanned history and presentation cursors; monotonic server snapshots; non-modal explicit block decisions; retained-summary result/history detail; exact-source rematch; keyed match remount; pointer/keyboard/drag parity; and the three carried T09 fixes. Evidence references appear below.
- ⚠️ Cannot verify from this diff alone: Task10's complete backlog-over-two-seconds policy, GSAP disposal/reduced-motion implementation, backend private-state projection, and the exhaustive legal-action rules live in unchanged code. The provided motion/import-boundary evidence supports their integration, but this review does not recertify those implementations. Safari, real touch devices and assistive-technology testing remain disclosed external gates. Task12 exact-source builder continuation and Task13 full history/auth remain explicitly outside this task.

### Strengths

- `apps/web/src/features/match/recovery.ts:10` fixes the snapshot boundary before scanning, advances across empty private pages, rejects non-progressing cursors, and recovers the retained suffix after expiration. `view-store.ts:69` rejects regressive revision or sequence while allowing historical event enrichment. `apps/web/tests/recovery.test.ts:14` and `:104` exercise independent cursor progress and retained suffix recovery.
- `apps/web/src/features/match/use-match.ts:111` scopes recovery to its mounted instance; `apps/web/src/app/App.tsx:140` keys each match runtime. `tests/e2e/full-match.spec.ts:189` holds an old snapshot across in-app rematch and verifies a clean, usable new mulligan after release. This meaningfully covers the cross-match stale-async handoff.
- `apps/web/src/features/match/BlockResponse.tsx:43` derives USE/KEEP exclusively from legal actions, offers explicit KEEP without a target, and uses Escape only to cancel selection. `tests/e2e/block-recovery.spec.ts:15` checks one PowerGranted and lane continuity through reload/reconnect, with both heal-before-Volcano and keep-before-Volcano outcomes against the disposable database.
- Carried T09 fixes are implemented and covered: `Hand.tsx:46` recognizes hand-referenced trick actions; `HeroPanel.tsx:31` and `MatchScreen.tsx:155` preview the resolved hero action; `intent-controller.ts:61` contains storage exceptions while retaining the exact envelope. Coverage: `tests/e2e/input-parity.spec.ts:124` and `apps/web/tests/intent-controller.test.ts:182`.
- `apps/web/src/features/match/ResultDialog.tsx:110` uses retained rematch data unchanged and reuses the pending create ID/body. Its result-detail path never invents an expired PlayerView. `tests/e2e/full-match.spec.ts:157` proves committed-response loss, reload and identical retry; the drift test at `:127` proves zero replacement POSTs. The explicit retained-source review panel complies with the controller's Task11/Task12 ruling.
- `apps/web/src/features/match/keyboard.ts:36` preserves native modality while adding scoped forward/backward wrapping and cleanup. `tests/e2e/input-parity.spec.ts:8` covers normal pause confirmation, Escape and restored trigger focus. The saved desktop/tablet/mobile block and mobile-result screenshots are legible, preserve the five-lane board/fallback, and show visible focus. The review applied ui-ux-pro-max's error-recovery and focus guidance.
- `tests/e2e/input-parity.spec.ts:58` verifies all three input methods produce the same exact public PLAY_UNIT action, plus a 5px non-drag; `apps/web/src/features/match/drag.ts:2` establishes the 6px threshold and validates the DOM target through the browser schema.

### Issues

#### Critical (Must Fix)

- None found within this task scope.

#### Important (Should Fix)

1. **Uncertain commands become unrecoverable inside the pause modal.** `apps/web/src/features/match/PauseDialog.tsx:26`, `:54`; `apps/web/src/features/match/MatchShell.tsx:119`; `apps/web/src/features/match/use-match.ts:251`.

   Reproduction from the control flow: enter PAUSED, submit RESUME, and lose the request before the server applies it. The controller retains the exact envelope as UNCERTAIN. `disabled` remains true because a pending command exists; Escape cannot resume, and the resume/surrender buttons are disabled. The only “Thử lại yêu cầu” control is rendered after the children in MatchShell, outside the `showModal()` dialog, so native modality makes it inert to both pointer and keyboard. Polling the still-PAUSED server does not resolve or clear the pending command. Reload restores the same envelope and modal, reproducing the trap. A lost PAUSE response that later recovers a PAUSED checkpoint can reach the same state. Snapshot-recovery errors also hide their explicit retry behind the modal.

   Render the shared pending/error status and exact-envelope retry/reconnect controls inside the active pause modal, or provide an equivalent reachable recovery surface while preserving modality and avoiding a newly generated RESUME command. Add one focused browser case: abort RESUME before commit, verify keyboard/pointer retry from inside the modal sends the identical body/ID, then verify resume and trigger focus restoration. Cover the analogous paused recovery failure through that same recovery surface. Existing normal-pause and lost-block tests do not exercise this intersection.

#### Minor (Nice to Have)

1. **Rematch storage failure warning is overwritten on the failure path where it matters most.** `apps/web/src/features/match/ResultDialog.tsx:117`, `:153`.

   When sessionStorage rejects the pending create, the UI first tells the user to keep the page open. If the create also has an unknown outcome, the later catch replaces that warning with the ordinary retry message. In-memory retry remains correct, but reloading then loses the exact request. Preserve a durability flag and include the no-reload limitation in the uncertain-result message, as the intent controller already does. A focused component/unit case with throwing storage and a rejected create can cover this without repeating full games.

### Verification and scope

- Read the brief, appended handoffs/ruling, global constraints and `docs/OATHFRONT.md` before the report and diff. Reviewed the supplied `fc8b8b8..b8f94d4` diff in sequential chunks; one truncated MatchScreen output segment was recovered. No changed runtime file was separately reread and no broader source crawl was performed.
- Inspected existing evidence, without executing tests: `final-test.log` confirms 46 files/518 tests before the bounded focus fix; `final-focus-web-tests.log` confirms 8 files/38 tests afterward. `red-foundation-live-revision.log` records 28/29 production cases, followed by 4/4 foundation cases in `green-foundation-live-revision.log`. This is combined coverage, not a claimed single 29/29 invocation.
- `final-integrity-summary.json` records 162 unchanged original build artifacts and only the documented foundation test source change after the final build. `final-browser-artifact-scan.json` records zero specified private-marker hits. Parsed all 20 final test-wide console artifacts: zero unexpected errors. The disclosed earlier failures remain historical investigation evidence; no broad rerun was warranted.
- Visually inspected `final/block-desktop.png`, `block-tablet.png`, `block-mobile.png`, `result-mobile.png` and `version-review.png`. These support the listed responsive/readability checks; they cannot establish every dynamic error state or physical device behavior.
- No test probe was necessary for the blocking finding: the native-modal placement, pending disabling, persisted restore and absent in-modal retry are explicit in the reviewed diff. No Git mutations, source edits or remote writes were performed; only this requested review report was written.

### Assessment

**Task quality:** Needs fixes.

**Reasoning:** Server authority, history recovery, rematch provenance and the carried T09 corrections are well structured and meaningfully covered. The pause modal's missing reachable recovery path blocks M3 because a transient command failure can leave a durable pending action with no usable retry.
