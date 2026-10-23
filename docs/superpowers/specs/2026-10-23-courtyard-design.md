# OathFront authored battlefields and direct card dragging

## Latest scope clarification

The user explicitly said Moonroot need not be artistically perfect. The [current courtyard contract](../../design/courtyard-contract.md) records the functional release: authored Moonroot plus the shared HUD, camera and drag controls on all four existing 3D environments. Further sculpture and replacement GLBs for the other arenas are outside this release. Earlier strict visual-parity expansion gates below are historical planning criteria, superseded by this clarification.

## Approved visual target

The user approved `docs/design/concepts/moonroot-battlefield-v3-concept.png` as the visual standard on23October2026: Master Duel spatial presentation, Runeterra-inspired painterly fantasy, real3D, Moonroot first, then the same production quality across the existing four arenas. The user selected edge HUDs, a fanned hand and a phase orb beside the field, and explicitly requires dragging cards onto the floor without a separate confirmation button.

The concept is a visual target, not runtime scenery or a game screenshot. Actual OathFront branding, twenty heroes, card artwork/stats/rarities, eight systems, powers, five lanes, phase order and authoritative rules remain. Do not bake the concept's fictional cards, portraits, UI or perspective into the playable environment.

## Visual acceptance

- A broad continuous courtyard must fill the viewport; no small isolated thick plinth, alternating dark checkerboard slabs, black raised sockets or polygonal decorative rocks.
- Moonroot's quiet playable center is pale neutral/cool limestone, with shallow irregular joints and fine jade/brass engraved slot outlines. Jade fern banks, gnarled roots, carved stone arch, face relief and turquoise water/cascades frame the edge. Detail and brighter magic must stay away from card/rule reading areas.
- Camera elevation approximately64–68degrees on desktop; portrait can steepen to retain all five lanes. Fit the playable envelope including card lift and camera cues. Perimeter architecture may crop, cards/targets may not.
- Geometry must carry depth and silhouette, including real arch opening, roots, steps and channels. Untextured geometry must still read as the intended environment. Painted color must not be reused as a bump/height map; use independently authored relief or omit unsupported maps.
- Actual cards lie on the same plane used for picking, cast contact shadows and lift on drag/selection/attack. HUD remains in screen space.
- Reuse the asset pipeline, not Moonroot's silhouette, for Cinder Foundry (masonry, furnaces, channels of lava), Glasswater Sanctum (pale terraces, columns, crystals and water) and Astral Causeway (broken celestial architecture, causeway and orbital instruments). Existing arena selection stays stable per match.
- The face relief is an early quality gate: a visibly crude mannequin/primitive substitute is not accepted as matching the concept. Rework the silhouette/material/lighting before expanding decorative density.

## Asset and renderer contract

Use deterministic offline-authored geometry exported to high/low GLB, ordinary UV mapping and role-specific materials. Three remains the runtime; GSAP remains motion owner. Existing renderer lifecycle/error handling, public-view reducer and semantic controls remain.

Preserve current gameplay anchors: lane x=(lane−3)×2.4; own z=2.05, opponent z=−2.05; surface y=0.36; card1.7×2.35worldunits. Keep architecture outside the playable rectangle x±6.4,z±3.8. Suggested environment bounds x±10,z±8 with shallow surrounding terrain and elevations up to4.5; validate against camera movement. Do not independently eyeball ten anchors in model and runtime.

Paths:

- `tools/assets/arenas/`: deterministic authoring/export/validation scripts and theme modules.
- `assets/source/arenas-v2/`: original texture inputs, exact prompts, provenance and geometry parameters.
- `apps/web/public/assets/arenas-v2/<arena-key>/{high,low}.glb`: shipped selected-arena geometry.
- `apps/web/public/assets/arenas-v2/materials/`: purpose-built albedos/transparent foliage; no cards/slots/UI/shadows baked into texture inputs.
- `apps/web/public/assets/arenas-v2/manifest.json`: keys, model URLs/SHA256/bytes/triangles/drawcalls, material roles, bounds and landmark bounds.
- `rendering/three/arena-assets.ts`: loading/disposal/cancellation and role-based maps; no image bitmap leaks or post-disposal installs.

Material roles are `stone-pale`, `stone-dark`, `trim-brass`, `bark`, `foliage`, `water`, `emissive`, `metal`, `crystal`. Keep names stable between export/loader. Water/foam/runes can use inexpensive procedural shaders and scoped GSAP clock; no independent perpetual RAF loop. Material roughness and lighting preserve the painterly appearance. One shadow-casting light in high mode, reduced/no shadow in low. Retain DPR1.5high/1low. No new game engine or unrelated dependency upgrades.

Initial budgets (to verify, not benchmark claims): high≤160ktriangles/45drawcalls/8MBselected-arena download/72MiBtextures; low≤60ktriangles/30drawcalls/3MB/20MiB. Merge compatible geometry, instance repeated elements, limit cutout overdraw. Load only selected arena. Progressive placeholders must not be described as final authored art.

## Interaction contract

