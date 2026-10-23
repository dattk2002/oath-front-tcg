# Courtyard and direct card dragging

## Delivered scope

Moonroot uses an authored high/low 3D courtyard with pale paving, an open arch, a carved relief, roots, ferns, groundcover and water channels. The user explicitly relaxed perfect concept fidelity; the stylized relief remains. No external head mesh was integrated. Cinder, Glasswater and Astral retain their existing distinct procedural 3D scenes and use the same new HUD, camera framing and input.

Cards can be dragged directly from the fanned hand onto legal slots, units, heroes, lanes or the central cast region. Unit-and-lane tricks take two drags and submit only after the destination drop; enemy moves use the enemy row. Invalid, stale or interrupted drops send nothing. Existing server legality, command receipts, energy and game rules are unchanged.

Hero medallions, resource indicators and a phase orb sit around the field. The actual camera fits cards into measured space clear of the hand and HUD. Its projection also drives semantic targets and ray picking. Keyboard/tap alternatives, native horizontal hand scrolling, reduced motion and explicit WebGL recovery remain.

The source Pen SHA-256 remains `a696b32daf6e03d4bfe30b825a56cfc4fdd622cc1a3c3ff8b018c70bc20903b3`. See the [current design contract](../design/courtyard-contract.md) and [Pen extension](../design/pen/design-contract.json).

## Asset verification

| Quality | Model triangles | Model batches | Selected model and maps |
| --- | ---: | ---: | ---: |
| High | 155,081 | 18 | 6,291,056 bytes |
| Low | 47,833 | 18 | 2,593,980 bytes |

Four maps require approximately 17.33 MiB decoded with mipmaps. Strict GLB validation, UV/material checks, source hashes and deterministic authoring checks passed. Model batches/triangles are distinct from whole-scene GPU counts, which also include cards and shadow passes. This is not an FPS guarantee.

Original generated material inputs, exact prompts and conversion parameters are preserved in `assets/source/arenas-v2/materials`. Runtime maps and GLBs live under `apps/web/public/assets/arenas-v2`. No concept screenshot is used as the playable floor.

## Verified behavior

- Final ten-case Chromium browser suite passed: mouse deployment, invalid drops, targeted trick, untargeted cast, two-stage enemy movement, native upward touch, native horizontal scrolling through ten cards, keyboard parity, responsive layouts and a real API deployment.
- The real API case verified one command, one revision increment, the exact card on the board, source removal and one energy spent. Test database fixtures were isolated; production matches were not used by these checks.
- The 1/5/10-card matrix covered 1440×900, 844×390 and 375×812. Card/slot minimum bounds were 118.9×136.2, 46.2×51.8 and 47.9×60.7 px respectively. No card/stat/HUD/fan collisions or document horizontal overflow remained.
- A focused follow-up fixed a partially clipped focused hand card after viewport resize. The matrix passed again with focus identity unchanged, the entire outline visible and no page scrolling.
- One bounded four-arena smoke passed all eight desktop/portrait views and one exact deployment per arena, with no browser errors. This verifies shared presentation/input, not new authored models for the other three arenas.
- Runtime/interaction, responsive layout and final integration reviews found no remaining Critical or Important issue. Final review's reserve-selection cleanup was applied: selecting a power or inspecting another unit cancels a pending card move.
- All 178 frontend tests passed when run from the repository root. An earlier package-directory invocation failed seven existing asset-path checks because they resolve paths relative to the repository root; no asset was missing. Root workspace typecheck and lint passed. Hosted-profile Next production build passed.
- All fourteen pre-existing tracked user changes remain byte-identical and excluded from the release commits. Source Pen bytes are unchanged.

Earlier failed runs remain in local evidence: they exposed real HUD occlusion, fan clipping, focus loss after resize and a landscape reduced-motion override. Two acceptance adjustments followed measured behavior: NONE uses the actual projected cast position, and software-WebGL multi-drag/convergence waits have bounded longer timeouts without weakening command/revision assertions. The final relevant checks passed; the full ten-case suite was not repeated after the final focus-only follow-up.

Compact evidence is in [evidence/courtyard](evidence/courtyard). Broader historical reports remain under the ignored local `.superpowers/sdd/2026-10-23-courtyard` directory.

## Release and limits

Implementation commits: `b2723a2` (assets) and `9b3ce83` (runtime, HUD and input). Vercel deployment `dpl_GMBWjHd6Znat9LTLkwjkWVFrzm5L` for release `2e08dcefdc5b33015fd3546945508533a9cf0f1d` is READY and assigned to `https://oathfront.vercel.app`, verified through MCP. Production browser verification loaded the exact shipped Moonroot model and all four material maps. The public DTO fixture passed desktop, landscape and portrait layout checks and context-loss/retry with no browser errors. The fixture used production product JavaScript and assets, but mocked match data; it is not a database-flow test.

A separate fresh live guest match reached the new UI/WebGL-ready state and accepted mulligan. A 20-second state-read request then timed out before the drag was attempted. The cause is undetermined; the live production drag remains unverified. No gameplay command was rejected. Cleanup surrendered the fresh test match once and confirmed terminal state. No existing user match was touched. The exact-command/energy/revision drag flow passed against the isolated real API locally. See [production observations](evidence/courtyard/production/courtyard-smoke.json).

Physical-device GPU performance, Safari and real assistive-technology certification remain unverified. Moonroot is a functional stylized interpretation, not a claim of exact v3 or commercial AAA art parity. Further art refinement and authored replacements for the other three environments are separate work.
