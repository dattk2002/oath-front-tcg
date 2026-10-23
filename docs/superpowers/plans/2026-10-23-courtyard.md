# Courtyard implementation plan and completion record

**Goal:** Deliver the approved Moonroot direction, compact HUD, fanned hand and direct legal card dragging across the four existing arenas.

**Authority:** [Current contract](../../design/courtyard-contract.md). The user later relaxed perfect Moonroot art fidelity. New authored models for the other three themes are deferred; their existing distinct 3D geometry remains.

## Constraints

- Preserve game rules, public wire contracts, source Pen bytes and all fourteen pre-existing tracked user changes.
- Real geometry and ordinary material mapping; no projected concept screenshot as a floor.
- Shared anchors: card 1.7 × 2.35, floor y .36, lane x `(lane − 3) × 2.4`, rows z ±2.05.
- GSAP owns motion; semantic keyboard/tap paths, reduced motion and explicit WebGL recovery remain.
- Drag submits current legal actions exactly once. Invalid/stale/interrupted drops submit nothing.
- Root owns dependency changes, integration, Git commits/push and deployment. No paid service or plan change.

## Milestone 1 — Moonroot assets

- [x] Generate and inspect purpose-built limestone, bark, fern and groundcover maps with provenance.
- [x] Export deterministic high/low geometry with real arch, relief, roots, paving and channels.
- [x] Verify UVs, maps, hashes, bounds and budgets; inspect actual neutral/textured renders.
- [x] Stop further face refinement after the user's explicit clarification. Current art is stylized; exact v3 parity is not claimed.

Commit: `b2723a2`. High 155,081 model triangles and 6,291,056 selected bytes; low 47,833 and 2,593,980 bytes; approximately 17.33 MiB decoded textures.

## Milestone 2 — Renderer and direct interaction

- [x] Load only the selected model/quality; cancel obsolete loads and dispose owned resources.
- [x] Share the actual camera between rendering, semantic projection and legal-identity ray picking.
- [x] Provide visible slot/unit/lane/cast feedback and a stable drag camera.
- [x] Implement direct unit/trick/NONE play and two-stage unit-and-lane movement, including enemy owner rows.
- [x] Preserve idempotency, current-revision validation, interruption cancellation and keyboard/tap alternatives.
- [x] Resolve independent interaction review findings and verify exact command behavior.

## Milestone 3 — HUD, hand and responsive framing

- [x] Integrate hero medallions, resources, phase orb, fanned hand and preview.
- [x] Fit the card envelope into measured space clear of HUD/hand/orb; keep the canvas full stage.
- [x] Correct fan clipping, focus bounds, compact stat positioning and reduced-motion overrides.
- [x] Verify 1/5/10-card hands at desktop, landscape and portrait, native upward dragging and horizontal scrolling.
- [x] Fix focused-card visibility after viewport resize with a focused follow-up check.

Runtime/input commit: `9b3ce83`. Final ten-case browser suite passed; the later focused resize matrix passed without repeating all ten flows.

## Milestone 4 — Four-arena shared behavior

- [x] Retain distinct existing Cinder, Glasswater and Astral geometry.
- [x] Verify all four arenas at desktop and portrait with ready canvases, clear readable targets, phase controls and one exact valid drop per arena.
- Deferred: replacement authored GLBs and further environment-art refinement for the other three themes.

## Milestone 5 — Verification and release

- [x] Independent runtime/interaction, responsive-layout and final integration reviews.
- [x] All 178 frontend tests from repository root; workspace types/lint and hosted-profile Next production build.
- [x] Real API deployment test: exact unit, one command, one revision increment and expected energy change.
- [x] Update derived Pen/design contracts, retain original source hash and compact evidence.
- [x] Verify protected user files and create scoped asset/runtime commits.
- [ ] Push the complete release to the authorized main branch.
- [ ] Verify the ready Vercel production alias, real asset load and user-visible interaction; record release evidence.

Physical-device FPS, Safari and real assistive-technology certification remain separate. Historical failed runs and their corrections are recorded in [the implementation report](../../implementation/courtyard.md).
