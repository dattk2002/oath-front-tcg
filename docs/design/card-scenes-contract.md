# OathFront card scenes and anatomy contract

## Context and goals

Cards must read as illustrated trading cards, with a complete environment and a recognizable unit/spell distinction. The user's Legends of Runeterra screenshots are the approved reference for card anatomy; the site shell retains OathFront's Pen typography and palette. This is a UI/art extension, with no game-rule or backend changes.

## Artwork

All 50 collectible units and three token illustrations must have opaque scene variants for card-facing thumbnails/inspection. Each scene must retain the established character's species, silhouette, equipment and color identity while giving it a specific environment, integrated light, contact with the ground and foreground/middle/background depth. The figure should occupy roughly 55–75% of the image; a scene should remain legible around it. Flat gradients, generic fog backdrops and floating isolated cutouts are prohibited as final scene art.

The 22 existing tricks already have opaque effect/action compositions. They must retain those scenes, presented through the new trick aperture. Trick art should communicate an action or magical phenomenon rather than appearing to be another recruitable character.

Generated masters must contain only illustration, never baked card names, costs, rules, rarity symbols, stat values, logos or interface frames. Exact prompts, source-reference paths, hashes, dimensions and tool provenance must be retained. Existing transparent cutouts and low/high battle atlases must remain untouched for the Pixi battlefield. No scene variant may silently replace a battle cutout.

## Tokens and foundations

The UI must reuse OathFront ink, paper and slate tokens with metallic frame highlights. System accents must match the existing elements contract. Frames should be layered and beveled, with consistent corner/socket geometry. Text must remain readable over a dark opaque plate rather than relying on arbitrary artwork contrast.

| Rarity | Shape | Existing OathFront color | Position |
|---|---|---|---|
| U · Uncommon | Triangle | Silver (`--rarity-u`) | Bottom center |
| R · Rare | Square | Gold (`--rarity-r`) | Bottom center |
| SR · Super Rare | Pentagon | Purple (`--rarity-sr`) | Bottom center |
| SL · Super Legendary | Hexagon | Prismatic spectrum | Bottom center |
| E · Event | Notched event crest | Orange-red (`--rarity-e`) | Bottom center |

The gem must sit in a consistent bottom-center socket aligned to the card body, not the surrounding collection cell. Its border/facet should preserve legibility on every background. SL may use a static spectrum, never an endless shimmer. The accessible name must include the rarity name/code; full inspect metadata must expose the meaning in text. Powers/tokens must not acquire a collectible rarity. Rarity is separate from hero systems and must never imply strength or change gameplay.

## Anatomy and behavior

### Unit cards

A tall armored portrait window must show the integrated environmental illustration. Energy occupies the upper-left socket and system identity the upper-right. The name sits on a centered band, followed by exact rules/keywords when space permits. Attack must remain at the lower-left and health at the lower-right, leaving a centered rarity socket. Card-facing art must use stable aspect ratios and a focal crop that retains the character's identity.

### Trick cards

Tricks must use a circular spell/action aperture within a distinct beveled body. Their background/effect art remains visible inside the aperture; a visible Trick label differentiates them independently of color. Energy/system positions should be consistent with units. Name and exact rules follow below. Tricks must not show empty or invented ATK/HP sockets. The rarity socket remains bottom-center.

### Tokens and compact surfaces

Tokens use unit art anatomy and printed/current stats, with a Token label; no invented cost or rarity. Full collection/inspect cards must show exact rules. Dense hand views must retain name, cost, type and relevant stats, and open the complete inspector. Desktop viewports 640–849px high may use a compact horizontal face with a visible art aperture, while the full inspector retains the portrait/spell frame; this must keep phase controls within the viewport. They must not squeeze entire paragraphs into unreadable microtext. Battlefield figures retain their cutout rendering and `.scene-art` geometry hooks; current health/attack/statuses must never be replaced by printed card values.

### Controls and states

`CardVisual` must remain presentation-only. Existing native buttons/links, card inspection, quantity controls, drag/select/mulligan and command callbacks remain owned by their parent surfaces. Whole-card primary activation must match its semantic title action; secondary quantity/edit actions must remain independent. Interactive controls must never be nested inside a parent button or link.

Default cards must show a readable name and type. Hover should emphasize the frame without moving the hit area. Focus-visible must remain outside decorative clipping. Selected/active state must remain explicit. Disabled cards must keep their reason. Loading must reserve art dimensions. Missing images must preserve the name/type/stats and enable retry only where the parent is not already interactive. Unreleased event cards must stay sealed according to existing reveal state; merely having an image asset must not reveal them.

At 375px, a two-column collection may use compact faces but the full inspector must remain readable and scrollable. Tablet/desktop should increase card dimensions rather than adding tiny columns indefinitely. Long names may wrap at word boundaries; full rules must never be silently discarded. Quantity indicators must avoid the cost, system and rarity sockets.

## Motion and accessibility

Existing scoped GSAP owns entry and artwork tilt. New card components must retain cleanup, reduced-motion behavior and image-error stability. No CSS keyframe loops or additional animation dependency is needed. Rarity does not animate continuously.

Pass/fail requirements: keyboard access and focus return; pointer/touch parity; meaningful type and rarity labels independent of color; minimum 44px controls; contrast of normal text at least 4.5:1; no horizontal page overflow at 375px; playable/disabled states remain understandable. Card metadata must remain semantic DOM and accessible when decorative images fail.

## Integration and migration

A new `card-scenes-v1` manifest must override only scene `thumb`/`inspect` variants and be merged last in `resolveArt` and `artById`. Existing art keys, definitions, hashes of frozen catalogs and battle preload requests must remain unchanged. Consumers must include deck preview, builder collection/inspection, hand/inspection, revealed event/reward cards and campaign card showcases. Replace stale flattened showcase cards with current runtime card faces where necessary.

The original `.pen` file remains frozen; this contract is an authorized extension with null Pen node bindings. Do not invent design node IDs or claim complete Pen frame coverage.

## QA checklist

- [x] 53 opaque individual scene masters exported and visually reviewed; 22 existing trick scenes retained.
- [x] All card-facing unit art has an environmental background; battle cutouts/atlases retain exact original URLs and hashes.
- [x] Unit/trick anatomy is visibly different at thumbnail and full size.
- [x] U/R/SR/SL geometry and E crest sit at bottom center across surfaces.
- [x] Long names, rules, cost, quantity and stats do not collide at phone/tablet/desktop/short heights.
- [x] Keyboard, focus, pointer/touch, reduced motion, missing art and event sealing remain correct.
- [x] Focused asset/frontend/browser checks, production compilation and standalone preparation verified; snapshot packaging limitation and remote delivery status are recorded in the implementation report.

References: [RuneterraFire card gallery](https://www.runeterrafire.com/cards), [Riot's separation of card renders and full illustrations](https://support-developer.riotgames.com/hc/en-us/articles/22698735834515-Legends-of-Runeterra). OathFront retains its own identities, palette, card values and rules.
