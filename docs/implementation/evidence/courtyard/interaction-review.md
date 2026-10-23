# Courtyard interaction/runtime review

Date: 2026-10-23. Read-only review of the current working tree and root integration, including the new files omitted from `runtime-review.diff`. No application code, protected user files, branches, commits, or external state changed.

## Verdict

**Final scoped re-review: spec PASS; quality APPROVED for the reviewed interaction/runtime changes.** Both Important findings and both minor findings below are addressed. No new Important defect was found in the fixes. The original findings are retained as review history; current resolution evidence is recorded in the final section. Integrated product/browser acceptance remains owned by the root agent. This is not visual acceptance of the authored environments or a claim of v3 parity.

## Original Important findings — both addressed

### 1. Enemy movement destinations are assigned to the friendly row

- `apps/web/src/features/match/card-drop.ts:63` always creates a pending movement SLOT with `side: view.self.side`; `:94` then rejects every other side. `use-card-drag.ts:421` and text-board fallback `drag.ts:107` repeat that assumption.
- This is a supported current game case, not a speculative future action. S07 / **Misstep** is `MOVE_ENEMY` (`packages/game-content/src/core/cards.ts:1826`); the engine enumerates destination emptiness using the selected unit's owner (`packages/game-engine/src/targets.ts:91-100`). Its English rule explicitly says “on its owner's side.”
- Reproduction using the actual resolver: with self GOOD, selected unit EVIL in lane 2, and a legal combined destination of lane 4, first drop returns MOVE, but `allowedDropHits` produces `SLOT(GOOD,4)`. Releasing over `SLOT(EVIL,4)` returns null; releasing over `SLOT(GOOD,4)` returns SUBMIT. A valid enemy-row drag therefore cancels, while the displayed destination can be the wrong or occupied friendly slot. The server action remains legal, but the direct interaction does not represent it.
- Derive the destination row from the selected public unit and use it consistently in allowed hits, final resolution, semantic completion/fallback, and placement feedback. Cover allied and enemy movement for both self orientations, including a destination with a friendly occupant and empty enemy slot.

### 2. Unit-target feedback is drawn inside/below the card body

- `apps/web/src/features/match/rendering/three/interaction.ts:251-257` places a UNIT outline at `SURFACE_Y + .025 = .385`, with the same 1.7 × 2.35 footprint as the card. `:321-324` puts its hovered ring at `.430` with outer radius `.77`. Both materials retain `depthTest: true`.
- The settled card body is centered at `.400` with height `.075`, so its top is `.4375`; the face is at `.441` (`three/scene.ts:60`, `:264`, `:627-628`). The UNIT ring fits wholly within the card footprint and is below the opaque body top. The outline is also within/below that body. A direct Three-object probe confirmed these generated y values, sizes, and depth settings.
- This removes the intended visible valid-unit/hover indicator for targeted tricks and the first combined-target drop. `prepareDrag()` clears ordinary selection (`intent-controller.ts:159`), so the ordinary Board `data-legal-target` highlight does not compensate. The pointer status text remains, but users are told to choose a highlighted target which is not visibly marked.
- Raise unit feedback above the displayed card face, or use an explicit depth-independent overlay/perimeter treatment. Retain correct elevation for empty slots and lane/cast surfaces; verify a populated scene with multiple legal and illegal unit targets while dragging.

## Original minor findings — both addressed

- **Lane feedback does not show the picked lane band.** The LANE picking surface is 2.05 × 6.45 (`three/interaction.ts:60-66`), but the allowed outline is only 2.05 × .95 (`:253-257`) and the hover affordance is a small central ring. Align the visual band with the legal region so dropping over a unit at either end of the lane is discoverable. The allowed-identity ray filtering itself is correct.
- **Click suppression can survive cancellation into a later keyboard activation.** Drag start sets `suppressed.current = true` (`use-card-drag.ts:352`); `cancel()` does not clear it, and only a new successful pointerdown or `consumeClick()` does. Escape/pointer cancellation without a synthetic click can therefore cause the next keyboard activation of a hand/unit button to be swallowed once (`Hand.tsx:153`, `Board.tsx:93`). Scope suppression to the completed pointer gesture/click, while preserving protection against a synthetic click after pointerup.

## Inspected strengths and scope

