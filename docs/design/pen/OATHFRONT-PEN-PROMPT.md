# OathFront — ready-to-paste Pen.dev design prompt

Open the OathFront repository in the same workspace as your Pen design, then paste the prompt below. Give Pen access to the referenced files and image directories. If that access is unavailable, attach those inputs before designing. A screenshot alone is insufficient. This prompt requests a design artifact; it does not authorize application changes, account creation, publication or deployment.

---

## Context and goals

Design an editable, implementation-ready OathFront interface: a bold illustrated five-lane PvE card game in The Fivefold, with black and warm-paper surfaces, electric-yellow actions, condensed display typography, angular frames and original heroic artwork.

You must preserve the working product and its approved Rivals-inspired direction. The reference is a visual influence, not permission to copy Marvel characters, logos, costumes, website assets or proprietary fonts. You must design the game flow rather than replace it with a marketing landing page. The audience is players using keyboard, pointer or touch. OathFront must remain the brand; GOOD displays as Dawnward and EVIL as Ashen Court.

You must read these repository inputs first:

- `docs/superpowers/specs/2026-10-21-oathfront-rivals-redesign.md`
- `docs/implementation/rivals-redesign.md` and `docs/implementation/rivals-redesign-qa.md`
- `docs/PRESENTATION-EN.md` and `apps/web/src/content/english-content.ts`
- `apps/web/src/styles/tokens.css`, `rivals.css`, `match.css`, `deck.css`, `shell.css`, `fonts.css` (all under that styles directory)
- `docs/ART-DIRECTION.md`, `apps/web/public/assets/rivals-v2/manifest.json`, and `apps/web/public/assets/fivefold-cards-v3/manifest.json`
- `docs/design/pen/design-contract.json` and `docs/design/pen/DESIGN-CONTRACT.md`

The source implementation is Next.js/React/TypeScript with CSS, GSAP choreography and Pixi battle rendering. You must inspect the components listed in the contract before proposing layout changes. You must report inaccessible inputs instead of inventing their contents.

## Design tokens and foundations

You must create named, editable Pen variables and reusable components. You must use semantic variables in component guidance; raw values belong in the foundation table. You must keep text, controls, borders and layout editable, with artwork as separate image layers. You must not flatten screens or bake labels into images. Pen variable names must map explicitly to the existing CSS names; their actual names must be reported after creation.

| Existing semantic CSS token | Current value / purpose |
| --- | --- |
| `--bg`, `--surface`, `--raised` | `#090b10`, `#151820`, `#222733`: dark canvas and surfaces |
| `--paper`, `--ink` | `#f0efe8`, `#101218`: light stage and readable dark copy |
| `--text`, `--muted` | `#f8f8f2`, `#bcc2ce`: text on dark surfaces |
| `--primary` | `#ffe34d`: action/focus accent with ink foreground |
| `--good`, `--evil` | `#80e3e0`, `#ff957b`: faction accents on dark surfaces |
| `--good-ink`, `--evil-ink` | `#165f62`, `#8b392b`: faction text on paper |
| `--error`, `--border` | `#ffb4ab`, `#7d8798`: error and meaningful boundary |
| `--radius`, `--control-radius` | `2px`: restrained controls and panels |
| `--display` | Barlow Condensed, Noto Sans, sans-serif |
| `--fx-kinetic`, `--fx-shield`, `--fx-growth` | `#ffe34d`, `#80e3e0`, `#b6ee92` |
| `--fx-prism`, `--fx-ember`, `--fx-ink`, `--fx-veil` | `#b2d9ff`, `#ff957b`, `#d2b6ff`, `#f0efe8` |

Headings must use locally hosted Barlow Condensed 700–900; body, rules and Unicode fallback must use Noto Sans. Body should use 16/24px, secondary copy 14/20px, meaningful compact copy at least 12/16px, and tabular stats 20–28px. Display headings should scale between 24 and 88px according to available space; the home headline must remain readable in two or three lines. Spacing must use the approved 4/8/12/16/24/32/48/64px scale. You must create clearly named Pen variables for these scale values and document them as design proposals where equivalent CSS variables do not yet exist; you must not claim new CSS tokens are already implemented.

Angular 8–16px corner decoration must sit behind full rectangular hit areas and focus outlines. Paper focus must use ink; bright faction accents must not become low-contrast text on paper. You should prefer system consistency over local exceptions. The source reference's 0px type, browser-blue text, fractional extraction spacing and counts of 107 links/15 tables/6 lists/2 cards must not override this game's readable tokens and actual component inventory.

