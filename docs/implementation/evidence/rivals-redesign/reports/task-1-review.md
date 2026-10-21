### Spec Compliance

- ❌ Issues found. Stable-ID English catalog coverage, immutable content boundaries, metadata, tutorial copy, most UI/error/ARIA paths, and separate English documentation are present (`apps/web/src/content/english-content.ts:1`, `apps/web/src/app/layout.tsx:10`, `apps/web/src/features/tutorial/tutorial-controller.tsx:6`, `docs/PRESENTATION-EN.md:1`). However, active UI still renders Vietnamese in the history loss state and hero resource count (`apps/web/src/features/history/HistoryScreen.tsx:113`, `apps/web/src/features/match/HeroPanel.tsx:77`). Preset setup and preset-source review still display historical catalog names (`apps/web/src/features/setup/PresetSetup.tsx:277`, `apps/web/src/features/deck/DeckScreen.tsx:117`), contrary to English presentation by stable ID.
- ❌ E2E label updates are incomplete: several changed tests target labels the changed UI does not produce (`tests/e2e/deck-builder.spec.ts:81`, `tests/e2e/asset-fallback.spec.ts:35`, `tests/e2e/input-parity.spec.ts:71`, `tests/e2e/responsive.spec.ts:254`, `tests/e2e/block-recovery.spec.ts:545`). Their underlying behavioral assertions remain in place, but these selectors would stop those paths before the assertions run.
- ⚠️ Browser execution and final build were explicitly deferred by this task brief. The reported 67 focused tests, typecheck, lint, and Playwright discovery were not rerun. The diff supports those claims as implementer evidence, but it cannot establish browser success.

### Strengths

- The content resolver freezes entries, has generic unknown-ID fallbacks, and leaves catalog/wire objects untouched (`apps/web/src/content/english-content.ts:1`, `apps/web/src/content/english-content.ts:414`). Coverage tests enumerate the immutable catalog IDs and check saved object/custom-name preservation (`apps/web/src/content/english-content.test.ts:16`, `apps/web/src/content/english-content.test.ts:60`).
- English names and rules reach cards, powers, locations, search, the board, hand, inspection, and small-screen text board (`apps/web/src/features/deck/model.ts:28`, `apps/web/src/features/match/Board.tsx:62`, `apps/web/src/features/match/MatchShell.tsx:97`). Tutorial instructions use stable step IDs (`apps/web/src/features/tutorial/tutorial-controller.tsx:7`).
- Sampled higher-risk translations against unchanged source definitions: B03 adjacent allies, F03 turn-limited attack, X03 permanent attack, S_G_BV shield/permanent health, S_E_FX ordered damage, Volcano, Healing Spring, and Ruined Arena retain their target, trigger, amount, duration, and ordering semantics (`packages/game-content/src/core/cards.ts:225`, `packages/game-content/src/core/cards.ts:1173`, `packages/game-content/src/core/cards.ts:1437`, `packages/game-content/src/core/powers.ts:377`, `packages/game-content/src/core/powers.ts:487`, `packages/game-content/src/core/locations.ts:18`, `packages/game-content/src/core/locations.ts:76`, `packages/game-content/src/core/locations.ts:90`). This was a focused source check for the named translation risk, not a full independent audit of every rule.

### Issues

#### Critical (Must Fix)

- None identified.

#### Important (Should Fix)

- `apps/web/src/features/match/use-match.ts:140`: Success recovery clears messages beginning `Latest board unavailable` or `Incomplete battle log`, but the failure paths set `The latest board could not be loaded...` and `The battle log is incomplete...` at lines 153 and 205. Successful reconnect therefore leaves stale failure status. Use stable status state or match the actual messages; update `tests/e2e/block-recovery.spec.ts:545` to assert the text actually rendered and its removal after recovery.
- `apps/web/src/features/setup/PresetSetup.tsx:277`, `apps/web/src/features/deck/DeckScreen.tsx:117`: The preset screen and preset-source review use `preset.name`, which is historical source content (for example, `D_G_BV` is `An Nhiên` in `packages/game-content/src/core/decks.ts:4`). Resolve preset IDs through `contentName` or the existing English preset map before presenting or seeding a review deck. Preserve genuinely player-entered deck names.
- `apps/web/src/features/history/HistoryScreen.tsx:113`, `apps/web/src/features/match/HeroPanel.tsx:77`: The LOSS result remains `Thua` and the resource line begins `Tay`. Both are visible on current paths and violate the all-English requirement. Translate both and add focused assertions for these states.
- `apps/web/src/features/match/ArtImage.tsx:28`, `apps/web/src/features/match/Board.tsx:192`: Template literals omit a space, producing accessible names such as `Retry artBriar` and `Choose lane1, legal target`. Updated E2E tests require `Retry art Briar` and `Choose lane 1, legal target` (`tests/e2e/asset-fallback.spec.ts:35`, `tests/e2e/input-parity.spec.ts:71`); the tests will fail and the spoken labels are malformed. Add the spaces to UI labels.
- `tests/e2e/deck-builder.spec.ts:81`: The six-hero test still asks for `hero.nameVi` and `power.nameVi` at lines 81 and 86 while `HeroInspect` presents stable-ID English names (`apps/web/src/features/hero/HeroInspect.tsx:65`, `apps/web/src/features/hero/HeroInspect.tsx:94`). Translate expected names by ID while keeping the four-powers/signature assertions.
- `tests/e2e/responsive.spec.ts:254`: The empty-hand test expects `Hand empty.`, while the UI renders `Your hand is empty.` (`apps/web/src/features/match/Hand.tsx:145`), so the pending-command/render-fallback test stops before its behavior assertions. Match the actual English copy.

#### Minor (Nice to Have)

- `apps/web/src/features/match/rendering/asset-manifest.ts:18`: With an empty caller label, fallback art uses the immutable manifest's Vietnamese `fallbackLabel` before the new English `Illustration` default. The home board passes an empty name (`apps/web/src/app/App.tsx:351`), so failed home art can expose historical copy. Resolve by asset ID through English presentation or use the generic English fallback for empty labels.
- `tests/e2e/match-foundation.spec.ts:178`: The phase-label assertion still includes `Giao tranh` and omits `Combat`, the active English phase label (`apps/web/src/features/match/labels.ts:17`). This can make the test fail when sampled during combat; replace the old alternative.

### Assessment

**Task quality:** Needs fixes

**Reasoning:** The architecture keeps immutable game data separate from English presentation and covers most surfaces, but missed source-derived display names and stale recovery message matching are task-blocking. Multiple E2E selectors were updated to strings the UI does not render, so Playwright discovery is not evidence that those flows pass.

**Checks:** Read the review package in bounded sections and made focused source checks for translation semantics and preset/art fallback provenance. No tests, build, browser run, git mutation, or source edits were performed.
