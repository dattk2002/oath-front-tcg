# Card scenes and anatomy · 22 October 2026

The [approved card contract](../design/card-scenes-contract.md) extends card presentation with integrated environmental illustrations, distinct unit/trick anatomy and bottom-center geometric rarity gems. The complete scene export is verified. Final match interaction and release checks are recorded separately below.

The [machine contract](../design/pen/design-contract.json) records the authorized `cardScenesExtension`. Its new surfaces and all 75 art identities have null Pen node bindings; no additional source frame coverage is claimed. Original Pen SHA-256 remains `a696b32daf6e03d4bfe30b825a56cfc4fdd622cc1a3c3ff8b018c70bc20903b3`.

## Scope and design decisions

- The scene inventory contains 50 collectible units, three summoned tokens and 22 tricks. Generated 53 individual opaque scene masters, retaining established character identity, grounded environments and depth. Retained the 22 existing opaque trick compositions. Masters contain illustration only; names, rules, cost, type, stats and rarity remain semantic interface content.
- `card-scenes-v1` supplies only card-facing `thumb`/`inspect` variants, merged last by both art resolvers. Transparent battlefield cutouts, low/high atlases and battle preload requests retain their existing URLs and hashes.
- Units use an armored portrait window, cost upper-left, system upper-right, centered name and opaque rules plate, attack lower-left and health lower-right. Tricks use a circular action aperture, distinct beveled body and visible Trick label, without ATK/HP sockets. Tokens retain unit anatomy and exact token rules/stats, without invented cost or collectible rarity.
- U uses a silver triangle (`#cbd5e1`); R a gold square (`#f4d06f`); SR a purple pentagon (`#c5a1ff`); SL a static prismatic hexagon (base token `#e7ddff`); E an orange-red notched crest (`#ff9875`). All gems occupy the same bottom-center socket on the card body. These latest card-face shapes supersede the earlier rail/crest examples in the elements contract. Accessible rarity code/name remains required independently of shape/color.
- The shared presentation component leaves native activation, inspection, quantities, drag/select/mulligan and commands with parent surfaces. Compact faces retain readable metadata and open complete inspect rules. Revealed events/rewards may show faces; unrevealed event identities/art stay sealed.
- Campaign card showcases use current runtime card faces. The broader shell retains Pen typography, paper/ink/slate and existing system colors. Scoped GSAP, reduced motion, cleanup, current battlefield stats and `.scene-art` hooks remain required.

The [source inventory](../../assets/source/card-scenes-v1/inventory.json) retains the canonical identities and references. The generated [provenance manifest](../../apps/web/public/assets/card-scenes-v1/source-manifest.json) and [runtime manifest](../../apps/web/public/assets/card-scenes-v1/manifest.json) bind exact prompts, built-in image generation provenance, original references, dimensions and hashes. Each of the 53 scene masters is opaque RGB at 1086×1448; deterministic WebP exports are 300×400 for thumbnails and 720×960 for inspection. Runtime scene exports total about 16 MiB. Event edits use original source PNGs rather than previously compressed inspection thumbnails.

## Verified contract checks

The pre-existing design checker failed at the baseline with `repository input drift: apps/web/src/features/motion/use-ui-motion.ts`. Inspection traced the drift to committed change `39569b560ad75b9ee5e52d822d941fe1d14027b9`: bounded pointer depth for the hero bust. That hook's working-tree bytes matched `HEAD`, so only its stale expected hash was reconciled to `bac7d2e9a8bc5412560011ecba1a99a8b8da1db4a1a6f35dc3cb6ef8a150ac8d`, with the reason stored beside the input. The later `f687349` commit did not modify this hook. Concurrent uncommitted auth/audio files were not used to refresh input hashes.

- `python3 docs/design/pen/check-design-contract.py` passed after the deliberate reconciliation: frozen source identity, 1,128 nodes, 18 image hashes, 24 baseline tokens, 67 original runtime assets, 21 campaign derivatives and 36 inherited component relations.
- `python3 -m unittest discover -s docs/design/pen -p 'test_*.py'` passed all 13 reader/derivative tests.
- Direct SHA-256 readback confirmed the frozen Pen digest above.

