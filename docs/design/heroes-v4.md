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

## Component states and interaction

| Component | Required state and input behavior |
| --- | --- |
| Play / Continue / Learn | Must show live English action text. During connection, Play must show “Connecting…” and game-entry actions must be disabled. Existing session/match state selects Play or Continue. Failure must leave an actionable retry banner. Enter/Space and pointer/touch must invoke the same action. |
| Four phase buttons | Must be real buttons in a named group; the selected button must expose `aria-pressed=true`. Pointer, touch, Enter and Space must select the same phase. Focus must remain visible; selected state must have a border/text cue as well as color. The description must update through a polite live region. These local controls have no asynchronous loading/error state and must remain usable during API failure. |
| Hero/editorial cards | Must be whole-surface semantic links with one clear destination; hover/focus may move artwork through GSAP but must preserve text legibility. Active state must retain the destination. Missing artwork must retain the linked name and fixed area. Cards do not have disabled/loading navigation states; browser navigation supplies normal link behavior. |
| Ensemble and portraits | Must reserve geometry before decoding. Banner loads eagerly with responsive sources; offscreen portraits should load lazily. Failed artwork must render a named placeholder without hiding navigation, names or rules. Decorative images must use empty alt text when adjacent text already names the destination. |
| Native roster | Must preserve a single radio selection, keyboard navigation and exact hero-to-deck identity. Desktop must allow scrolling the twenty entries without displacing the detail pane. Mobile must reflow the detail and powers below the roster; long names must wrap without horizontal overflow. |

Hover/focus feedback must use the existing semantic tokens and scoped GSAP/CSS feedback rules. Busy/error states must not invent game actions. Empty filtered public rosters must retain faction navigation; the shipped two-faction data always contains ten heroes per faction. Editorial links must retain the existing explicitly labeled mock/archive status.

At 375px the banner must precede the copy; at tablet/desktop the left copy must remain readable over the ensemble. At 200% text size, content must grow vertically without clipping. Meaningful copy must use at least the existing 12px small-text token, with 16px or larger body/rules where space permits. Keyboard focus must not be hidden by scroll containers or artwork; interactive targets must meet 44×44px. Reduced motion must remove entrance/hover movement while keeping every section visible. No game command may wait for visual effects.

## QA checklist

- [x] Twenty source identities and four derivatives per hero inspected.
- [x] HUD crops keep the complete face; full-body stages preserve alpha and silhouette.
- [x] Banner light space, eight recognizable identities and mobile composition verified.
- [x] Runtime manifest resolves all hero IDs and new signature portraits.
- [x] Home, roster, profiles and gameplay agree on names/artwork/counts.
- [x] 375px, tablet and desktop checked for overflow, focus and legibility.
- [x] Reduced motion and image failure retain all navigation and rules.
