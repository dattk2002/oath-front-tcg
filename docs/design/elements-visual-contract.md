# Elements visual contract

## Context and goals

OathFront must make hero identity, deck systems, rarity and the daily event loop readable without sacrificing the approved Pen comic-editorial language. This is an authorized extension of the frozen Pen source, not a claim that new frames exist in Pen. New artwork and interaction surfaces must use null node bindings until a real design revision supplies IDs.

Barlow Condensed, paper/slate/lilac/acid surfaces, the angular OathFront logo and existing navigation must remain. The original Pen file must retain its hash. Gameplay and collection metadata must come from the versioned catalog, not artwork names or colors.

## Tokens and foundations

Existing semantic tokens must remain the source for backgrounds, text, spacing and focus. System badges must use an ink background, a visible SVG symbol and the system name; palette alone must not carry meaning.

| System token | Value on ink | Symbol | Strategy |
|---|---|---|---|
| system-grove | #b6ee92 | Leaf | Growth and recovery |
| system-terra | #e3bf8c | Mountain | Armor and shields |
| system-tide | #80e3e0 | Wave | Movement and recovery |
| system-tempest | #b2d9ff | Bolt | Tempo and pressure |
| system-solar | #ffe34d | Sun | Radiance and damage |
| system-forge | #ffb27d | Anvil | Constructs and repairs |
| system-arcane | #d2b6ff | Orbit diamond | Draw and control |
| system-umbral | #e6b5e5 | Eclipse | Poison and weakening |

| Rarity | Semantic token | Value | Shape |
|---|---|---|---|
| U · Uncommon | rarity-u | #cbd5e1 | Single beveled rail and diamond |
| R · Rare | rarity-r | #f4d06f | Double corner accents and two-point crest |
| SR · Super Rare | rarity-sr | #c5a1ff | Faceted rail and star crest |
| SL · Super Legendary | rarity-sl | #e7ddff; frame spectrum | Prismatic multi-color rail and crown crest |
| E · Event | rarity-e | #ff9875 | Orange-red rail and pennant |

Rarity must use a solid high-contrast code badge on ink. The SL rainbow must decorate the frame only; it must not become text color or a continuous animated shimmer. Cost, attack, HP and legal-target outlines must keep their existing meanings and draw above decoration. Powers and summoned tokens must not display collectible rarity.

Space and type must reuse the current component scale. Body labels must be at least 14px, small dense board labels at least 12px, interactive targets at least 44×44 CSS px. Display headings should wrap in two or three balanced lines. Dialog and detail copy must wrap naturally; metadata must not overlap artwork or controls.

## Component rules

Every interactive surface must implement these shared states: default uses a named action; hover uses a border/brightness cue; focus-visible uses the existing high-contrast offset outline; active uses immediate pressed feedback; disabled has a visible reason and native disabled/aria-disabled semantics as appropriate; loading reserves layout and announces progress; error keeps the user's input and offers an explicitly labeled retry. Focus must never be hidden by clipped artwork.

### Hero and system presentation

Hero lists, profiles, selection and inspect must use the same source manifest. Full-body stages must use contain framing; HUD face crops must remain recognizable at 128px. A failed image must leave a readable name and stable layout. Two system names and symbols must appear next to each current hero. Four powers must resolve from the selected catalog version; legacy matches must retain their original class and power context.

Hero cards with one destination must have one semantic primary link and card-surface pointer activation. Cards with secondary controls must keep those controls independent; interactive elements must not nest. Keyboard Enter must perform the same action as pointer/touch. Narrow layouts must stack artwork and copy without horizontal page overflow.

### Cards and deck builder

Every collectible card surface must show rarity code, system name, cost and name; inspect must show full rarity name and rules. Unit art must remain contained. Quantity controls must be independent labeled buttons and must reflect actual owned count. Base cards must always show two available copies. E cards must show 0/2, 1/2 or 2/2 and explain ticket acquisition. A locked card must still be inspectable after reveal; add must be disabled. Future weekly titles/art must follow server reveal data, not the browser clock. Filtering to no results must show a reset action.

Saving must preserve drafts on network or validation failure. New decks must show 30-card total, max two copies, max 12 Neutral and min six cards per hero system. Existing legacy decks must retain their original version until an explicit review/copy action. Faction labels must not falsely imply the new deck restriction.

### Features

