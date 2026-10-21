# Task 4 — owned GSAP choreography and comic effects

## Outcome

Implemented the approved motion direction on authorized `main`, based on `c166b2f07edd9ec1afb42f87a7ed433b866e2793`. No engine/content/contract/API/auth/transport changes, dependency changes, new art, branch, worktree, push or deployment. Root explicitly confirmed immediate native dialog dismissal instead of a delayed visual exit; its spec clarification is included in the DOM-motion commit.

- A shared `useUiMotion` hook owns its GSAP context, OS preference listener, hidden-document listener, pending hero-image load/error/decode and fine-pointer parallax handlers. It reveals home copy/actions and framed portraits in 480ms, hero art/name together in 300ms with a 25ms power stagger, panels/dialogs in 240ms and phase labels in 180ms. Selection and controls remain immediately usable. No per-frame React state, timer choreography, CSS keyframes, WAAPI, scroll pin or idle particle loop.
- Hero art is decoded before its reveal starts. The current name, selected radio and controls are immediately usable while artwork loads. A rapid selection, route unmount, setting/OS change or hidden tab reverts the prior context, removes pending image listeners and prevents a late decode from restarting the abandoned reveal.
- Settings, pause, result and block surfaces use the shared owner. Native open/focus/Escape/close/focus restoration remain unchanged and immediate. Phase motion acknowledges existing authoritative phase changes without submitting commands or altering event clocks.
- Card feedback keeps one reversible tween/context per live card, now combines pointer/focus state, uses a small lift/tilt and resets immediately on OS reduction or hidden document. Existing scene teardown on game-setting changes reverts it. MutationObserver removal and complete listener cleanup remain intact.
- Seven deterministic Pixi families now have distinct monochrome silhouettes: wedge/speed lines, faceted shield, curved leaves/seed, prism shards/rays, tapered flames/sparks, broken seal/tethers and paired crescents. The palette mirrors named `--fx-*` tokens; immutable family definitions are untouched. Geometry is bounded and uses cached anchor bounds per draw.
- Draw/deploy use angular card traces; movement translates the sprite with a veil afterimage; attack retains EVIL-first anticipation with GOOD 80ms later; damage uses directional traces, local bursts and outlined numbers; death has four local fragments; signature frames the existing hero portrait. Actual `.hero-hud-art` geometry is preferred, falling back to `.hero-target`, so names/HP stay readable.
- Event durations, commit callback locations, controller interfaces/cursors, transport isolation, >2s fast-forward, pause and reconnect behavior remain unchanged. Cue progress is now linear: travel arrival and impact/number appearance agree with the existing damage commit at 40%. Signature remains 550ms. Reduced motion has a static footprint and brief opacity acknowledgement, with no travel/zoom/jitter/parallax. Number objects are reused for their active packet and destroyed on clear/dispose; low-quality renderer behavior remains unchanged.

## Red/green and verification

1. Added the focused damage-clock regression in `apps/web/tests/rivals-motion.test.ts`. RED: at 121ms of a 300ms damage cue, the commit had happened but eased visual progress was 0.325356, below the 0.4 impact threshold. GREEN after linear progress with unchanged duration/commit time and timeline-level rendering after cue updates.
2. New browser lifecycle test was RED because the home headline never had an intermediate transform. GREEN after the shared owner was integrated. Samples record actual intermediate transforms/opacity, not merely final DOM presence.
3. Delayed first-time Morrow image regression was RED: delaying its request beyond the old reveal duration produced no loaded, translated Morrow frame. GREEN after the load/decode boundary and canceled-owner guard. The refreshed `hero-intermediate.png` includes Morrow, and samples include the loaded image while its transform is nonzero.
4. Responsive frame sampling found 7px temporary overflow at compact width from moving the outer home art stage. Moving only the inner portraits fixed that surface. A subsequent 4–6px mobile overflow came from an outward roster-art reveal; translating the actual art/name inward removed it without clipping controls or changing layout. Final compact/mobile frame sampling records zero horizontal overflow.
5. The first updated resource-unit run had four failures because the existing external Pixi mock lacked the newly imported `Text` class. Added a resource-tracked Text double at the same WebGL boundary, then added a real-scene lifecycle check proving two packets allocate only two labels across repeated draws and release both on clear. All resource tests pass again.

Commands/results:

