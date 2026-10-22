# OathFront lobby UI contract

## Context and goals

The screenshot corrections approved on 22 October 2026 supersede the inherited account banner, hero selector and deck-list presentation. This extension must preserve the Pen brand, English names, artwork, catalog and gameplay. It does not add Pen frames: every new surface has a null Pen node binding. The original `.pen` file must remain unchanged.

## Foundations

Components must reuse the campaign paper, ink, slate, lilac and acid tokens and Barlow Condensed. System accent colors must match `elements-visual-contract.md`; `--system-accent` supplies crest borders and decorative glyphs. Rarity must retain the existing U/R/SR/SL/E meanings. Cost and copy count must use high-contrast text rather than color alone.

Hero names must stay whole, with no ellipsis or arbitrary word breaks. Desktop display names must scale to their available copy column. Dense roster metadata may use 12px; primary names and actions must remain larger. Images must reserve space and full-body hero art must use `contain`.

## Component rules

### Account disclosure

- The persistent game-account banner must become a named header button with an expandable panel. On battle screens, the same compact access must remain available below the board.
- AuthPanel must stay mounted while the panel is hidden. Existing login, restoration, conflict and sign-out behavior must remain intact.
- Urgent auth states must open the panel and expose an attention indicator. A user may explicitly dismiss it; the next new urgent transition must reopen it.
- Pointer/touch activates the button. Tab must reach its controls; Escape and the close button must return focus to the trigger. Outside pointer activation must close it. The panel must fit the viewport and scroll internally if necessary.

### Hero lobby

- At desktop sizes of at least 1024×640 and the tested 375×812 and 768×1024 portrait layouts, the lobby must fit the visible viewport without document scrolling.
- Desktop pages contain up to six equal cards; compact pages contain up to four. Previous/Next controls and the range must remain visible. Pagination must never change the selected hero. Crossing a breakpoint must bring the selected hero's page into view.
- Every card must reserve the same Selected footer space, including unselected cards. A native radio must provide its accessible name, checked state and keyboard behavior. The entire tile must activate that radio.
- The hero frame must contain Play and Browse decks. Play must use that hero's existing preset and open the existing opponent confirmation; it must not create a match early. Browse decks must retain the hero-specific route.
- Four power buttons must show distinct effect glyphs, names, cost, target and signature identity. Full rules and playstyle/counter notes must open accessible dialogs; expanded details must not resize the lobby.
- Very short landscape/zoomed viewports must allow document scrolling instead of clipping controls. Missing roster art must preserve the name without nesting another button in the radio tile. Full profile art must offer an independent, operable retry.

### Deck library

- The preset must be visible by default, with a hero cover, system badges, actual card artwork and a clear Use this deck action. Saved deck surfaces must select their preview; titles must remain semantic buttons, and Edit must stay independently operable.
- Preview tiles must display the exact entry quantities, energy, full English name, rarity and attack/HP or Trick. An explicit inspect dialog must expose full effects and keyword explanations. Unknown historical cards must remain visible with their ID and quantity.
- The energy curve should remain compact. Its copy-count table must be available through a keyboard-operable disclosure. Total cards must count all entries; unavailable entries must be disclosed as excluded from cost/type statistics.
- Empty drafts must explain how to add cards. Loading and error states must preserve the playable preset; Retry decks must remain available. Draft saved decks must explain why Use this deck is disabled.
- At mobile widths, covers and overview must stack; the card grid must have two columns at 375px, three on tablet, and five on wide desktop. Long user deck names must wrap.

### Shared interaction states

Default controls must identify their action; hover must change a border or brightness; focus-visible must use the existing contrast outline; active must retain immediate pressed feedback. Disabled controls must use native semantics and contextual explanation. Loading must announce status without hiding content. Errors must retain context and offer a specific recovery action. Touch targets must be at least 44×44px.

## Motion

GSAP must remain the primary engine. React Bits Tilted Card and Animated List inform restrained depth and entry timing, without introducing a dependency. Roster/deck entry uses a 280ms reveal with 25ms staggering; artwork tilt is bounded to two degrees and 1.035 scale, leaving control geometry unchanged. Hero depth is bounded to three pixels per axis. Existing hero/power reveals remain short and image-aware.

Effects must have scoped cleanup on unmount, paging, selection interruption, hidden documents and reduced-motion changes. OS or in-game reduction must settle to static content. Touch must not require hover. Animation must never control selection, focus, game state or completion of a request. CSS keyframe choreography is prohibited.

## Content and accessibility acceptance

UI must use concise English actions: Account, Play, Browse decks, Use this deck, Customize. System names and rarity codes must remain visible, so symbols/colors never carry the only meaning.

Pass/fail checks:

- Equal card dimensions, full names and profile-contained actions at the four target viewport sizes.
- All twenty heroes retain their names and controls at 1024×640 and 375×812.
- Pointer, keyboard selection, pagination, power/card dialogs and Escape/focus return operate independently.
- Deck preview quantities sum to the actual deck total; original callbacks and revisions are preserved.
- Reduced motion clears transforms; rapid selection and missing art leave readable, usable content.
- Automated accessibility checks on lobby/deck, frontend types/lint/build, and screenshot review pass. Emulation is not a physical-device or real screen-reader certification.

## Anti-patterns and migration

The old full-width auth bar, conditional card height, wrapped hero names, detached Choose Deck CTA and stats-only preset panel must not return. Icon-only powers, hidden overflow used to conceal controls, nested interactive retry buttons in roster labels, perpetual shimmer and animation-triggered match creation are prohibited.

Existing public campaign profile Choose deck actions remain unchanged. Native lobby tests must page the roster and use Browse decks or Play according to intent. The battle board and backend rules are outside this change.

## QA checklist

- [ ] Review desktop, tablet, phone and short landscape screenshots.
- [ ] Check every hero name and equal Selected slots.
- [ ] Check account recovery visibility and focus return.
- [ ] Check preset, saved, draft, empty and retry states.
- [ ] Inspect actual cards, copy counts and keyword text.
- [ ] Verify keyboard, reduced motion, interruption and artwork failure.
- [ ] Run focused browser checks, frontend typecheck/lint/build.
- [ ] Preserve the Pen source hash and unrelated user changes.

References: [React Bits Tilted Card](https://reactbits.dev/components/tilted-card), [Animated List](https://reactbits.dev/components/animated-list), [official PvZ Heroes Strategy Decks walkthrough](https://www.youtube.com/watch?v=L5qlwZscq5U). These inform visual interaction and deck discoverability; OathFront game rules remain authoritative.
