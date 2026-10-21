# Final whole-redesign review

Reviewed range: `a2fcad91c32463d8c5ed2fc6b795e6ed97d40f42..60d3a8d356e355970bc8946be6d303e3ddbbb092`.

## Strengths

- English copy is an ID-keyed presentation layer with safe fallbacks and explicit preservation of custom names. The range does not change `packages/game-content`, `packages/game-engine`, `packages/bot`, `packages/contracts`, or production API source. Recovery strings and preset/history display boundaries received meaningful regression coverage.
- The six heroes, shared arena and sixty cards form a coherent original illustrated theme. Source/provenance and runtime derivatives are separated; the exporter checks distinct masters, real alpha and bounded outputs. The resolver retains the existing interface and a fixed complete public pool: one quality atlas, all eight terrain strips and the shared board. Each quality atlas contains the expected 47 hero/unit/token frames.
- GSAP remains the choreography owner. The new linear cue uses the same 40% damage beat as the existing commit, keeps the 80ms anticipation offset and duration caps, and has bounded/disposable Pixi numbers and geometry. DOM image-decode ownership, interrupted reveal cleanup, native focus handling and resumed stored card feedback are addressed explicitly.
- The Pen handoff honestly remains `awaiting_design`. Its source identity and actual design bindings are null, while 36 component relations can represent repeated origins, instances and overrides. The checker independently pins screen/component/viewport coverage and does not pretend to validate a nonexistent design.
- Integration reporting retains the initial 82 passed / 4 failed / 2 skipped production result and the subsequent affected 4/4 plus 1/1 reflow/axe checks. Physical performance, balance, human/device/provider and production acceptance are still visibly open.

## Issues

### Critical — must fix

None found.

### Important — should fix before delivery

1. **The compact ten-card hand clips the newly exposed unit stat text.**

   **Location:** `apps/web/src/styles/rivals.css:1079` and `:1102`; regression coverage at `tests/e2e/responsive.spec.ts:51`.

   **Root cause:** The compact rule gives every hand card a fixed `28px minmax(0, 1fr)` grid and `32px 28px` rows. With ten cards at the supported 1024×640 viewport, the hand is about 784px wide and each card is about 71.19px. After padding/borders, the stat summary gets only a 19.19px column beside the 28px art. `1 ATK / 2 HP` wraps to four lines in a 28px row. The existing responsive test measures the card rectangle, not its text children.

   **Evidence:** The committed `docs/implementation/evidence/rivals-redesign/browser-initial/task16/battle-1024-640.png` visibly loses the bottom of these summaries. A focused isolated Chromium DOM probe using the current CSS files, local Noto/Barlow fonts and actual ten-card hand markup reproduced it without an application server or database: card bounds were `71.1875 × 88`, computed columns were `28px 19.1875px`, summary bounds were `top 46 / height 56 / bottom 102`, and the last text line ended at `103`, outside the card bottom `88`. This also explains the HP text lost at the screenshot's viewport edge.

   **Consequence:** Players cannot read the full printed HP from the compact hand. Selecting a hand card does not provide a visual workaround for printed stats: `InspectPanel.tsx:75` renders printed/current stats only for an already-deployed `unit`, while the hand-list text contains rules rather than stats. This violates the spec's requirement that stats remain legible at the supported compact size.

   **Fix:** Give compact summaries enough width/height for the complete ATK/HP information, for example by using a full-width stat row and reducing/hiding decorative hand art at the dense breakpoint. Preserve ten cards, the 44px minimum target, gaps, legal selection and the visible End phase action. Extend the existing compact regression to check rendered summary/text bounds within each card and viewport, rather than only parent rectangles. Check a long card name and a trick summary as part of the same focused layout verification.

### Minor — nonblocking

1. **The future Pen instructions conflict with the preserved Escape behavior.**

   **Location:** `docs/design/pen/OATHFRONT-PEN-PROMPT.md:104`; related current summary at `docs/implementation/rivals-redesign-qa.md:18`.

   The prompt says Escape must follow existing behavior and “must never submit a game action,” but `PauseDialog.tsx:39` intentionally submits `RESUME` on Escape when allowed. The QA table also broadly says Escape closes dialogs, while `ResultDialog.tsx:175` intentionally prevents that dismissal. These are existing semantics preserved by the ruling and the input-parity tests. A future designer could interpret the new blanket wording as a requirement to change them. Describe the actual per-dialog behavior, including pause resume, cancellation of its confirmation step, and the result dialog's explicit exit actions. Do not change runtime behavior to satisfy the mistaken wording.

2. **The unknown-route regression checks a home slogan that is no longer rendered.**

   **Location:** `tests/e2e/match-foundation.spec.ts:236`.

   `not.toContain("Every lane is an oath.")` cannot catch accidental home content because the implemented headline is `FIVE LANES. ONE OATH.`. The HTTP 404 assertions still provide useful coverage, so this is not a routing blocker. Update the content sentinel to the actual home markup or current headline while retaining the status/content-type checks.

