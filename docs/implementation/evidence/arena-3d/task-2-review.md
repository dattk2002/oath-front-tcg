# Task 2 UI and React review

Reviewed the unstaged Task 2 changes against `docs/design/arena-3d-contract.md` and the implementation plan. Applied `ui-ux-pro-max` (keyboard focus, stacking, responsive interaction, reduced motion) and `vercel:react-best-practices`. Existing user-owned changes and renderer implementation were not reviewed or edited. No tests, browser, server, or port were started; root owns browser acceptance.

## Critical

None found.

## Important

1. **Fallback location details remain trapped beneath the inspector.** `apps/web/src/styles/arena-3d.css:100` gives fallback `.board` a positioned stacking context at z-index 2. Its terrain `details[open]` child at line 202 has z-index 45, but cannot escape that parent. The inspector is a sibling overlay at z-index 32 (line 685). Both are right-aligned at 16px, with the terrain disclosure starting at viewport header + 96px and the inspector at stage + 72px. Opening a revealed location while inspection is open therefore places almost all location content and its closing summary underneath the inspector on desktop. Raise the fallback board while its location disclosure is open, remove its unnecessary stacking context, or explicitly coordinate disclosures. Verify in WebGL failure mode by selecting a unit/card, then opening a revealed location, reading its content, and closing it without first dismissing inspection. The new tail rule raising ready-renderer `.terrain:has(details[open])` to 46 correctly addresses the original Three-ready version of this finding; it does not match fallback.

2. **Hero targets lose the approved 44px touch size on phones.** The compact `.hero-target` rule at `apps/web/src/styles/arena-3d.css:918` explicitly sets a 30px minimum height, and the portrait override at line 1499 sets 40px. Restore at least 44px for both hero target buttons. The earlier projected lane-size concern was calculated against the previous camera and is no longer an active finding: the camera is being updated in parallel to provide sufficient bounds. Root must measure final legal lane targets and confirm touch activation after that update; do not treat the old dimensions as current evidence.

## Minor

None recorded; no unrelated cleanup requested.

## Checked scope and limits

- React hooks remain unconditional; initial arena identity uses a lazy state initializer, matching the contract. No new effects, per-frame React state, command submission paths, or animation clocks were introduced by Task 2.
- The size gate is removed from both input disabling and automatic advance while existing connectivity, recovery, and pending-command gates remain.
- Native buttons retain legal-target serialization, keyboard activation, source labels, and cancellation. Inspector disclosure/close controls are independent and the overlay does not change `.board` geometry.
- Ready-renderer furniture hiding is conditional on both Three and ready attributes; semantic fallback markup remains present. Hand scrolling, full-text hand, powers, log, Settings, Pause and optional orientation hint remain reachable in code.
- Reviewed the existing 844 × 390 and 375 × 812 screenshots. They predate the latest HUD/stat/checkbox polish and must not be used as final visual acceptance. Root must refresh them, particularly to confirm portrait stat separation, final target hit testing, fallback, and overlay stacking after fixes.
- The two new component tests cover empty-inspector removal and player-relative HUD identity. They do not verify CSS stacking or pointer target dimensions; root browser verification is required for the two findings above.

## Closing review — root fixes

**Both important findings are fixed in the current code. No new critical or important finding.** The earlier findings above are retained as review history.

- `arena-3d.css:1564` now raises the fallback board to z-index 46 only while a terrain disclosure is open. This addresses the fallback parent stacking context; the separate ready-renderer terrain lift remains correct.
- The compact hero target rules at lines 918 and 1499 both now use `min-height: 44px`.
- The inactive command status at line 1550 has zero padding/minimum height and `pointer-events: none`; the condition is scoped to `data-active="false"`, so active retry/recovery controls remain interactive.
- Increased hand heights remain in the existing absolute composition and do not introduce a disclosure-dependent board reflow. Portrait HUD placement is offset with the taller hand. Final geometry, art fit, and lane targets remain subject to root's fresh browser capture.
- `MatchShell.tsx:70` preserves the native lifecycle/legal gate, while transient recovery uses `aria-disabled` plus the same click guard. This avoids disabling the focused native button on each transient poll and still prevents command submission while the hook reports disabled. No hooks or additional command path were introduced.

**Minor:** `MatchShell.tsx:74` currently renders `aria-disabled="false"` when the transient `disabled` prop is false, including when the native button is disabled by lifecycle/legality. Use `aria-disabled={disabled || undefined}` (or the complete disabled condition) to avoid conflicting native and ARIA state. This is not an important blocker.

This was a read-only code re-review; no browser/test/server was started. Root owns the running recapture and final runtime evidence.
