# OathFront — twenty-hero art direction

## Scope and intent

The user approved redesigning all twenty heroes and the Home banner together. This presentation update accompanies the playable `heroes_v1` catalog. Original OathFront IDs, names, classes, powers and existing sixty cards must remain stable. `core_v1` remains available for old matches and tutorials.

The visual reference is the energetic ensemble composition and stylized superhero rendering of [Marvel Rivals](https://www.marvelrivals.com/). The expanded Home follows the discovery progression of [Wild Rift](https://wildrift.leagueoflegends.com/vi-vn/): key art, gameplay, champions, world and a clear play action. OathFront must describe its actual browser PvE card game, not MOBA, multiplayer, ranked or downloadable-client features.

## Shared visual rules

All heroes must use sculptural anatomy, angular armor or cloth silhouettes, expressive faces, faceted material highlights and controlled energy accents. Dawnward should favor ivory, navy, moss, teal and gold; Ashen Court should favor charcoal, plum, ember, bronze and blackglass. Character shapes must remain distinguishable at HUD size. The existing Pen paper/slate/lilac/acid UI and Barlow typography remain the frame for the artwork.

Archetypes are inspiration, not character identities. Costumes, facial designs, emblems, names and fiction belong to OathFront. No Marvel logo or character name appears in the player UI.

| Hero | Archetype inspiration | Original identifying elements |
| --- | --- | --- |
| Briar | Agile armored protector | Living-wood armor, enormous leaf shield, copper joints |
| Aster | Powered flight champion | Ivory/cobalt prism armor, open helmet, cyan crystalline jets |
| Lumen | Weather controller | White braids, three lavender cape ribbons, lightweaving arcs |
| Cinder | Ferocious close-range brawler | Furnace seams, molten forearm blades, heavy charcoal armor |
| Vesper | Kinetic projectile duelist | Plum asymmetric coat, crimson shards and crescent blade |
| Morrow | Dimensional scholar | Polygonal portals, gold glasses, architectural floating panels |
| Solenne | Solar champion | Spear, three sun vanes, copper-gold shield plane |
| Cairn | Stone colossus | Limestone arch shoulders, moss and teal mineral seams |
| Zephyr | Speedster | Seafoam scarf, aerodynamic ivory suit, wind ribbons |
| Meridian | Astral archivist | Brass armillary, luminous folio, structured scholar coat |
| Mossweld | Small creature engineer | Original fennec/pangolin form, repair gauntlet, compact drone |
| Halcyon | Sky conductor | Feather fan, indigo conductor armor, controlled wind arcs |
| Rowan | Ocean/forest guardian | Driftwood staff, teal seed, layered nomadic coat and tidal foliage |
| Rook | Powered marksman | Rail-bow, ember bolt, aiming monocle and compact jetpack |
| Nyxara | Thread-and-curse mage | Six silk strands, turquoise threads, diamond web geometry |
| Brimstone | Molten strength champion | Obsidian trapezoid body, shoulder furnace vents |
| Sable | Magnetic authority | Judicial coat, suspended verdict seals and thin metal slabs |
| Vanta | Agile predator | Blackglass armor, exposed face, broken blade hoops |
| Gravemarch | Machine juggernaut | Hollow bell cage, bronze plates and teal resonance |
| Scoria | Fire scientist | Split laboratory coat, two floating kiln vessels |

## Assets and provenance

- Exact twenty generation prompts and selected source PNGs: `assets/source/heroes-v4/`.
- Runtime transparent WebP derivatives: `apps/web/public/assets/heroes-v4/`.
- Ensemble prompt, selected source and export hashes: `assets/source/home-v2/`.
- Responsive banner WebP derivatives: `apps/web/public/assets/home-v2/`.
- Tools: built-in `image_gen`; Python/Pillow only exports size and crop derivatives, preserving source artwork.
- Export scripts: `tools/assets/export-heroes-v4.py`, `tools/assets/export-home-v2.py`.
- Each manifest must record paths, dimensions, byte sizes and SHA-256 hashes. Originals and old presentation packs must remain available.

The banner features eight representatives: Briar, Aster, Lumen, Cinder, Morrow, Vanta, Mossweld and Rowan. All twenty have individual playable/profile assets. The banner must preserve light space at left for semantic HTML headings/actions; text must never be baked into artwork. Mobile must show the ensemble separately from the text rather than covering faces with buttons.

## Home component contract

The Home extension is derived from the user's latest direction, not a new node in the frozen Pen file. It must contain:

1. Ensemble hero with live heading, Play/Continue and Learn actions.
2. Five-lane explanation and four-phase sequence, with Ashen units first, Dawnward units/tricks second, Ashen tricks third, then lane-by-lane combat.
3. Hero discovery with real profile links and the current twenty-hero count.
4. Real card art and deck rules: thirty cards, up to two copies, hero class/faction restrictions.
5. Fivefold editorial/world entries using actual existing routes and honest sample/archive status.
6. Closing play action and game-learning link.

Each interactive card must have a semantic whole-surface link or button, a visible focus state and a minimum44px touch target. The Home must remain fully readable without animation or artwork. Images below the fold should load lazily. GSAP reveal/hover motion must be scoped and cleaned up; reduced-motion settings must show the complete static layout. No scroll pinning is required.

## QA checklist

- [x] Twenty source identities and four derivatives per hero inspected.
- [x] HUD crops keep the complete face; full-body stages preserve alpha and silhouette.
- [ ] Banner light space, eight recognizable identities and mobile composition verified.
- [ ] Runtime manifest resolves all hero IDs and new signature portraits.
- [ ] Home, roster, profiles and gameplay agree on names/artwork/counts.
- [ ]375px, tablet and desktop checked for overflow, focus and legibility.
- [ ] Reduced motion and image failure retain all navigation and rules.