- The UI derives allowed actions from current public `legalActions`; the final release/submit boundary re-reads the store, rejects stale revision/source/action fingerprints and pending commands, and retains the existing intent controller's final action equality and idempotency protection. No optimistic board/energy mutation was found.
- Raycasting uses dedicated plane geometry and the measured board/camera. Filtering legal identities before returning ordered intersections avoids a UNIT swallowing a legal underlying LANE/SLOT. Outside geometry is not snapped.
- The hook owns transient drag and combined pending state. Camera hold, pointer capture/release, GSAP return cleanup, source/revision/legality/disabled/renderer changes, Escape, visibility, offline, dialogs and unmount are handled. The surface callback is nulled before renderer release and republished after readiness.
- Tap/keyboard source → target remains available through ordinary intent selection. Combined pending drag also exposes semantic destination buttons; untargeted actions have a semantic Cast button. Hand arrows/Home/End and full-text details remain. The root removes the obsolete Inspector confirmation path.
- Touch policy is set before pointerdown: hand uses `pan-x pinch-zoom` with upward intent detection; a selected combined-move unit uses `pinch-zoom` and accepts movement in either direction. These are code checks, not physical-device gesture acceptance.
- New preview is pointer-transparent and aria-hidden, with separate textual live instructions. Visible validity text avoids relying solely on color. Hero and phase controls retain semantic buttons and a final 44px hero-target minimum.
- Selected-arena loading, cancellation after parse/decode, per-URL texture ownership, map detachment, bitmap closure, picker/feedback geometry disposal, renderer disposal and GSAP tween cleanup were inspected. No additional concrete current-resource ownership defect was found. Generic unsupported future GLB payloads were not treated as findings.
- Reduced-motion paths cover hand lift, return tween, camera/card cues and ambient clock. Responsive layout, visual contrast, focus obstruction and actual gesture dispatch require the root's ongoing integrated browser pass.

## Evidence and verification limits

Read the approved spec, runtime/UI reports, runtime diff and current integration/new source. Applied `ui-ux-pro-max`, including its targeted `dragging movements` guidance and accessibility/touch/performance review checklist; used `verification-before-completion` for evidence discipline.

Executed one read-only `pnpm exec tsx -e` probe against the actual resolver and Three feedback constructors. It exited 0 and reproduced the enemy-row rejection/friendly-row acceptance and unit-feedback heights above. No production file was edited, no browser/server was started, and no broad test suite was rerun. Existing implementation report test results were read as reported evidence, not independently claimed as fresh review passes. Integrated pointer/touch/keyboard, context-loss/retry and viewport checks remain with the root agent. Asset geometry/visual quality is under separate review.

## Final scoped re-review — 2026-10-23

Reviewed only the fixes, associated tests, appended implementer reports, and new runtime captures for regressions relevant to the four findings.

| Finding | Status | Re-review evidence |
| --- | --- | --- |
| Enemy movement uses friendly row | Addressed | `movingUnitOwner`/`moveDestination` derive the selected unit's row. Allowed hits, final resolution, `dropOnLane`, and text-board fallback all use it. Board destination buttons publish the owner-side slot metadata for existing projection and label the row. Focused tests cover allied/enemy movement for both self sides, with an occupied friendly/empty enemy destination in the enemy cases; correct row submits and wrong row rejects. |
| Unit feedback occluded by card | Addressed | UNIT perimeter is now 1.82 × 2.47 at y=.49, above the .441 face, with depth testing disabled and render order 100. UNIT hover brightens the perimeter and no longer draws an interior ring. The inspected `runtime-evidence/moonroot-unit-target.png` shows both hovered and idle permitted unit perimeters among seven cards; unrelated units remain unmarked. |
| Lane feedback too short | Addressed | LANE outline now matches the full 2.05 × 6.45 pick band. The inspected `runtime-evidence/moonroot-lane-target.png` visibly spans both rows. The feedback regression asserts the full band. |
| Cancelled drag swallows keyboard click | Addressed | Shared click guard always permits `detail=0`; ordinary cancellation resets suppression, while completed pointer releases preserve suppression for their following pointer-generated click. Hand/Board pass the click event. Focused regression covers cancellation, keyboard activation after completion, and consuming only one pointer click. |

Fresh reviewer verification: `pnpm exec vitest run apps/web/tests/card-drop.test.ts apps/web/tests/courtyard-renderer.test.ts -t 'moves an enemy|retains allied|never swallows|keeps unit target'` exited 0: **6 passed, 20 deliberately skipped**, across 2 files. No broad suite, typecheck, or browser run was repeated. Root's reported broader tests and typecheck remain separately reported evidence. No application/protected files changed during this review; only this review artifact was updated.
