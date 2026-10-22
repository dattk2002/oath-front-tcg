# Card Scenes and Runeterra-Inspired Anatomy Implementation Plan

> **For agentic workers:** Use subagent-driven-development for independent art and UI implementation, with integration and focused reviews controlled by the root agent.

**Goal:** Every OathFront unit has illustrated environmental card art; unit and trick faces have distinct Runeterra-inspired anatomy and centered rarity gemstones.

**Architecture:** Preserve immutable catalogs and battle cutout atlases. Add a versioned scene asset layer merging only card-facing thumb/inspect variants. A shared semantic CardVisual unifies card presentation across deck, collection, hand, inspectors and revealed event/reward surfaces. Native controls and game callbacks stay outside the presentation component.

**Tech Stack:** Existing React/Next, CSS/SVG card frames, GSAP; built-in image_gen for individual scene edits, Pillow only for deterministic export/validation of generated masters.

**Spec:** Latest user screenshots and explicit instructions: LoR-like unit vs trick card design; backgrounds for both; bottom-center rarity U triangle, R square, SR pentagon, SL hexagon. Existing OathFront colors remain U silver, R gold, SR purple, SL spectrum, E orange-red. E uses a dedicated event crest (implementation choice). Approved Pen site language stays outside card faces. User previously approved recommendations and implementation; no extra design approval round is needed.

## Constraints and interfaces

- UI/art only; no API, database, content/rules IDs, deck restrictions, login behavior or balance changes.
- Preserve all existing user-owned uncommitted audio/auth/App changes; work in already authorized main checkout and commit only task-owned files.
- Current inventory: 50 collectible UNIT, 22 TRICK, 3 TOKEN. Generate 53 opaque scene masters using existing character reference art. Retain all 22 existing opaque trick compositions. Old unit cutouts and atlas requests remain unchanged.
- Each image must be generated separately with built-in image_gen; inspect every reference first; persist exact prompt and generation provenance per ID. No contact-sheet artwork generation or programmatic background compositing.
- Scene masters contain no baked text/frame/stats. Runtime metadata remains semantic DOM. Artwork is original OathFront; Runeterra is an anatomy/composition reference.
- `CardVisual({definition, surface, title?, quantity?, artRetry?, eager?})`, surface `collection|preview|inspect|hand|showcase`; definition CardDefinitionView or TokenDefinitionView. Entire output uses phrasing markup so native button wrappers remain valid. Unit stats only for units/tokens; tricks never display fake ATK/HP.
- Frame: cost upper left, system upper right, unit portrait environmental window, trick round spell/action aperture, centered name/rules plate, unit ATK lower left and HP lower right, rarity geometric gemstone bottom center. Display accessible rarity code/name outside color-only cue. Tokens have no collectible rarity or invented energy cost.
- New scene manifest merges LAST over previously resolved asset in both resolveArt/artById. Missing variants must retain existing cutouts. New art layer must not add battle preload downloads.
- Separate decorative clipping from focus outlines; long names and full text must remain accessible. Compact battle hand uses readable metadata and full inspection instead of miniature rule paragraphs. Keep `.scene-art` Pixi hooks.
- Reduced motion and existing scoped GSAP ownership remain. No new dependency, keyframe loops, API changes or destructive cleanup.

## Milestones

### M1 — Art direction, inventory and proof
- [x] Inventory canonical 72 cards + 3 tokens, current alpha, names/systems and reference sources.
- [x] Produce one scene proof preserving character identity, review background depth, crop/readability and output provenance.
- [x] Lock unit/trick anatomy and U/R/SR/SL/E geometry in the card contract.

### M2 — Scene art and semantic card implementation
- [x] Generate remaining 52 unit/token scenes in independent ID groups; inspect outputs and keep originals/versioned sources.
- [x] Implement shared CardVisual and geometric rarity gem; integrate collection/deck/inspect/hand/revealed event and reward surfaces while preserving controls.
- [x] Replace hardcoded card-facing references in campaign card showcases. Use actual scene cards rather than a stale flattened card collage for the relevant feature panel.
- [x] Add scene exporter/manifest inspection and asset resolver regressions; verify thumb/inspect opacity and preservation of old cutout/atlas URLs.
- [x] Review UI and scene assets separately, then integrate all 53 masters.

### M3 — Integration, review and delivery
- [x] Verify readable unit/trick differentiation, bottom-center rarity geometry, 30-card quantities, full effects/inspection, keyboard/touch, hidden event gating, missing art, 375px/768px/1024×640/1440×900 and short viewport reflow.
- [x] Run focused frontend/asset tests, typecheck/lint and web production build; inspect screenshots/contact sheets.
- [x] Update Pen extension and design/implementation documents, preserve original Pen hash.
- [ ] Inspect exact owned diff, create small commits and push under existing authorization; verify Git-triggered frontend deployment.

## Review focus

- Card titles/rules must not collide with cost/system sockets or bottom stat/gem areas at small widths.
- Unit silhouettes must retain identity; background light/perspective must form an integrated scene, not a flat replacement behind a cutout.
- Rarity geometry must stay centered on every collectible face without implying rarity for powers/tokens.
- Events not yet revealed must remain hidden even though art files exist; ownership/playability must still come from existing state.
- Board atlases and unit geometry anchors must remain unchanged; no background downloads may enter the existing battle-preload path.
