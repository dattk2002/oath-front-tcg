# Courtyard bounded release review

Date: 2026-10-23. Scope: final root integration, shared HUD/fan/direct interaction and measured camera across the four existing arenas, authored Moonroot material loading and disposal, and the final hand resize-focus cleanup. Read-only application review; only this report was written. No API, protected user files, branches, commits, or remote state changed.

## Verdict

**No Critical or Important finding. The bounded release integration is approved, with one small source-switch cleanup noted below.** This review respects the user's relaxed art requirement and does not reopen the prior art gate or request another visual iteration.

## Minor: cancel a pending card move when choosing a reserve power

`MatchScreen.tsx:340–343` selects a reserve power without `cardDrag.cancel()`. After the first drop of a combined UNIT_AND_LANE card, selecting a power therefore leaves the old pending move, outlined unit and destination buttons active. `Board.tsx` prioritizes `cardDrag.dropOnLane()` for those destination clicks, so the old movement can still complete after the visible source selection changes. Hand selection already cancels that transient state.

Small fix: call `cardDrag.cancel()` immediately before the reserve button selects the power. This was sent to the root integration owner. Ordinary power targeting and NONE casting are otherwise retained. This finding is established by the current handlers and state lifetime; no new browser reproduction was run.

## Integration checks

- `MatchScreen`, `BattleScene`, `InspectPanel`, and `MatchShell` share one interaction surface. The renderer publishes it after readiness, nulls it before cleanup, and the hook cancels on renderer epoch changes. The callback is stable, avoiding effect restarts caused by callback identity.
- `directCast` removes only the old Inspector confirmation. Board still exposes the semantic NONE Cast action for selected cards and reserve powers, including text-board mode; targeted actions still use the existing controller. The separate block-response Use/Keep flow and tutorial action handler remain unchanged.
- Text fallback retains semantic unit, lane, hero and NONE targets. It does not manufacture raycast geometry. Failure/retry releases the surface, restores authoritative presentation, and preserves explicit text-board opt-in and recovery.
- The declared `groundcover` role reaches the generic material application, including its real texture, alpha cutoff and sidedness. Late model/texture cancellation and idempotent per-mount ownership remain intact. Scene disposal removes the owned authored group before the remaining scene teardown.
- The hand ResizeObserver re-scrolls only a focused hand card when the hand viewport changes and disconnects on unmount. The previous focus issue now has a narrow browser assertion requiring the same focused card plus outline allowance to remain within the hand without scrolling the document. GSAP listeners/tweens retain their existing cleanup.
- Prior resolved interaction and layout review findings were not reopened. No contract/API change is needed for these client paths.

## Evidence and limits

Fresh reviewer probe (`pnpm exec tsx -e`, exit 0) loaded the actual shipped low Moonroot GLB using the runtime loader and current manifest, with injected in-memory texture objects: one merged groundcover mesh had a map, `alphaTest=.38`, and `DoubleSide`; all four texture owners disposed and closed exactly once even after repeated disposal. The same probe exercised the real intent controller with a legal untargeted reserve power: selecting it and choosing NONE sent exactly one unchanged USE_POWER action. The only process output besides that result was tsx's Three CJS deprecation warning.

Inspected existing run artifacts: `layout-verified.log` records 10/10 courtyard cases; all eleven current `*-result.json` files, including the separate four-arena case, record `passed`; `focus-resize-green.log` records the focused layout case passing; `four-arena-smoke.json` records eight desktop/portrait combinations with readable/clear targets, no document overflow and no browser errors. These are inspected existing evidence, not fresh reviewer-run browser tests. Root's reported 178 web tests, 38 focused tests and production build were not rerun.

No broad tests, new development server, art review loop, or physical-device performance run was performed. This review does not expand the release beyond the four existing arena identities.