### Original art and stable content identity

You must reuse all six original heroes and all sixty new card illustrations. You must create a roster showing all six identities and a full 60-card component gallery, using the manifest IDs to preserve the correct name/art pairing.

| Stable hero ID | Name / title | Silhouette and class identity |
| --- | --- | --- |
| `H_G_BV` | Briar — The Living Bastion | Broad female protector, ivory/jade armor, branch shield; Bastion/Verdant |
| `H_G_BP` | Aster — The Prism Sentinel | Tall male sentinel, ivory/cyan crystal lance and kite shield; Bastion/Prism |
| `H_G_VP` | Lumen — The Lightweaver | Agile aerial duelist, teal/white hard-light arcs and leaf fins; Verdant/Prism |
| `H_E_FX` | Cinder — The Furnace King | Massive charcoal/crimson forge sovereign, amber core; Furnace/Hex |
| `H_E_FS` | Vesper — The Duskblade | Lean rogue, split coat, twin crescent blades; Furnace/Veil |
| `H_E_XS` | Morrow — The Hex Architect | Masked sorcerer, violet geometric robes and seal plates; Hex/Veil |

Hero runtime variants are `thumb` (256px), `hud` (128px), `inspect` (512px) and `bust` (640×960). For example, Briar's stage is `apps/web/public/assets/rivals-v2/heroes/briar/bust.webp`. The manifest is authoritative for every path. Card `thumb` (256px), `inspect` (512px) and unit-only `cutout` (512px) paths are in the `fivefold-cards-v3` manifest. Its 38 units have real alpha; its 22 tricks are opaque square scenes. For example, `GC01` is Lanternkeeper, with `cards/gc01-thumb.webp` under that asset directory. Original PNGs, exact prompts and provenance must remain intact under `assets/source/rivals-v2` and `assets/source/fivefold-cards-v3`.

You must keep full unit silhouettes and trick focal events visible in collection art slots. Hero stage art must retain its silhouette; intentional thumb/HUD crops must retain identity. You must use the new Fivefold board (`board/scene.webp` art key, `wide` manifest variant). Existing core power/token images and all eight Location strips must stay supported. You must not regenerate assets, substitute stock art, recolor character identities or reveal hidden assignments through selective asset loading.

## Component-level rules

For every interactive component you must document anatomy, variants, spacing/type variables, default, hover, focus-visible, active, selected, disabled, loading, error, empty and recovery states. If a state is inapplicable, you must state why. You must include long text, missing images and interrupted operations. Loading must preserve dimensions and prevent duplicate submission. Selected states must include text or a shape, not color alone. You must specify keyboard, pointer and touch behavior for each component family.

| Screen / component family | Required composition, states and actions |
| --- | --- |
| Shell and home | Compact black navigation, OathFront identity, account/guest state, current destination, Settings and History. Home uses Briar/Cinder on a dark/paper stage, “FIVE LANES. ONE OATH.”, Play now or Continue match, and Learn to play. Include initial loading, no session, active match and connection failure/retry. |
| Hero select and power inspect | Six whole-tile native radio selections, named factions, readable selected marker below portrait, paper stage with full hero/title/classes, four exact powers and Choose deck. Include each hero selected, power inspect, missing art/retry and rapid selection. Arrow keys must change native radio selection; touch must select the whole tile. |
| Deck list, builder, collection and review | Preset/custom deck choice, new/edit/review, named search and class/cost/type filters, 30-card progress, mana curve, maximum two copies and independent +/− controls. Include empty/filter-no-results, invalid/underfilled/full deck, save/loading, stale/error/uncertain retry and long user deck names. Card surface must inspect; quantity/retry controls must not trigger inspect. |
| Match setup | Selected hero/deck, opponent hero, Easy/Normal difficulty, readable summary and start action. Include insufficient/invalid selection, pending creation, committed creation/reload and failure with explicit retry. |
| Mulligan | Four opening cards with keep/replace selection, count and Confirm mulligan. Include none/some/all selected, pending confirmation and failed confirmation. Pointer, keyboard and touch must reach the same choices without drag. |
| Battle | Five ordered lanes 1–5, enemy and player hero HP/block/energy, phase/turn, location states, units, hand, powers, End phase, pause, inspect and grouped log. Include empty/occupied lanes, legal/illegal targets with reasons, selected hand/power, affordable/unaffordable cards, statuses, hidden/revealed locations, both factions and long names/rules. Cost sits upper-left; name at most two lines with full inspect; art and exact rules remain separate; ATK/HP are distinct on units, never invented on tricks. |
| Block response | Incoming context, exact offered power, signature/free-response identification, Use now, Keep for later and target-selection state. Include unavailable targets/pending action and keyboard focus movement without exposing hidden powers. |
| Pause and recovery | Pause/resume, offline/reconnect, stale/snapshot failure, uncertain command retry, expired session/renewal, storage unavailable and missing atlas/image retry. You must preserve explicit recovery choices and saved intent; animation must not replay a command. |
| Results and history | Win/loss/draw result, existing summary/review/rematch actions and history/detail navigation. Include no history, loading, error/retry, long deck/account names and unavailable records. Row/card surfaces must open their primary destination with a semantic named link/button. |
| Settings and tutorials | Existing audio, reduced-motion and VFX controls; both faction tutorials, step/skip/end controls, inspect and completion. Include changed/persisted settings, tutorial pause/reload/recovery, each tutorial power branch and focus clearance at compact height. |
| Auth and merge/session dialogs | Guest play, provider sign-in, account/claim flow, merge conflict choices, expired session, logout and provider failure/retry. Existing actions and user names must stay intact; no new auth mechanism or fabricated provider state. |

