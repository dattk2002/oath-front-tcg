# Task 1 review — changes requested

Reviewed the supplied Task 1 brief, report, staged owned diff (base `3cdf300`) and dimensional battlefield contract. This is a static spec/compliance and code-quality review of renderer, reducer extraction, lifecycle, rarity sharing and bundle guards. No implementation changes, commits, test reruns or subagents. CSS/DOM composition remains Task 2; real-browser acceptance remains Task 3.

## Important — fix before proceeding

### 1. Paused fast-forward leaves stale cinematic pixels and hit geometry

- **Location:** `apps/web/src/features/match/rendering/three/scene.ts:573`, `:787–791` (also scheduling guard at `:73`).
- **Trigger:** Present an attack/damage/signature cue away from its endpoint, pause the renderer, then fast-forward/clear the presentation while still paused. This is a supported controller path: `apps/web/src/features/match/motion/presentation-controller.ts:92–101` calls `stop()` / `scene.clearEffects()` and then `scene.applyView(view)` without resuming. It can occur through Jump to current board while disconnected/paused, paused backlog recovery, or a reduced-motion preference change while paused.
- **Cause and impact:** `clearEffects()` clears `current` and calls `draw()`, but `draw()` immediately returns when `paused`. `applyView()` changes and publishes semantic state while `schedule()` also refuses paused work. The old zoom/shake/lunge frame and `--project-*` bounds therefore remain until `setPaused(false)`. A new/moved unit can have current semantic content with stale or missing projection, and the visible camera does not return to its stable base state. This violates the explicit immediate reset requirement for skip/recovery and the shared camera/DOM targeting contract.
- **Requested correction:** Provide a one-shot settled-state refresh for clear/fast-forward while preserving pause (no resumed animation/ticker). Ensure the final current view, camera, visible cards and projections agree. If hidden-tab rendering must stay suppressed, update the projection/reset state and arrange the settled frame before visible interaction resumes. Add a focused lifecycle regression for present → pause → clear/fast-forward, checking exact base camera and current target geometry without resume.

## Minor

### 2. Resource disposal ownership is duplicated

`apps/web/src/features/match/rendering/three/scene.ts:246–250` calls `disposeObject(s)` and then disposes the sprite map and material again, although `environment.ts:361–383` already handles both. Likewise card texture disposal at `scene.ts:191–192` and `:675–680` is followed by generic traversal disposal of the same texture. Three resource disposal is normally tolerant of this, so this is not a gate blocker, but it obscures ownership and makes lifecycle counters less useful. Prefer one owner per GPU resource while retaining the card helper's image-callback cancellation.

### 3. Layout tests do not cover the renderer's amplified cinematic bounds

`apps/web/tests/arena-3d.test.ts:57–73` checks the base `cinematicPose` helper only. `three/scene.ts:591–608` amplifies it by 1.35/2.7 and adds damage shake. The resting projection tests consequently cannot detect cinematic clipping/target overlap or regressions in the actual reset path. This is an explicit remaining acceptance area, not evidence that current cinematic bounds are broken. Cover actual final camera poses in a focused check, and retain browser verification at the required viewport sizes.

## Spec and code-quality assessment

- The reducer and interface extraction is behavior-preserving in the supplied diff, with compatible legacy exports retained.
- Arena selection uses public state and retains the initial key through the React ref. Revealed terrain materials read only revealed identities. No renderer command/legality calculation was introduced.
- Both faction orientations share world anchors and the same camera for rendering/projection. The stable union of resting and maximum-hover bounds is a reasonable explicit tradeoff to prevent hover oscillation. Exact polygon clipping is optional in the brief. Screen-space stats, minimum target sizing and viewport fit still require Task 2/3 validation.
- All four environments contain distinct geometry/material/light treatments, raised paving and bounded static batching. High quality has one shadow-casting directional light; low quality disables shadows, reduces stars and caps DPR. Real device cost remains unmeasured.
- Card faces use existing scene artwork, current presented public HP/ATK, shared approved rarity shapes/palette, and token cost/rarity exclusions. Missing art has a meaningful painted fallback. Image callbacks and delayed font repaint have disposal guards.
- Async initialization checks cancellation/disposal; the scene becomes active only after a successful render. Context loss removes renderer/projection activation, releases resources, disposes the controller through the callback and synchronizes authoritative fallback state. Retry remounts the canvas. No additional concrete async/context-loss blocker was identified by static inspection.
- Ordinary runtime rendering is demand-driven through existing cue progress and owned hover tweens. Observers exclude renderer-owned styles, and detached targets are pruned. Per-frame DOM queries/allocation and actual GPU performance remain browser/device acceptance concerns rather than demonstrated defects.
- The bundle guard retains the private-state/compiler exclusions and existing size budgets, rejects Pixi inputs/runtime `new Function` generators, and requires Three. Dependencies are pinned as specified; retaining the legacy factory/package does not itself load a concurrent renderer.