3. **Deferred Task 3 duplicate inspect/cutout exports remain a low-impact optimization.**

   **Location:** `tools/assets/export-fivefold-cards.py:176` and `:184`.

   Unit inspect and cutout both export the same 512px composition/settings under distinct URLs. This duplicates repository bytes and cache identities when both variants are visited. Sharing an export URL would remove the duplication, but it does not affect correctness or the complete bounded battle preload. It is safe to defer; no asset regeneration is required for the Important fix.

## Review coverage and evidence

- Inventoried the supplied 568-file package: 87 source/test/config entries, 20 current-document/contract entries, 408 art/source/export entries and 53 archived-evidence entries. Read executable/config/test changes and current document changes in bounded passes; reread affected sections where larger tool output was truncated. Generated manifests/contracts were also inspected through structured field/ID/relationship summaries. Repeated numeric frame samples and duplicate generation metadata were sampled rather than claimed as exhaustive byte-reading.
- Applied the code-reviewer template, UI/UX Pro Max accessibility/interaction/reflow checklist and React review guidance. Inspected current desktop hero and desktop/compact battle captures plus representative unit/trick contact sheets. The controller's documented individual review of all sixty masters and six heroes, targeted GC03/V02 corrections, and prior export/browser evidence remain the exhaustive asset-production evidence; this review did not repeat all image generation or independently certify every master pixel.
- Reviewed the current ledger's rulings and deferred items. Task 2 license/guest-response notes are fixed. Task 4 stored focus/hover resumption is fixed in the final `sync` handler and has focused browser evidence. Task 5 protected-port wording is fixed. Task 6 component relationships and independent coverage sets are fixed. The Task 3 duplicate export note is explicitly nonblocking above.
- Focused outside-diff reads were limited to integration questions: existing CSS around compact sizing/visibility to distinguish parent bounds from stat overflow; `InspectPanel`/hand-list behavior to establish whether clipped stats had a visual alternative; reduced-motion observer/dialog helper to check lifecycle/focus contracts; stable catalog/location definitions to compare presentation semantics; project instructions and the metadata/report paths needed for review. No unrelated application investigation was performed.
- Fresh review probe: isolated Playwright Chromium `setContent` with current CSS/local fonts and ten `Hand`-equivalent cards at 1024×640, reporting DOM and text-range bounds. It made no service/API/DB calls and wrote no screenshots or fixture files. Its exact measurements are recorded in Important 1.
- No previously reported broad tests, build, asset exporter, inspector, database resetter or browser suite was rerun. The 121-test/typecheck/lint and production-build/browser results are reviewed implementation evidence, not fresh claims made by this reviewer. Existing production captures and the focused geometry probe were sufficient to identify the missing child-text check.
- HEAD was confirmed as `60d3a8d356e355970bc8946be6d303e3ddbbb092`; checkout status showed only the pre-existing user-owned `apps/web/next-env.d.ts` change. No branch/index/HEAD change, application edit, server start/stop, persistent cookie operation, push or deploy was performed. This ignored report is the only written file.

## Recommendations

Address Important 1 in the coherent final fix wave and include the small documentation/test corrections if convenient. The compact CSS correction changes the pinned `rivals.css` input; the Escape documentation correction also changes pinned `rivals-redesign-qa.md`. Reconcile the Pen repository baseline and hashes deliberately after the fix, preserving `awaiting_design`, null actual design fields and `implementationReady: false`. A scoped review plus the affected compact interaction/text-bounds tests is appropriate; the finding does not justify rerunning engine/balance/hardware suites or regenerating art.

Before final delivery, update current milestone/release-tail wording only to reflect actual completed review/push/CI results. Do not replace initial failures with an invented all-green original run or clear any external release hold.

## Declined to judge

- Actual Pen source/schema/node validity or design readiness — no `.pen` exists, and the approved task explicitly completes at the honest pending handoff stage.
- New physical-device/AT/Safari/Edge/audio-perception acceptance or physical frame p95 — these require external measurements; the existing release holds remain open and are not satisfied by screenshots or this DOM probe.
- Gameplay/bot rebalance and human playtest acceptance — immutable gameplay is outside this presentation change; the documented balance and human acceptance holds remain open.
- Hosted deployment, real production OAuth callback/merge/logout acceptance and post-push CI success — no deployment or provider exercise is authorized for this review, and the controller has not yet performed the final push/CI step.
- The uncommitted user-owned `apps/web/next-env.d.ts` content — excluded from the exact delivered commit range by the dispatch; preserved untouched.
- Immediate native dialog dismissal without a decorative exit animation — accepted by the explicit spec ruling; not treated as missing motion.

## Assessment

**Ready to merge/deliver? With fixes.**

The redesign is cohesive, maintains the gameplay/asset/security boundaries, and has substantial focused and integrated evidence. Fix the confirmed compact hand stat overflow before delivery; the remaining findings are nonblocking. This verdict is technical delivery readiness for the scoped redesign, not production release approval.