Reusable components must include action buttons, navigation items, form controls, radio hero tiles, hero stage, unit/trick/power cards, quantity controls, stat plates, lane/target indicators, phase strip, log rows, status/empty/error panels, and native-dialog visual shells. You should use shared instances and document deliberate overrides. The design must retain semantic structure for headings, forms, tables and dialogs; art and Pixi effects must remain supplemental to the accessible DOM.

### Responsive behavior

You must provide 1440×900 desktop and 1024×640 landscape layouts for every major screen and overlay. The compact battle must keep all five lanes, hand, readable targeting and End phase reachable; secondary inspect art may collapse. Desktop unit art uses the existing 88×88 area beside stats. You must provide 375px-wide mobile layouts for home/roster/decks/setup/history/auth/settings/tutorial entry and a clear English small-screen battle fallback with existing navigation/recovery actions. You must not imply a newly supported full portrait battle board.

You must annotate fluid resizing, safe areas, wrapping and scroll containers, including 200% zoom/reflow. Long user content must wrap without translation. Full names/rules, primary actions and focus must remain reachable with no page-wide horizontal clipping. Dialogs must scroll internally when needed without covering focused controls. Empty/loading/error variants must preserve useful layout dimensions.

### GSAP motion handoff

You must provide annotated start/end frames and timing cues for the existing GSAP system; a static Pen file is not evidence of runtime animation. Home art reveal is 480ms; selected hero reveal 300ms with 25ms power stagger; panel/dialog entry 240ms; phase label 180ms; reversible card focus/hover feedback 120ms. Fine-pointer home parallax must stop when hidden or reduced motion is enabled. Hero art must decode before its reveal, while names and controls remain available immediately.

You must follow `apps/web/src/features/match/motion/event-timeline.ts` for battle budgets: draw 220ms, unit deploy/move 300ms, attack anticipation 180ms, combat damage 300ms (other damage 200ms), status/stat 150ms, death 180ms, location reveal 600ms, block/heal 250ms, signature 550ms (never over 900ms), result 600ms. EVIL anticipation starts 80ms before GOOD; damage presentation commits at the existing shared 40% beat. These are presentation cues, not new gameplay order or timing. Seven effects must remain distinct: kinetic slash, faceted shield, growth bloom, prism shards, ember burst, ink seals and veil ribbons.

GSAP must own choreography with scoped cleanup; Pixi must remain the battle renderer. Only simple hover/focus state feedback may use CSS transitions. You must not specify CSS keyframe sequences, timer-driven choreography, full-screen flashing or a continuous particle flood. Both OS and game reduced-motion settings must produce readable static/short-fade states with all actions intact. You must annotate rapid selection/unmount cancellation, hidden-tab/pause handling, low-VFX behavior and reconnect fast-forward for cosmetic backlog over two seconds. Native dialog dismissal/focus return must remain immediate. Tween callbacks must never submit gameplay commands or change authoritative revisions.

## Accessibility requirements and testable acceptance criteria