Four manually controlled panels must cover Five-lane tactics, Two-system heroes, Collectible cards and Weekly expeditions. Native previous/next buttons and named tabs must support keyboard and touch. Selection must update the visible heading and panel together. No autoplay. Artwork may crossfade/translate with a scoped GSAP timeline, but rapid selection must kill/revert previous work. Reduced-motion mode must present all four sections statically. Follow the stage with phase rules, four-arena gallery and a playable CTA.

### Battlefield

Moonroot Conservatory, Cinder Foundry, Glasswater Sanctum and Astral Causeway must be decorative environment choices derived deterministically from public match data. Art must remain behind lane plates, stats and target outlines. The five equal lanes and hitboxes must remain unchanged. Canvas effects must have pointer-events none when they are decorative. A failed environment asset must retain a legible solid board. Mobile must retain the existing semantic lane-list fallback.

Ambient motion must use GSAP, pause while the document is hidden, stop under reduced motion, and clean up on unmount. It must not shake, flash or obscure actions. Selection/target feedback must take priority over ambient decoration.

### News and events

News cards and article routes must consume published DB content and show publication dates. Missing articles must show a real not-found state; API errors must show retry, not substitute fake announcements. Existing mock event URLs must explain that they were previews and link to the real season.

The event hub must show current/upcoming/archive status from server time. Upcoming entries must hide unrevealed card details. Weekly detail must show ticket progress at 1200/2400, owned copies, seven labeled daily nodes and reward history. Guests must see Practice and Google sign-in for account rewards. Account-only reward eligibility must be stated before starting. Daily borrowed decks must be explained without suggesting the player owns those cards.

Available, future, active/resume, complete, cooldown, closed and practice states must each have visible text, not just a color. A loss/surrender countdown must derive from serverNow/cooldownUntil and must revalidate at expiry and tab focus. Disconnect must lead to Resume. Starting or retrying after an uncertain response must reuse the original command ID. A reward reveal must be interruptible GSAP; persisted ownership must remain visible after navigation/reload. Reduced motion must show the final reward state immediately. Event results must return to the event, not rematch a random skirmish.

## Content and tone

Visible copy must be concise English. Use “Grove / Terra”, “E · Event”, “Owned 1/2”, “Retry in 58m”, “Resume challenge”, “Practice — no account rewards” and “Resets at 07:00 Vietnam time”. Do not use “Buy”, invented live player counts, random pack claims or promises of future functionality. Gameplay text must distinguish earned cards from borrowed challenge cards.

## Anti-patterns and migration

The implementation must not rewrite old match catalogs, use client-reported wins for rewards, encode rarity by cost, burn text into artwork, reveal future schedule details from bundled scenario files, or silently replace stale player decks. It must not use continuous CSS keyframe motion, hidden focus, tiny hit targets, rainbow body text, nested buttons, autoplay or fabricated Pen node IDs.

The eight redesigned heroes are Briar, Cairn, Rowan, Solenne, Meridian, Halcyon, Sable and Brimstone; twelve v4 identities remain. Source prompts/PNGs and derivative SHA-256 records are retained under assets/source. New masters are generated with built-in image_gen; export scripts only crop, resize and pack atlases. Home v3 updates Briar/Rowan while preserving the approved ensemble composition.

## Testable acceptance and QA

- [ ] All 20 heroes have unique system pairs and recognizably distinct silhouettes in the roster montage and HUD crop sheet.
- [ ] Every new public asset exists, matches manifest SHA-256, has expected dimensions and is below 1.5MB; cutouts preserve real alpha.
- [ ] Card code/shape/name remains understandable in grayscale; ordinary text reaches 4.5:1 and large text/control outlines 3:1 against their actual surfaces.
- [ ] Keyboard-only users can filter, inspect, adjust quantities, save, select features and start/resume challenges; focus stays visible and returns after dialogs.
- [ ] At 375px, 768px, 1024×640 and 1440px there is no page overflow, clipped action or hidden card stat; desktop target geometry still matches all five lanes.
- [ ] Loading, empty, offline/API error, image failure, locked, cooldown, active and completed states have working labels and recovery actions.
- [ ] Reduced motion has no ambient/reveal animation; rapid navigation and hidden tabs leave no running timelines or console errors.
- [ ] Daily win/loss/reload and guest/account transitions match server progress and ownership; future weekly cards are not leaked by UI projections.
- [ ] Pen source and both legacy catalog hashes are unchanged. Browser evidence and implementation verification must be recorded before checking runtime acceptance boxes.