- `pnpm exec vitest run apps/web/tests/rivals-motion.test.ts apps/web/tests/presentation.test.ts apps/web/tests/vfx.test.ts` — final run: **3 files / 16 tests passed**. Includes shared HP/order, normal/reduced equivalence, pause/fast-forward, signature dispose, backlog, transport isolation, actual scene teardown/error paths, terminal dim, label cleanup and real Pixi geometry bounds/static reduced footprints for all seven families.
- `pnpm --filter @oathfront/web typecheck` — passed.
- `pnpm exec tsc --noEmit` — passed, including e2e TypeScript.
- Changed TS/TSX/tests ESLint — passed. Changed motion/rendering/token/e2e Prettier check and `git diff --check` — passed; final helper/test formatting was applied before the last type/lint check.
- `OATHFRONT_E2E_API_PORT=3121 OATHFRONT_MOTION_EVIDENCE_DIR=.superpowers/sdd/2026-10-21-oathfront-rivals-redesign/task-4-evidence/battle pnpm exec playwright test tests/e2e/rivals-motion.spec.ts tests/e2e/motion.spec.ts` — initial focused run: **6 passed** (five existing battle scenarios plus the new DOM lifecycle scenario). These exercise actual WebGL readiness, signature interruption/remount, keyboard fast-forward, reconnect, normal/reduced five-lane damage and log equivalence, failed renderer retry, and event families.
- After adding real intermediate holds and the delayed-image fix, the targeted `--grep 'home and roster|actual WebGL signature|combat shares.*normal'` run passed **3/3**. The signature and damage hold use the existing visibility-pause path; they do not extend animation budgets or change production clocks. Existing command-count assertions stay 4, and both HP values update on the shared beat.
- Final `OATHFRONT_E2E_API_PORT=3121 pnpm exec playwright test tests/e2e/rivals-motion.spec.ts` — **2/2 passed** after the inward roster reveal. Covers desktop delayed-load/rapid selection, real intermediate DOM samples, fine-pointer parallax then hidden reset, game/OS reduction, immediate native modal focus/dismissal, and 1024×640 / 375×812 motion overflow checks. Page and console errors were empty in the lifecycle and battle scenarios.
- A small ignored one-off Pixi/Playwright preview script rendered the actual `drawEffect` implementation for all seven normal/reduced families into `effect-families.png`. This is a geometry review artifact, not a performance benchmark or gameplay simulation.

## Visual evidence and self-review

Evidence directory: `.superpowers/sdd/2026-10-21-oathfront-rivals-redesign/task-4-evidence/`.

I inspected the refreshed screenshots: `hero-intermediate.png` shows loaded Morrow during the shared reveal; `battle/canvas-signature.png` and `battle/signature.png` show local leaves/seed, crest and travel trail around portrait anchors; `battle/combat-impact-intermediate.png` shows both −2 numbers and kinetic bursts together with both lane-1 HP values at 4. Remaining lanes retain 6 HP. Unit names and stat plates remain readable. `effect-families.png` confirms seven distinct silhouettes and restrained static reduced counterparts. The home/hero compact/mobile screenshots retain readable English controls and complete portrait framing. `dom-motion-samples.json` records actual intermediate DOM transforms/opacity.

UI review used gpt-taste within the approved game direction, then ui-ux-pro-max reduced-motion/timing guidance and accessibility/touch/performance checklist. No new target sizes, semantics, focus order, reading order or layout hierarchy were introduced. Text fade starts were raised to keep labels readable. Motion uses transform/opacity; geometry is cached per draw, card tweens are bounded, and no motion callback submits an intent. React review checked stable refs/effect dependencies, canceled asynchronous decode ownership, no conditional hooks and no frame-driven React renders. Exact diff review found no immutable content, IDs, numeric rules, backend, environment or dependency edits.

## Limits and environment

These are focused development Chromium/WebGL probes, using API 3121 and UI 3200 with the existing isolated verification DB; full production build/full browser flow, 200% reflow, physical device/touch/Safari/p95 and human playtests remain Task 5/release gates. The held intermediate captures include intentional pause time and must not be interpreted as latency/performance measurements. No physical benchmark improvement is claimed. Native dialogs intentionally have no delayed exit animation, per root's spec clarification.

Playwright stopped its owned fixture servers. User ports 3000/3001/3100/3101/3300 and the interactive DB were untouched. Task-generated `apps/web/next-env.d.ts` changes were restored before staging. The report, preview script and screenshots remain in the existing ignored `.superpowers` evidence directory.

## Commits

- `fc402a1` — `feat(web): choreograph Fivefold screens with owned GSAP motion` (includes root's native-dialog spec clarification).
- `5a7e843` — `feat(web): add synchronized comic combat accents and cleanup`.

Both commits are local; no push/deploy. Final fixture-port check showed no listeners on 3121/3200/3201. After task-generated `next-env.d.ts` was restored and before the final commit completed, the user started `node scripts/local-auth.mjs` on UI3000. The file changed again at 16:51:01 to `.next-interactive/dev/types/routes.d.ts` and `root-params.d.ts`. That new user-owned generated change is deliberately preserved and excluded from both commits. It is the sole remaining tracked working-tree modification; root was notified.