These checks validate the existing Pen handoff. They do not validate the newly generated scene inventory, card runtime behavior, visual quality or accessibility.

## Integration evidence

- [x] All 53 generated masters individually inspected by their art workers and reviewed together in [sheet one](evidence/card-scenes/scene-sheet-1.jpg) and [sheet two](evidence/card-scenes/scene-sheet-2.jpg). `python3 tools/assets/export-card-scenes.py` reports 53 scenes, 22 retained tricks, complete true and no missing IDs. `python3 tools/assets/inspect-card-scenes.py` passes source/export hashes, dimensions, opacity, provenance and retained tricks. Minor peripheral wing/weapon crops are recorded per source; focal character identity remains visible.
- [x] `pnpm exec vitest run tools/assets/tests`: all five files / 16 tests pass, including exact scene resolution, unchanged battle cutout/preload lists, canonical 75-card inventory and complete 53-scene coverage. Seven negative export/inspection safety cases also pass: canonical identity/path binding, both trick variants, protected output destinations, incompatible manifests and relocated cache paths.
- [x] Frontend suite: 25 files / 117 tests pass. `pnpm typecheck` and `pnpm lint` both pass. A clean release projection overlays only task-owned files onto committed HEAD, excluding concurrent auth/audio/App edits. Its Next compilation, TypeScript, 30 static pages and traces pass; standalone preparation separately passes with 841 public and 59 static files verified by SHA-256. See [build evidence](evidence/card-scenes/build.md) for the nested projection path limitation and its output-only alias. The projection’s full pnpm wrapper exits 1 at its original packaging path; this is not represented as a passing full package build.
- [x] Collection and full inspector checks pass at 375×812, 768×1024, 1024×640 and 1440×900: bottom-center gem geometry, name/rules containment, distinct unit/trick stats, focus return, independent quantity controls and no page overflow. The axe scan reports no violations. All 60 core card images load through actual hero collections; missing scene art preserves the title and retry does not open details. Representative [unit](evidence/card-scenes/unit-inspect-375.png) and [trick](evidence/card-scenes/trick-inspect-375.png) phone inspectors are recorded. The [compact match](evidence/card-scenes/flows/task16/battle-1024-640.png) keeps all phase controls within the viewport.
- [x] Seven focused browser flows pass: native touch swipe without accidental selection/commands, pointer play with stable lane geometry, and hand reachability/text geometry at 1440×900, 1366×768, 1280×720, 1024×768 and 1024×640. Eight integration flows pass for Home, Features, real deck/match entry, exact pointer/keyboard/drag intent, 30-card deck preview and WebGL motion interruption/remount/reduced motion. Four live-content flows pass cumulatively: event-card ownership/fallback, news/reveal schedule, sealed future collection and a real reward-winning battle. The reward test accepts a second tab already refreshed to Resume and still verifies the original match ID, exactly one attempt and exactly one awarded card. [Earned event card](evidence/card-scenes/flows/live-news-events/earned-card.png). No unexpected browser errors in these checks.
- [x] Independent asset/UI review and whole-change review completed; all blocking findings resolved. Closing review approved stationary frame feedback, touch/keyboard scrolling and inspector containment. Desktop/mobile emulation and automated accessibility checks do not constitute physical-device or real screen-reader certification.

No API, database, gameplay or catalog change is authorized by this card presentation extension. Existing user-owned auth/audio work and unrelated architecture/auth/motion documentation remain outside this change.

## Interaction fixes found during verification

At short desktop heights, Account now occupies a reserved header slot and hand cards use a compact horizontal face. GSAP animates clipped artwork rather than the focusable frame, preserving a stationary hit area. Arrow-key navigation explicitly scrolls focused hand cards into view. A size-contained card inspector prevents forecast content from moving lane targets during pointer activation. Full inspection remains scrollable with exact rules and stats.

One minor decorative limitation remains: if artwork fails after the first hover/focus, its existing tween may still reference the detached image until that card remounts; text, retry/inspection, focus, hit geometry and gameplay remain intact.

## Delivery

Code/art commits are prepared for the existing authorized Git integration. Production deployment identity and state are recorded after remote readback. No API, database schema, catalog values or game rules are changed by this release.
