# OathFront Pen design implementation

## Approval and source

The user approved recommendations 1A–7A and all seven sequential milestones, with an additional instruction to stay close to Pen. This document records that approved description; it does not introduce another approval gate.

Authoritative design: `docs/design/pen/oath-front-tcg-design.pen`, version 2.20, SHA256 `a696b32daf6e03d4bfe30b825a56cfc4fdd622cc1a3c3ff8b018c70bc20903b3`. Preserve its bytes. The file has 42 top-level frames, 9 reusable origins, 98 reference instances, 29 variables and 18 local image dependencies. Earlier handoff path/hash and screenshots must be reconciled against this snapshot. Use a content-addressed revision and do not invent a Pen document ID or schema validation result.

## Intended result

Implement the supplied Home, News/article, Events/detail, Game Features, Heroes list and six hero profiles. Match the actual composition, original vector logo, full-body artwork, promotional backgrounds, paper/slate/lilac/acid colors and Barlow Condensed typography. The same identity must extend to existing in-game screens while preserving their working structure and mechanics. New layouts or states absent from Pen are approved derived work, explicitly distinguished from actual Pen mappings.

Home becomes the public entry. Play now resumes an active match, otherwise opens the existing hero/deck flow. Profile Choose deck preselects that hero; an active match must not be replaced or silently abandoned. Guest play and Google authentication remain optional and retain recovery semantics. Public browsing must remain usable if the game API is unavailable, with a readable retry for game/account actions.

## Scope and builder decisions

- Use existing Next.js/React/TypeScript, CSS, GSAP and Pixi. No new CMS, backend feature or database migration.
- Preserve `/heroes` as native game selection and all existing deck/match/history URLs. Public Heroes uses `/explore/heroes` and `/explore/heroes/[heroId]`; News uses `/news` and `/news/[slug]`; Events uses `/events` and `/events/[slug]`; features uses `/game-features`. This avoids breaking existing links and recovery.
- News and Events are static editorial mocks with visible labels. Provide functional filters and every listed item's detail, using the supplied detail composition and clearly marked draft content. No fake dates, signup, prizes, rewards, pagination to nonexistent pages or admin UI.
- Use Barlow Condensed for UI, including readable body weights; retain Noto Sans as Unicode fallback. Bundle licensed local fonts. Preserve user-entered names and exact ID-keyed rules.
- Reuse all supplied art; optimize copies for runtime. Original Pen assets remain intact. New promotional scenes do not replace gameplay board/location definitions. Existing 60 card illustrations remain unchanged.
- Keep public navigation/account entry close to Pen. Account controls, Settings, History and recovery remain accessible through a compact account/menu surface rather than forcing the old auth strip above the marketing hero. In-game navigation stays compact.
- Desktop reference 1440×900, compact 1024×640, mobile 375px and 200% reflow. Campaign tablet layouts are derived from desktop/mobile. Small-screen battle fallback remains; no new portrait battlefield.
- Barlow's small Pen copy may be raised to readable sizes; focus indicators, 44px controls, 8px gaps and error/loading/empty/retry states may be added. Record actual deviations; do not casually redesign layout.
- GSAP supplies purposeful entrances, hero/card interaction feedback and panel transitions. Keep scoped cleanup, interruption, reduced motion and low VFX. Preserve authoritative phase order, timing caps and all gameplay actions outside animation callbacks.
- Implement milestones inline and sequentially, then one independent final review. Use focused regression checks and visual browser evidence; do not repeat the full suite for every style adjustment.
- Work in the user-designated existing checkout on main, as previously authorized. Preserve user-owned `apps/web/next-env.d.ts`; exclude it from commits. Commit coherent milestones and push after final verification as already authorized. This implementation does not need cloud mutations.

## Contract model

Upgrade the null-source-only contract to version 2. Verify exact source identity, all reference origins, nested descendant override targets, variables, relative images and token/asset identities. Record raw and resolved design inventory. Screen nodes are compositions, not automatically reusable origins; never manufacture origin IDs for App or pages.

Readiness is scoped: the supplied campaign screens and user-authorized derived game skin can be implementation-ready while complete Pen coverage of the original twelve gameplay families remains false. Keep missing Pen bindings explicitly null and explain their inherited-runtime basis. Maintain actual code path/component mappings as components are implemented. Check source/design drift without silently rewriting pinned hashes. Browser evidence is a separate implementation gate.

## Acceptance

1. Contract points to this exact file/hash and read-back IDs, every shipped asset resolves, and a corrupted ref/path/hash fails validation. Full-schema/rendering limitations remain explicit.
2. Desktop/mobile Home, Heroes list/detail, News/Events and features visually follow the provided design. Review at least representative source-matched screenshots side by side; no unsupported claim of pixel-perfect rendering.
3. Public navigation, filters, detail links and back navigation work. Unknown hero/slugs return 404. Every list item has a semantic primary link and a usable item surface; no nested links/buttons.
4. Guest Play now, selected-hero Choose deck, active-match resume, tutorial, Google/account entry and session recovery preserve current intent. Navigation never silently starts or surrenders a match.
5. Game card names/rules, all 60 images, five lanes, hand stats/trick cues, phase controls and existing dialogs remain readable and functional at supported battle sizes. Full Escape behavior is preserved.
6. Mobile/reflow has no accidental horizontal clipping; focus remains visible; reduced motion and missing artwork remain usable; browser console has no new errors.
7. Focused new tests, existing relevant integration/browser checks, final typecheck/lint/build and whole suite pass or any external limits are documented. Physical-device/performance/balance holds are not cleared by this redesign.