## Verdict

**Changes requested: one important lifecycle issue must be resolved before Task 1 passes its gate.** The architecture otherwise fits Task 1's scope. Reported tests were deliberately not rerun; their results remain implementer/controller evidence, not independent review verification. No browser/visual acceptance is claimed.

## Focused follow-up review — approved

Reviewed only `task-1-fix-review.diff` and the report's follow-up evidence against the three findings above. No tests were rerun and unchanged areas were not reopened.

- **Important finding 1 resolved:** `three/scene.ts` now permits explicit settled draws while paused. `clearEffects()` resets the cue and draws synchronously; paused semantic notification synchronizes cards and draws the latest view. Mutation/resize observers queue a coalesced settled refresh so targets mounted after notification receive current projection. The normal `present()` pause guard and paused hover/tweens remain intact. The added real-renderer/controller browser regression exercises the reported signature → pause → fast-forward failure, current HP/moved unit, a newly mounted target, rejection of further paused presentation and disposal. The report records RED with the stale cinematic camera and GREEN with exact base camera/current projected state without resume. This directly addresses the original defect.
- **Minor finding 2 resolved:** Card texture maps are detached before the card helper disposes its texture and callbacks; generic graph disposal no longer sees those textures. Label cleanup now relies solely on `disposeObject` for texture/material disposal.
- **Minor finding 3 resolved:** `cameraForCue` contains the actual amplified signature/attack camera and damage shake, and the renderer calls that helper. Added tests inspect the resulting target bounds/order, both camera directions, four viewport shapes, exact endpoint matrices and both reduced-motion inputs. The report records six focused unit tests passing.

**Updated verdict: approved for the Task 1 gate; no unresolved findings from this review.** Task 2 UI integration may proceed. This approval is based on the inspected correction and supplied targeted RED/GREEN evidence, not an independent test rerun. Complete composition, interaction, responsive visual acceptance and device performance remain Task 2/3 work.

## Closing renderer review — approved (2026-10-23)

Scope limited to the responsive camera / playable-corner guard changes in `three/layout.ts` since `9482a4c`, the updated/new camera tests, and confirmation of the two material-minor fixes in `c301fd4`. No tests, browser sessions, implementation edits or broader renderer/environment review were performed.

- **Fit guard:** Checks a fixed 32 corner positions per call (two extreme lanes, both rows, four corners, two lift endpoints). Cinematic camera construction calls it twice, so at most 64 corner projections per construction; cost does not scale with DOM targets, effect count or geometry. This is a small bounded CPU/allocation addition with no GPU resource work or extra animation clock. For the current centered perspective projection, dividing zoom by the largest normalized X/Y excess scales all checked projected corners inside the padded bounds without iterative fitting.
- **Projection consistency:** The final fitted camera is returned to the existing shared render/project caller. The guard updates the projection matrix after changing zoom. It does not introduce a separate DOM camera or alter world lane geometry. The portrait orbit and short-landscape pose preserve near/far ordering; the endpoint tests retain the desktop camera-position assertion.
- **Reduced motion and exact return:** `cameraForCue` starts from a newly constructed/fitted base camera, multiplies its existing zoom rather than replacing the fit, and uses the zero cinematic pose for reduced motion/endpoints. The expanded existing test compares complete world/projection matrices with the base at both endpoints and for both reduced-motion inputs. Reported seven focused tests passed; this result was not rerun independently.
- **Coverage:** Added viewport cases cover taller/shorter portrait stages and short landscape. The new test measures the resting/hover-union target dimensions in both rows/all five lanes at the selected phone sizes, with a 44px minimum. The guard deliberately fits resting/hover card corners, not every transient summon/lunge pose or outer architectural prop; final cinematic images and complete UI interaction remain the controller's acceptance scope.
- **Earlier material notes closed:** `c301fd4` applies `y - h / 2` in side-face UV sampling and adds a separate bump-texture disposal counter/assertion. Both prior minor notes are resolved.

**Closing verdict: approved; no new blockers or important findings in this scoped change.** Root-reported workspace typecheck/lint/build and 116 frontend tests remain controller verification evidence. Final camera images and responsive integrated acceptance remain outstanding with the controller; this review does not substitute for them.
