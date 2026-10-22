# Playable heroes and expanded Home — implementation design

Date: 2026-10-22. User authorizes integrating all fourteen designed heroes, expanding Home using Wild Rift as a structural reference, generating a new ensemble banner using the supplied image's poses/composition, and **redesigning all twenty heroes** for one consistent Marvel-inspired visual direction. Existing English OathFront names, factions and TCG kits stay intact. Existing authorization covers scoped commits and push; no manual production deployment.

## Gameplay/content

Add immutable `heroes_v1`: 20 heroes (10 per faction), 32 powers (12 shared +20 signatures), 20 starter presets, existing 60 cards/8 locations/3 tokens. The fourteen signatures and class allocations are defined by `docs/design/heroes-expansion/roster.json`; these now become playable proposals with exact candidate values. Presets use the existing matching-class baseline decks, separately identified for each hero; do not claim optimized balance.

Preserve canonical `core_v1` hash `37ec966ce1e734e8e5f85310e384ea0d1c4a126eea4618471ea874d60546cdcc`. Preserve all six original core heroes/powers/presets, tutorial_v1 and locations_v1. Reuse core card/token/power definitions by reference where unchanged; new signature definitions belong to heroes_v1. New catalog presets use heroes_v1. No mass migration of saved decks or matches.

Export `heroesCatalog`, `currentCatalog`, `catalogForVersion(version: string): Catalog | undefined` from game-content. Runtime APIs and setup select the requested supported version; hero/power engine lookup selects state.versions.content, including mulligan, block response and preview. Card/token/location mechanics remain core-identical.

Both catalog endpoints must remain immutable and hash-correct. Register and verify both content releases without overwriting either. Readiness/repository loading/replay must accept both supported versions and reject unknown versions. Schema must admit the new IDs and enforce correct version-specific catalog counts; adding enum values must not make new IDs valid in a core_v1 match.

Old core_v1 decks remain readable/editable and may be used as compatible unchanged-card inputs for a heroes_v1 skirmish if their hero is one of the original six. Reverse compatibility is prohibited. Their stored revision/content version must not be rewritten by reads or match creation. Pending commands/receipts and rematch intent must retain original IDs/body/version. Server must explicitly reject missing/cross-version heroes instead of dereferencing undefined. Tutorials stay core_v1.

Use existing effect primitives, including selected target/lane rules, independent-effect ordering, no retarget after disappearance, nonstacking Shield/Armor/Poison, full-ATK separate Pierce packet, simultaneous all-unit damage and one-attack-per-turn movement. No extra passives or new card rules.

## Artwork

Generate twenty original full-body transparent hero illustrations under `assets/source/heroes-v4/`. Keep old source images. Broad archetype references include powered armor (Iron Man), weather command (Storm), compact creature engineering (Rocket), oceanic royalty (Namor), dimensional scholarship (Doctor Strange), agile armored hunters (Black Panther), charged projectiles (Gambit), and close-range ferocity (Wolverine). They inform silhouette/pose/materials; preserve original OathFront identities, palette and equipment motifs. Do not import Marvel names, logos or artwork into the product.

Use a unified angular comic style, exaggerated readable proportions, sharp material planes, controlled linework and colored rim light. Dawnward: ivory/navy/teal/gold. Ashen Court: charcoal/plum/rust/ember. Vary age/body/build/species and equipment. Existing names and kit semantics must not change merely to match a reference. All twenty profiles, native selection, HUD and inspection must use the new presentation consistently. Generate dedicated source/optimized manifest and contain/portrait variants; preserve alpha and inspect crops.

Generate a landscape Home banner under `assets/source/home-v2/`: original OathFront ensemble, diagonal airborne/charging/casting poses flowing across the right and lower edge, pale paper space on left for live title/actions, yellow/teal/lilac accents, no baked logo/text/platform marks. Reference image is `/home/bia/Downloads/original-ede318d9bcb30efbfe5f1e48f7534177.webp`, inspected directly. Use built-in image_gen, record exact prompts/provenance/hashes and copy all final deliverables into repo.

## Home and UI

Preserve Pen-derived logo, Barlow Condensed and paper/slate/lilac/acid tokens. Latest user instruction overrides the old single-banner Home composition. Frozen Pen bytes remain unchanged; contract must record the Home/roster/art extension as implemented derived work with null new frame IDs.

Home becomes a coherent long page: new ensemble hero and Play/Learn actions; concise gameplay introduction with five-lane/four-phase explanation; featured heroes with real profile links; deck/card showcase using actual 60-card content; existing clearly labeled editorial items; closing Play/Learn action. Follow Wild Rift's progression from introduction/news to champions/gameplay/world as a structural reference, without copying MOBA/team/ranked/download claims. OathFront is browser PvE, no install required. Use existing available editorial copy, no fabricated live announcements.

Roster counts, hero navigation, filters, API selections, opponent dropdown, four-power profiles, deck starter names and artwork must cover all twenty. Use responsive grids rather than squeezing twenty radios into the original fixed layout; all controls remain keyboard/touch reachable. Hero detail navigation uses dynamic roster count. Public browsing must remain available if game API fails. Play resumes the active match before creating another.

GSAP is primary motion engine: scoped enter/reveal/feedback, cleanup on navigation/interrupt, reduced motion static readable state. No game operation waits for animation. Avoid perpetual moving text, autoplay audio/video and forced scroll pinning. All targets >=44px, visible focus, base body 16px, no horizontal overflow at375px, meaningful status not color-only.

## Sequential milestones

M1 content/contracts and registry; M2 engine/bot power execution and legacy replay; M3 API/deck/persistence compatibility; M4 twenty artworks/banner and manifests; M5 Home/public/game UI; M6 browser/integration/visual review, docs, commits/push and refresh local runtime.

Use TDD for content boundary, engine effects and API compatibility. Reuse existing invariant/flow tests; do not repeatedly rerun heavy balance/hardware benchmarks. Run focused suites per milestone, then typecheck/lint/build and one broad integration/browser pass when code is ready. Independent final review and objective fixes are required. Human balance/physical-device/real assistive-tech holds remain explicit.

## Workspace and operational boundaries

Work in the already authorized main checkout; preserve unrelated uncommitted audio work and next-env.d.ts. Test only isolated oathfront_verification_test DB on loopback55432 and UI3200/API3121 (3101 belongs to another app). Current interactive UI3000/API3001 was started for the user. Keep it running during development where possible; refresh only the OathFront launcher after verified integration so the requested new content becomes available, preserving player data. Do not reset/surrender a user's active match. No credential output, cloud migration or unrelated service restart.

## Verification acceptance

- All twenty heroes can start matches as player or opposing bot and receive exactly their four powers without repetition.
- All fourteen signatures execute their documented effects, targets, costs and timing; block use is free only in its existing window.
- Core hash and legacy replay remain identical, old deck versions unmodified, unknown/mismatched versions rejected.
- New match persists/reloads/results/rematches with correct IDs, content version and art; bot produces only legal actions.
- Home has real multi-section content and working links/actions at desktop/tablet/mobile, reduced motion and enlarged text.
- Every hero cutout/profile/HUD loads; all source/runtime hashes documented, no copied Marvel asset or invented Pen mapping.
- Report actual test results and balance limits, not a claim of perfect balance.