Dragging is primary for mouse, pen and touch. A valid drop submits the exact current legal action once. No optimistic energy/board mutation, new wire fields or rules change. Invalid drop returns the preview to its source and sends no command.

| Card/action | Target and submission |
|---|---|
| Unit | Empty friendly slot permitted by current legalActions; immediate PLAY_UNIT. |
| Targeted trick | Appropriate unit, hero or lane; immediate PLAY_TRICK. Lane effects highlight the lane band. |
| Untargeted trick | Central cast region, revealed only during suitable drag; uses existing target NONE. |
| UNIT_AND_LANE trick | Drop trick on permitted unit, then drag outlined unit to permitted destination. Only final drop submits combined action; no confirmation button. |

Separate transient drag state from ordinary inspector selection. Settle/fast-forward presentation at drag start, hold the camera stable during dragging, and derive targets from authoritative public legalActions. Clear on Escape, pointer cancellation/lost capture, hidden/offline, recovery, pause, source removal, revision/legality change, renderer failure or unmount. Suppress synthetic click after drag. Reuse existing receipt/idempotency/pending protection.

Renderer bridge is presentation-only: `ArenaInteractionSurface.pick(clientX,clientY)` returns SLOT(side,laneId), UNIT(instanceId), LANE(laneId) or CAST; `setDragPreview(preview|null)` displays geometry/feedback; `clearInteraction()` clears it. UI supplies allowed targets and validates returned hits. Raycast dedicated hit surfaces using the same measured board/camera as rendering, never nearest-slot snapping outside actual geometry. Hero targets remain semantic DOM. Open dialogs/disclosures/controls block drops through them.

Builder clarifications: picking receives the allowed hit identities and returns ordered matching candidates, so overlapping unit/slot/lane surfaces cannot swallow a legal drop. `BattleScene` publishes the current surface through a callback owned by MatchScreen and publishes null immediately on failure/retry/disposal. The surface exposes `holdCamera(boolean)` and typed preview state `{definitionId,instanceId,clientX,clientY,allowedHits,hoveredHit,valid}`. Combined-target pending state is `{sourceCard,selectedUnit,revision,allowedDestinations}` and survives the first pointer release; any cancellation or stale revision clears it. Tap source→target remains a confirmation-free secondary path.

Manifest contract: version `arenas-v2`; coordinates are world units, Y-up, origin at courtyard center; `arenas` is keyed by existing arena key. Each entry has `models.high`/`models.low` objects `{url,sha256,bytes,triangles,drawCalls}`, `bounds:{min:[x,y,z],max:[x,y,z]}`, `landmarks:[{name,bounds}]`, and `materials` mapping stable role names to optional `{baseColorUrl,alphaTest}` plus PBR values. Model and fetched textures count together toward download budgets. Texture memory includes decoded RGBA and mipmaps. Root integration verifies fit against the actual playable area remaining after HUD, fan and phase orb.

Pointer preview is noninteractive and tracks with refs/managed GSAP, without a React rerender per move. Friendly slots glow and show a translucent placement card; trick targets use a ring. Keyboard source/target activation remains secondary with the same rules, including a semantic Cast action. Touch uses upward drag versus native horizontal hand scrolling, with touch-action fixed before pointerdown; preserve pinch zoom. Full rules/details remain readable without dragging.

## HUD, hand and responsive layout

- Real hero portraits in restrained medallions, live HP badge, energy pips plus readable current/max, block charge/usage, reserve/deck/hand counts. No loss of existing gameplay information for appearance.
- Desktop enemy near top center, own near bottom-left, phase orb on right edge; existing settings/account/log/recovery remain reachable and compact.
- Hand has tall existing card faces, restrained±10degree fan, overlap and GSAP lift. Separate fan-layout transform from hover/drag artwork transforms. Focused/selected card rises above neighbors without moving its hit surface unpredictably. Up to10cards remain reachable.
- 844×390: shallow fan,80–90px-wide115–130px-tall cards, compact medallions/64–72pxorb; scroll dense hands.
- 375×812: shallow horizontally scrollable overlap,88–96px-wide126–138px-tall cards,56–64pxorb, all5lanes and44pxsemantic targets. Do not shrink a full desktop fan into portrait.
- English, visible focus, contrast, semantic labels, no color-only validity, reduced motion, explicit WebGL recovery/text board remain required. Existing auth/audio user changes remain untouched.

## Milestone acceptance

1. Author/inspect Moonroot geometry and textures; compare a real rendered populated scene to v3. Pass arch/relief/root and camera-quality checks before expansion.
2. Integrate edge HUD/fan/phase orb and direct drop with real mouse/touch, targeted/untargeted/combined tricks, invalid drop zero-command and keyboard parity.
3. Extend the shared pipeline to the three distinct arena themes and review all four at phone/landscape/desktop with1/5/10-card hands.
4. Focused regression, types/lint/build, full visible flow, scoped review and documented visual evidence. Commit/push/deploy under existing user authorization only after integration verification; preserve unrelated work and do not claim physical-device FPS or fullAAA parity without evidence.
