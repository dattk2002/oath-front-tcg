# OathFront courtyard and direct-drop contract

## Authority and scope

The user approved Moonroot v3 as the visual direction: Master Duel spatial composition with Runeterra-inspired fantasy scenery, existing OathFront cards, compact hero HUDs, a fanned hand and a phase orb. On 2026-10-23 the user clarified that Moonroot does **not** need perfect artistic fidelity. Playability and completing the release take priority over further sculpture refinement.

This is a derived extension of the frozen Pen source, not a new Pen frame. It supersedes the earlier raised-plinth composition, fixed camera coordinates, hand-row layout and confirmation-first card interaction where they conflict. The original `.pen` bytes and node mappings must remain unchanged.

Moonroot receives authored high/low GLB scenery. Cinder Foundry, Glasswater Sanctum and Astral Causeway retain their existing distinct real 3D environments in this release and share the new framing, HUD and interaction. They must not be described as newly authored GLB environments. Further environment art is separate from this functional release.

## Battlefield presentation

- Moonroot must have a broad pale stone courtyard, open stone arch, roots, plants, carved relief and water channels. The current relief is stylized; exact equivalence to the concept is not a release requirement.
- Cards and slots must keep the shared world anchors: lane x = `(lane − 3) × 2.4`, own z = `2.05`, opponent z = `−2.05`, floor y = `0.36`, card size `1.7 × 2.35`.
- Architecture must stay outside the playable rectangle. Scene textures must not contain baked cards, HUD, text or the concept's perspective.
- Rendering and ray picking must use the same camera. That camera must fit the lifted card envelope inside the measured area left clear by the hand, hero HUDs and phase control. The canvas must still fill the stage.
- Hero HP, energy current/max, block charge/usage and hand/deck/power counts must remain available. The hand must retain existing card artwork, cost, name, unit/trick distinction, current stats and centered rarity.
- Hero, hand and phase controls must not cover any card or legal empty slot. All five lanes must remain playable at 1440×900, 844×390 and 375×812. Full-text hand, powers, log, settings, pause and account controls must remain reachable.

## Direct card play

The renderer provides presentation and picking only. Current public `legalActions`, the intent controller, command receipts and server state remain authoritative.

| Source | Drop behavior |
| --- | --- |
| Unit | Release on a legal empty friendly slot to send one existing `PLAY_UNIT` action. |
| Targeted trick | Release on the permitted unit, hero or lane to send one `PLAY_TRICK` action. |
| Untargeted trick | Release on the projected central cast region with target `NONE`. |
| Unit-and-lane trick | Drop onto a permitted unit, then drag the outlined unit to its destination. The first drop must send no command. The final drop must use the selected unit's owner row, including enemy movement. |
| Invalid or interrupted drag | Return the preview and send no command; spend no energy optimistically. |

Pointer, pen and upward touch dragging are primary. Horizontal hand scrolling and pinch zoom must remain native. Keyboard and tap source→target paths must remain available, including a semantic Cast button at the actual projected cast position. There must be no separate confirmation step for ordinary card drops.

The drag must cancel on stale revision or legality, source removal, pending recovery, pause, offline/hidden state, open dialogs, pointer cancellation, renderer replacement/failure, Escape or unmount. A completed pointer drag must suppress its synthetic click without swallowing a later keyboard activation.

Allowed unit targets must have visible perimeters above the rendered card. Lane feedback must cover the actual legal lane band. Invalid drops must not snap to a nearby slot. HUD, dialogs and disclosures must block drops through them.

## Motion and accessibility

GSAP owns visual timelines and ambient clocks. Pointer previews use refs and imperative updates rather than React rendering for each movement. Dragging settles presentation and holds the camera steady. Compact fields below 220 px high keep the camera steady during cinematic cues so targets remain usable; card and effect motion may continue.

Reduced motion must remove camera movement and decorative continuous motion, preserve clear static target feedback and keep the hand readable. Focus must be visible and focused hand cards must remain reachable after viewport changes. Projected interactive targets must be at least 44 px in the verified layouts.

WebGL failure must show explicit recovery with **Retry 3D** and **Use text board**. The text board is an intentional accessible fallback, not a silent replacement for failed 3D. Retry must own only one renderer and clean up the previous interaction surface.

## Assets and lifecycle

The `arenas-v2` manifest identifies selected-arena model variants, material maps, hashes, bytes, bounds and landmarks. Original image inputs, prompts, derivative parameters and geometry tools must remain traceable under `assets/source/arenas-v2` and `tools/assets/arenas`.

The runtime must cancel obsolete loads and dispose model geometry, materials, textures, decoded bitmaps, observers and GSAP owners. It must load only the selected arena. Color textures must not be reused as invented height/bump maps.

Budgets remain high ≤160,000 model triangles / 45 draw calls / 8 MB selected asset download / 72 MiB decoded textures, and low ≤60,000 / 30 / 3 MB / 20 MiB. Report model counts separately from rendered counts that include shadows and cards. These budgets are not a physical-device FPS guarantee.

## Acceptance and evidence

Functional acceptance must cover valid and invalid unit drops, unit/NONE/combined tricks, native touch drag and horizontal scrolling, keyboard parity, ten-card reachability, renderer recovery and all four existing arena identities. A real API test must confirm one command, one revision increment, the expected energy change and the deployed card.

Verification status and remaining device/art limits belong in the implementation report. Concept approval alone must never be reported as browser verification, deployment or exact visual parity.
