# OathFront dimensional battlefield contract

> Current extension: [courtyard and direct-drop contract](courtyard-contract.md). The user approved Moonroot v3, direct dragging and compact HUD/fan composition, then explicitly relaxed perfect art fidelity on 2026-10-23. The current extension supersedes the historical fixed camera, raised-plinth, hand-row and confirmation-first requirements below. Earlier implementation measurements remain historical evidence.

## Approved direction

The user explicitly chose Master Duel as the table/camera reference, existing Runeterra-inspired card faces and OathFront identity; real 3D environment geometry; cards lying on the board with readable floating stats; strong cinematic camera movement; landscape-first phone play with usable portrait and low quality. They authorized Three.js or PixiJS. All four existing arena identities must remain. These choices supersede the old flat battle layout and the 1024×640 interaction restriction, but never change game rules or API behavior.

The user must be consulted before introducing a different UI reference or visual direction. The source Pen file remains frozen; this is an explicitly authorized extension with no invented Pen nodes. The existing card-scenes contract continues to govern illustration, frame anatomy and rarity.

Reference: user-supplied Master Duel screenshot and [official Master Duel site](https://www.konami.com/yugioh/masterduel/us/en/). OathFront keeps its names, systems, rules, typography and palette.

## Composition

The arena must occupy the main viewport. It must show a three-dimensional raised platform, a readable pair of five-card rows, a location band between them, steps/edges and environmental props outside the playable area. The player is near the camera and the opponent is farther away regardless of faction. Lane 1 remains on the left; the five-lane combat order remains unchanged.

Hero portraits/HP/energy/block must become compact floating HUDs rather than two full-width bars. The enemy HUD occupies the upper side and the player HUD the lower side. Current numeric values and the complete accessible labels must remain available. Hand cards stay in a screen-space row along the bottom, with a larger artwork area on desktop and portrait; touch scrolling and keyboard navigation remain usable. The phase action remains a prominent reachable control on the right. Settings, Pause and Account stay reachable without obscuring battle content.

There must be no permanently empty inspector sidebar. Selecting a card/unit opens a bounded overlay with exact rules, forecast, cancel and applicable confirmation; desktop uses a side overlay and phones a scrollable sheet. It must not move the board or target coordinates. Battle log, full-text hand, powers and location details remain reachable as disclosures. Blocking choices, mulligan and tutorial controls must remain fully usable and take precedence over decoration.

## Four environments

| Arena                 | Retained identity                             | Required dimensional treatment                                                                   |
| --------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Moonroot Conservatory | Moonlit overgrown stone, teal lanterns        | Raised weathered paving, broken steps, roots/foliage at edges, stone columns and lanterns        |
| Cinder Foundry        | Industrial iron, basalt and lava              | Riveted metal/basalt platform, inset glowing lava channels, grates, pipes and furnace structures |
| Glasswater Sanctum    | Pale stone, gold/silver, blue water/crystals  | Pale stepped floor, inset water, crystal clusters and gold-trimmed columns                       |
| Astral Causeway       | Floating ruins, brass astronomy, purple space | Floating segmented platform, broken descending edges, brass orbital rings and distant stars      |

Each must differ in geometry, materials and lighting, not just hue. Existing world-v1 paintings may form a distant backdrop; they must not be perspective-distorted again as if they were top-down floor textures. New floor/prop geometry must cast/receive real shadows at high quality. Low quality may reduce resolution/shadow/particle work. Decorative geometry must never obscure cards, touch targets, state or location identity.

Implementation decision: select the arena from the initial public match projection and retain it for the mounted match. Later revealed locations update their own lane surfaces/labels, rather than replacing the whole environment during interaction. Only public revealed state may determine visual content; unrevealed locations must remain sealed.

## Cards and interaction

The 3D renderer must use existing scene artwork on actual card planes with physical edge thickness and cast shadows. Board-scale faces must retain metallic frame, cost/name, actual current stats and centered rarity shapes. Tiny rule paragraphs are unnecessary on the table; the full existing CardVisual remains the inspection view. Tokens must not acquire a rarity/cost. Current HP/ATK must always come from the presented public unit state.

Table textures must preserve the current Barlow/Barlow Condensed typography and rarity palette: U silver `#cbd5e1`, R gold `#f4d06f`, SR purple `#c5a1ff`, E orange-red `#ff9875`; SL uses the existing static cyan/purple/pink/yellow spectrum. Runeterra's own green/blue rarity colors must not replace OathFront colors. SVG and canvas gem geometry must share one definition.

Hover/focus/selection should lift a card slightly. Attacks may lift/lunge a card and leave a trail. Damage, destruction, shields, block and signature effects must stay attached to their source/target in world space. The camera and projection must share coordinates with DOM targeting. Native semantic buttons remain responsible for pointer/touch/keyboard actions, ARIA labels and legal targets; the canvas never calculates legality or submits commands. Secondary inspector/quantity/disclosure controls must remain independent.

Project card/slot/location anchors from the same Three camera each visual frame. Screen-space stats remain upright, above the opponent cards and below the player cards to keep the location band clear. During cinematic playback, retain the existing intent controller's presentation-cursor fast-forward policy before acting; forecasts must not shift target geometry. When effects stop/skip/recover, camera and hit targets must immediately return to their stable base state.

## Motion

Three.js owns rendering and scene geometry. Existing GSAP presentation timelines own event progress; no second timer-driven choreography is allowed. Strong but bounded zoom, lateral camera movement and impact shake are permitted during attack/signature/damage beats. Repeated movement must not accumulate camera drift. The return-to-board pose must be exact. Hover uses scoped reversible GSAP tweens or the existing event progress, with cleanup.

Reduced-motion preference (OS or app) must remove camera translation, zoom, shake and decorative continuous movement; state changes remain legible through static highlights and brief opacity feedback. Pause, background tab, disconnect, skip/backlog fast-forward, quality change, retry and unmount must stop work and release resources correctly. No visual change may cause an extra network command or replay.

## Implementation boundaries

Use Three.js 0.186.1 and matching @types/three 0.186.0, verified against npm at implementation start. Reuse React/Next and GSAP. Load the renderer only on match entry; do not add another framework or run Pixi and Three concurrently. The existing BattleScene interface and public event reducer remain the presentation contract. Keep the old semantic board as usable renderer-failure fallback.

GPU resources, image callbacks, observers and GSAP owners must be disposed. Cap device pixel ratio at 1.5 for high and 1 for low; keep one shadow-casting directional light and bounded decorative geometry. Render on demand or through one managed GSAP ticker, sleeping while hidden/paused and when idle if possible. Avoid per-frame React state updates.

No API, DB, game-engine, catalog, authentication or audio changes. Existing uncommitted auth/audio/App/layout files are user-owned. Current original art is preserved. Rendered metadata and accessibility text remain English.

## Responsive and fallback acceptance

- Desktop 1440×900 and 1280×720: all five lanes, both heroes, hand and phase action must fit without page scroll; inspector cannot reflow the arena.
- Phone landscape around 844×390: five lanes and actionable cards/phase controls must fit; hand may scroll horizontally and expanded details may scroll independently.
- Phone portrait 375×812: playable compact layout with all lanes represented, upright readable stats and an optional landscape hint; no forced orientation lock and no disabled match solely because of viewport size.
- WebGL unavailable/context lost: display the current semantic board, card inspection and legal actions; retry may reconstruct one renderer, never two.
- Focus indicators, keyboard activation, reduced motion, touch selection and independent native scrolling must work. Interactive controls should be at least 44px; compact projected cards must have an adequate semantic hit area.
- Missing illustration must keep meaningful text/frame instead of a blank or stalled match.

## Milestone acceptance

1. Design/source and renderer architecture recorded; project constraints preserved.
2. A real 3D scene renders one arena correctly, then all four with projected interaction and bounded lifecycle.
3. Match composition, HUD, hand and mobile controls integrate without changing commands.
4. Cinematic events, recovery/fallback, responsive visual review and focused gameplay checks pass; contract/evidence updated.

## Implemented responsive/material decisions

- The four original 1024² material maps live in `apps/web/public/assets/arena-materials-v1/`; generation prompts, masters and hashes live in `assets/source/arena-materials-v1/`. Shared world-space UVs and clamped sampling avoid relying on perfect repeat seams. Material failure keeps the procedural surface usable.
- Desktop resting camera remains `(0,14,12.6)`. Compact landscape uses `(0,12.3,9.7)`. Portrait uses a steeper approximately 72° elevation and width-aware framing; cinematic corner fitting keeps all card targets inside the viewport. The environment edges may crop on portrait.
- Normal terrain labels use `Lane N`; hidden terrain uses a sealed question mark plus lane number with the reveal-turn accessible label. Full revealed-location rules open independently above the inspector.
- Header actions, optional landscape hint, native hand scrolling, powers and event log remain semantic DOM controls. Empty recovery live regions cannot intercept input. Transient recovery disables Pause activation with an ARIA state and guarded callback while preserving keyboard focus.
- Hand frames, cost sockets and centered rarity gems retain the shared card design. Portrait uses a taller hand row; the shortest landscape uses compact art with full inspection available.

See `docs/implementation/arena-3d.md` for actual verification and known limits.
