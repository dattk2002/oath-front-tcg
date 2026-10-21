# OathFront — Rivals-inspired visual redesign

## Context and goals

The user confirms the existing game works and requests a complete visual-theme refresh, prominent GSAP animation, coherent character designs inspired by Marvel Rivals, English names, and updated documentation. They explicitly selected **all interface copy in English** and supplied the Marvel Rivals design guidelines, asking to apply that direction directly. OathFront remains the brand. This document records implementation choices made on that delegated basis, not additional gameplay requirements.

OathFront must feel like a bold illustrated hero card game: oversized condensed headings, black and warm-white surfaces, electric yellow actions, angular frames, large original character art, and short readable comic impacts. It must remain a playable five-lane PvE game, not a scrolling promotional template.

References inspected on 2026-10-21:
- [Marvel Rivals hero interface](https://www.marvelrivals.com/heroes/index.html): angular cream character stage, black navigation, yellow actions, large character/name composition.
- [Official Art Vision](https://www.marvelrivals.com/devdiaries/20250421/40954_1228989.html): official interface/art/animation reference.
- [VALORANT agents](https://playvalorant.com/en-us/agents/): secondary reference for readable roster selection.
- [GSAP timelines](https://gsap.com/docs/v3/GSAP/gsap.timeline%28%29/) and [matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia%28%29/): animation ownership, responsive/reduced-motion cleanup.
- The user's supplied Markdown is retained in `docs/reference/marvel-rivals-user-design.md`.

The user-supplied `0px` font size, browser-default blue link color, fractional extraction spacing, and dashboard component counts must not become product requirements. They describe an imperfect extraction. This game needs readable semantic tokens and its actual component inventory. RefrigeratorDeluxeBold is a style reference; the implementation should use a locally hosted open-license condensed equivalent, **Barlow Condensed 700–900**, with its license retained. Existing local Noto Sans should remain body text. No remote font request is required during play.

## Design tokens and foundations

| Semantic token | Value / purpose |
|---|---|
| canvas | `#090B10` |
| surface | `#151820` |
| surface-raised | `#222733` |
| paper | `#F0EFE8` |
| ink | `#101218` |
| text | `#F8F8F2` |
| muted | `#BCC2CE` |
| action / focus | `#FFE34D`, ink foreground |
| Dawnward / GOOD | `#80E3E0` |
| Ashen Court / EVIL | `#FF957B` |
| Dawnward text on paper | `#165F62` |
| Ashen Court text on paper | `#8B392B` |
| error | `#FFB4AB`, icon/text supplement |
| border | `#7D8798` for meaningful control boundaries |
| spacing | 4, 8, 12, 16, 24, 32, 48, 64 CSS px |
| radius | 0–4px controls/panels; angled 8–16px decorative corner treatment |
| typography | body16/24; secondary14/20; minimum meaningful compact text12/16; headings24–88 with responsive clamp; tabular stats20–28 |
| targets | minimum44×44 CSS px, at least8px between adjacent controls |
| motion | feedback120ms, panel240ms, reveal480ms; use existing event-specific battle budgets below |

Components must consume semantic CSS variables. The developer must check actual foreground/background contrast, rather than assuming every accent works as text on paper. Black-on-yellow actions and ink-on-paper hero detail are primary contrast pairs. Focus rings must remain outside decorative clipping; interactive surfaces must not lose their hit area to clip-path.

Calculated solid-color pairs are16.65:1 text/surface,8.35:1 muted/raised,16.24:1 ink/paper,14.57:1 ink/action,6.40:1 Dawnward-ink/paper and6.70:1 Ashen-ink/paper. Light faction accents on paper are only1.30:1 and1.85:1 and must not serve as text or essential boundaries there. Paper panels must use an ink-colored focus ring. These calculations do not replace checks of rendered overlays, gradients and disabled/error states.

## World, English identity and art

The world is **The Fivefold**, floating sanctuaries joined by five contested routes above an ancient furnace citadel. **Dawnward** protects the routes; **Ashen Court** seeks to control them. This is stylized arcane technology and mythic armor with strong comic lighting, not photorealism. Character anatomy, headgear, weapons, and energy shapes must differentiate silhouettes at thumbnail size.

| Existing ID | English hero | Title | Identity / silhouette |
|---|---|---|---|
| H_G_BV | Briar | The Living Bastion | Broad female protector; ivory and jade segmented armor; living branch shield, luminous seed core, grounded stance; Bastion/Verdant |
| H_G_BP | Aster | The Prism Sentinel | Tall male sentinel; geometric ivory/cyan armor, angular crystal lance and kite shield, short asymmetric cloak; Bastion/Prism |
| H_G_VP | Lumen | The Lightweaver | Agile female aerial duelist; teal/white layered suit, ribbon-like hard-light arcs and leaf fins, open dynamic silhouette; Verdant/Prism |
| H_E_FX | Cinder | The Furnace King | Massive armored forge sovereign; charcoal/crimson plates, exposed amber furnace core, heavy gauntlet/hammer, squared silhouette; Furnace/Hex |
| H_E_FS | Vesper | The Duskblade | Lean male rogue; charcoal/crimson split coat, twin crescent blades and ember trails, low diagonal stance; Furnace/Veil |
| H_E_XS | Morrow | The Hex Architect | Androgynous masked sorcerer; ink-black/violet geometric robes, floating seal plates and pale lavender threads, tall triangular silhouette; Hex/Veil |

These must be original characters, sharing the reference's expressive comic treatment without importing Marvel character identities, logos, costumes, or website assets. Generate six individual full-body/bust-safe transparent illustrations with the built-in image tool. Save originals, prompts, source paths and derived optimized assets in this repo; use a versioned presentation asset layer such as `rivals-v2`. Each hero must have one consistent identity across home, selection, inspect and battle HUD. The existing unit/card/terrain artwork should be integrated with the new faction palettes, framing and stronger effect families; existing card IDs and game semantics must stay intact. Additional unit art replacement must not silently become a required 60-image regeneration.

The new `fivefold-board.png` is the shared battlefield background: pale sanctuary architecture at one edge, dark furnace ruins at the other, and a low-noise dark central play surface. Use the versioned presentation override for `board/scene.webp`, including its wide battle request, without replacing the eight Location strips or changing preload behavior based on hidden assignments.

All visible UI, metadata, accessible names, errors, tutorial steps, class/keyword names, card/power/location names and rules text must be English. User-entered account names and deck names must remain unmodified. OathFront must not display the former Vietnamese game subtitle. Hero/card translations must live in a centralized ID-keyed English presentation catalog; English rules must preserve targets, amounts, durations, ordering, and triggers exactly.

The immutable `core_v1`, `locations_v1`, `tutorial_v1`, protocol fields, IDs, stored checkpoints, event receipts and gameplay hashes must remain unchanged. The UI must resolve English presentation copy by stable IDs, not rewrite persisted content or transport contracts. Legacy wire field names such as `nameVi` are historical contract details, not permission to show Vietnamese text. Current presentation docs must explain the distinction. Historical evidence and source-parity tables must remain reproducible, with pointers to current English presentation docs.

## Component-level rules

Every interactive component must define default, hover, focus-visible, active/selected, disabled, loading and error states. A selected radio/card must show text or a shape as well as accent color. Loading must preserve space and prevent duplicate submissions. Errors must provide the existing explicit retry/recovery action; no automatic replay of commands may be introduced.

| Surface | Anatomy and behavior |
|---|---|
| Global shell | Black compact nav, OathFront wordmark, yellow current-page indicator, readable account strip; menu/settings remain real buttons; English page metadata/lang=en |
| Home | Full-width editorial hero with large character compositions, dark/cream angular split, short headline **FIVE LANES. ONE OATH.**, primary **PLAY NOW** or **CONTINUE MATCH**, secondary **LEARN TO PLAY**; original hero art replaces the small generic five-pill composition |
| Hero select | Two clearly named factions, six strong portrait tiles, selected hero on a large paper stage, short role/title, four powers; tile surface/radio is the primary selection target, arrow-key navigation retained |
| Deck builder/collection | Angled card frames, clear cost/attack/health hierarchy, stable artwork crop, searchable English names/text; independent quantity controls, visible30-card progress and curve; no redundant Open buttons |
| Setup/mulligan | Clear opponent/difficulty choice and card review, strong yellow confirmation, hero imagery reused; disabled reasons and insufficient-card state readable |
| Battle | Five lanes remain left-to-right1–5; high-contrast resource HUD and compact phase strip, dark board and light readable stat plates, faction shape cues, grouped log/inspect; animation never hides target information |
| Card / ability | Cost upper-left; name at most2lines with inspect for full text; art middle; exact rules below; unit ATK/HP distinct, tricks without fake stats; signature mark and free-response label in English |
| Dialogs/results | Angular panel, strong heading and clear primary/secondary actions, semantic modal focus/return; pause/result/block/auth recoveries remain complete |
| History/settings/auth | Same tokens and controls, explicit empty/error/loading states, long account/deck names wrap safely; user content is never translated |

At375px the shell/deck/settings must remain usable and the existing small-screen battle fallback must be English;1024×640 must support the landscape board,1440×900 the desktop board. At200% zoom, reading/focus paths must stay available without horizontally clipping text. Card artwork may crop decoratively; names, stats, focus rings and actions must not.

## GSAP motion system

GSAP must be the choreography engine; Pixi remains the scene renderer. Reuse scoped contexts and the existing presentation controller. CSS transitions may handle simple hover/focus feedback only; do not introduce CSS keyframes or timer-driven animation.

- Home: staggered headline/actions and diagonal art reveal; restrained layered parallax on fine-pointer devices, stopped when hidden or reduced motion.
- Roster: selected hero enters with a short horizontal reveal and name/power stagger; rapidly changing selections must cancel prior tweens.
- Cards: reversible lift/tilt feedback with keyboard equivalent, draw from deck, deploy anticipation→arrival→impact, stat plate reveal. No hover-only essential information.
- Battle: clear evil-first anticipation then good offset80ms, shared damage commit, directional slash/projectile trails and readable impact numbers; death follows damage. Preserve existing per-event duration caps and rules-independent callbacks.
- Effects: kinetic slash, faceted shield, growth bloom, prism shards, ember burst, ink seals, veil ribbons; bounded reusable geometry, no full-screen flashing or continuous particle flood.
- Signature powers: hero-colored portrait/rune accent plus existing target primitives, total≤900ms. Block/readiness and phase changes must be visually apparent.
- Overlays: pause/block/result entrances must use owned timelines. Native dismissal must remain immediate, restore focus through the existing dialog helper, and kill/revert any entrance in progress. Do not delay semantic close for a visual exit or create a duplicate decorative dialog. Cancellation must leave the correct final visible state.

OS/game reduced-motion must render a readable static or short-fade end state. No indefinite input lock, hidden button after interrupted tween, replay of cosmetic backlog after reconnect, or change to server actions/revisions is allowed. Existing backlog>2s fast-forward, pause/visibility handling, low-VFX mode and memory cleanup must remain effective.

## Accessibility requirements and acceptance

- Text must meet4.5:1 contrast, large text3:1; meaningful controls/focus boundaries must meet3:1.
- Every important action must work using keyboard and pointer; touch must not require hover/drag.
- Focus must be visible, not clipped, and stay inside modal dialogs while open, returning afterward.
- Full names/rules must be available when card titles wrap or truncate.
- Reduced motion must disable decorative parallax and retain all gameplay information/actions.
- Decorative art/canvas must not duplicate semantic announcements.
- English must cover home→hero→deck→setup→mulligan→battle→block/pause→result→history/settings/auth, including errors and tutorial, while preserving custom user text.
- Missing images must show a readable named fallback and usable retry without triggering hero selection or other parent actions.
- A real browser verification must inspect375,1024×640 and1440×900 layouts,200% reflow, console errors, normal and reduced motion, and one complete game interaction flow.

## Content, anti-patterns and QA

Copy should be brief and direct: **Choose your hero**, **Deploy units**, **Play tricks**, **End phase**, **Use now**, **Keep for later**, **Connection lost. Your match is saved.** Rules text must remain precise rather than being shortened for visual effect. Docs may explain changes in Vietnamese, but game examples/names must use English.

Do not use arbitrary photo placeholders, generic dashboard bento/AIDA structures on the game board, giant marketing whitespace in battle, character-only bitmap labels, copied Marvel assets, unreadable extracted font sizes, blanket console suppression, or a new dependency solely for an effect GSAP already supports.

QA must verify: content ID completeness and unchanged mechanics; actual art identity and provenance; all component states; English static-copy sweep; responsive/keyboard/reduced-motion flows; animation interruption and cleanup; type/lint/build; relevant frontend tests and one final browser run. Existing balance, physical p95 and human playtest holds must stay visible and must not be declared resolved by this redesign. Production deployment is outside scope.


## Approved card-art expansion — ArtStation reference

On 2026-10-21 the user added ArtStation as a reference for character/card illustration and explicitly selected redrawing **all 60 card artworks** to match the new heroes. This supersedes the earlier decision to retain the sixty card illustrations. Keep the completed six original heroes as the visual anchors; preserve all 60 immutable card IDs, names, amounts, effects and type distinctions. This is art production and presentation only.

The 38 unit cards must receive distinct original full-figure/creature cutouts with real alpha, coherent contemporary comic rendering, angular material planes and dramatic controlled rim light. Avoid the old chibi proportions for adult humanoids. Each creature must remain recognizably its own subject. The 22 trick cards must receive square painted action/effect compositions with one clear focal moment and simple supporting scenery. No names, rules, numbers, borders or UI may be baked into artwork. Card names/cost/rules remain semantic text.

Dawnward shares ivory/jade/cyan/gold materials; Bastion emphasizes faceted shields and broad protective forms, Verdant emphasizes living wood/seed/leaf gestures, Prism emphasizes geometric glass and hard-light diagonals. Ashen Court shares charcoal/crimson/amber/violet; Furnace uses heavy iron/heat shapes, Hex uses abstract geometric seals/ink and asymmetric ritual props, Veil uses lean crescent/wing/smoke forms. Common cards establish faction vocabulary. Specific faces, costumes, weapons and poses must differ from the six heroes and each other.

ArtStation supplies visual/process reference, not reusable game assets or an artist-style label for generation. See `docs/reference/artstation-card-art.md` for observed sources and production principles. Generated originals and exact prompts must be retained per ID, exported to bounded WebP and complete presentation atlases, and visually inspected before integration. The runtime must load a complete non-secret art pool; eight existing terrain strips and existing token fallbacks remain supported.

The user further specifies the [Marvel Rivals Team-Up hero roster](https://www.marvelrivals.com/heroes/teamup.html) as the primary style reference for creep cards. Browser inspection confirms a preference for mature stylized heroic anatomy, faceted armor/cloth, strong silhouettes and controlled cinematic edge light. Apply those principles across the 38 unit subjects while preserving original OathFront identities and creature anatomy.