The design must target WCAG 2.2 AA, with these additional product constraints:

- Normal text must measure at least 4.5:1; large text and meaningful control/focus boundaries must measure at least 3:1 on their actual background, including paper, overlays and error states. You must report measured pairs.
- Pointer/touch targets must measure at least 44×44 CSS px with at least 8px gaps. Hit areas and focus rings must remain outside angled clipping.
- Every action must work with keyboard, pointer and touch. A tester must be able to select hero/deck, confirm mulligan, select a card/legal target, end phase, inspect, pause and recover without hover or drag.
- Focus must remain visible and unobscured by product panels. Tab order must match reading order; radio arrows must work. Modal focus must stay inside while open and return on close. Escape must preserve each dialog’s existing behavior: Pause submits `RESUME` when allowed, or cancels its surrender/skip confirmation step first; disabled Pause cannot resume. Result prevents Escape dismissal and uses its explicit exit actions. Other dialogs retain their own cancel/close behavior.
- Item surfaces must perform their one primary action through the same path as a real named child link/button. Secondary quantity/retry controls must have independent labels and stop parent activation. Interactive elements must not nest; native table semantics must remain intact.
- Full rules/names must remain accessible when visual titles truncate. Images must have meaningful names where informative; decorative art/canvas must not duplicate announcements. Important state batches must use restrained semantic announcements.
- At each specified viewport and 200% zoom, testers must reach content, focus and actions without clipping. Reduced-motion testing must preserve legal-target information and every command path.

## Content and tone standards with examples

All product copy, metadata, accessible names, labels, tutorials and errors must be concise English. Examples: “Choose your hero”, “Deploy units”, “Play tricks”, “End phase”, “Use now”, “Keep for later”, “Connection lost. Your match is saved.” You should use short descriptive actions rather than vague labels. User-entered account and deck names must remain exactly as entered in any language.

All hero/card/power/location/keyword names and rules must come from the stable-ID English catalog. You must preserve every amount, target, duration, ordering and trigger; you must not paraphrase exact rules for visual brevity. Runtime rules, phase order, legal targets, stats, bot behavior, immutable `core_v1`/`locations_v1`/`tutorial_v1`, wire schemas, checkpoints and receipt/revision semantics must remain authoritative and unchanged. A conflicting design must be flagged, never silently applied.

## Anti-patterns and prohibited implementations

You must not ship flattened screen images, guessed node IDs, fake Pen integration claims, new mechanics, hidden legal-target information, hover-only rules, redundant Open/View buttons, low contrast, clipped focus, tiny hit areas, fake trick stats or one-off type/spacing exceptions. You must not import the reference's dashboard inventory, zero-size type, unlicensed font or Marvel assets. You must not introduce marketing scroll-pinning into the playable board or let motion delay commands/dismissal. You must not replace immutable source records with translated copies.

## Deliverables and QA checklist

You must deliver one real editable `.pen` file, preferably saved as `docs/design/pen/oathfront-rivals.pen`, plus any required local image/library dependencies. That filename is a requested destination, not an existing file. You must include a foundations/variables board, reusable component/state library, all screen/responsive variants, six-hero roster, all sixty card instances, interaction/accessibility annotations and GSAP cue boards. Screenshots should accompany the editable file for review but must not replace it.

You must supply an inventory of the actual file version, actual frame/component/instance IDs, actual variable names/themes, stable asset IDs/paths, and unresolved conflicts. These must be read from the saved design, never fabricated. You must leave Codex's contract `awaiting_design` until the real file is inspected and mapped; you must not claim implementation or approval through this prompt.

- [ ] All required screens, three viewport conditions and 200% reflow are represented.
- [ ] Every interactive family has explicit states and keyboard/pointer/touch rules.
- [ ] All 6 heroes and 60 cards use correct ID/name/art pairings; no clipped silhouettes or baked UI text.
- [ ] Variables/components remain editable; proposed new tokens are labeled as proposals.
- [ ] Contrast, targets, gaps, focus, modal return, long content and missing-art recovery have testable annotations.
- [ ] Motion/reduced-motion/interruption and authoritative combat boundaries are documented.
- [ ] Exact English catalog text and arbitrary user names are preserved.
- [ ] Real source identity and mapping inventory are delivered; unresolved items are explicit.
- [ ] A reviewer must compare design against existing runtime behavior before any implementation; design review must not claim browser, physical-device or release acceptance.
