# Task 1 — English presentation and world identity

## Outcome

The current web presentation uses English for its catalog, shell, hero/deck/setup flow, battle, block and result flow, auth/recovery/settings, history, tutorial steps, accessibility labels, metadata and empty/error states. OathFront remains the brand; The Fivefold, Dawnward and Ashen Court are the current world labels. Player-entered account and deck names remain untouched.

`apps/web/src/content/english-content.ts` resolves names and exact rules by stable ID, with safe generic fallbacks. The map covers 6 heroes, 60 cards, 18 powers, 3 tokens, 8 locations and 6 presentation preset names. `factionLabel`, `classLabel`, `keywordLabel`, phase and event labels are English. The existing `core_v1`, `locations_v1`, `tutorial_v1`, wire schemas (including historical `nameVi`/`exactTextVi` fields), engine rules, stored checkpoints and hashes were not modified. Search now uses English names, rules and keywords. Tutorial copy is selected by stable step/scenario IDs, and API errors retain their code-driven branches with English messages.

`docs/PRESENTATION-EN.md` records the old-ID/old-name to English-name mapping and exact rules for every content category, plus the immutable-source boundary. Current README, docs index, `docs/OATHFRONT.md`, and root `AGENTS.md` point to the English presentation. Historical source/parity/evidence files were retained.

E2E user-visible selectors were updated for English labels and names. Vietnamese strings that represent player-entered deck/account names or fixture identity remain verbatim. The selector audit also corrected Pause vs Paused and Opponent hero wording.

## Verification

- `pnpm exec vitest run apps/web/src/content/english-content.test.ts apps/web/tests` — **15 files, 67 tests passed** (final run). The content test covers complete stable-ID catalog lookup, ordered/move/permanent/turn-limited translations, saved-match/catalog immutability, custom-name preservation, English search, generic fallbacks and faction/class/keyword labels. A new label test was observed failing before the English labels were implemented. An intermediate web run reported three stale Vietnamese-copy assertions; they were updated and the final run passed.
- `pnpm typecheck` — **exit 0**, including root and web TypeScript checks.
- `pnpm exec eslint` on 57 changed web/E2E TS/TSX files — **exit 0**.
- `pnpm exec playwright test --list` — **exit 0; 81 tests in 13 files discovered**. This parses the changed E2E files but does not run a browser.
- `git diff --check` — **exit 0**.
- Documentation table audit — 6 hero, 60 card, 18 power, 3 token, 8 location, 6 preset rows.
- Static source audit — no remaining Vietnamese display literals in active web source; legacy field names and intentional multilingual saved-name test data remain.

Per the task brief, no full 618-test suite, build, development server, or browser run was performed. Task 4 will verify the integrated visual surface and user flows after art/theme/motion work. No interactive 3000/3001 services, user database, or reserved 3100/3300 ports were touched.

## Scope for integration

This report and Task 1 code/docs/tests are the only files to commit. The controller-owned design spec/plan changes and `assets/source/rivals-v2/` are outside this task and remain unstaged. No push or deployment was performed.

## Review fix round 1 (after `e2389a0`)

The eight review findings were checked against their rendering paths and corrected together:

- Recovery failures now use shared English message constants. Successful reconnect recognizes and clears the exact latest-board and incomplete-log messages while retaining unrelated command errors. The block-recovery E2E assertion checks the rendered latest-board message and its removal.
- Preset setup, preset-source review, and preset-derived draft names resolve `presetId` to the English presentation. Saved deck names still pass through unchanged. History LOSS is `Loss`; the hero HUD resource line begins `Hand`.
- Retry artwork and lane actions include spaces in accessible names. An empty art label now falls back to `Illustration`, avoiding historical manifest copy.
- E2E hero/power selectors resolve names by stable ID. The empty-hand selector uses the rendered sentence, and the phase alternatives include `Combat`.

The new `apps/web/tests/english-presentation.test.ts` was run before implementation and failed in all five cases, exposing the missing preset/recovery helpers, malformed lane label, historical art fallback, and missing loss label. Each amended case then passed in a focused run. The test renders the actual board and hero HUD with the API's public-catalog projection and checks saved-name preservation.

Final fix-round checks:

- `pnpm exec vitest run apps/web/tests/english-presentation.test.ts apps/web/src/content/english-content.test.ts apps/web/tests/recovery.test.ts apps/web/tests/deck.test.ts` — **4 files, 25 tests passed**.
- `pnpm typecheck` — **exit 0**. An intermediate run found only that the new test's hand-built catalog lacked the API tuple shape; the fixture now uses the real `publicCatalog()` projection, and the final run passed.
- `pnpm exec eslint` on the 15 amended source/test files — **exit 0**.
- `pnpm exec playwright test --list` — **exit 0; 81 tests in 13 files discovered**. This is syntax/discovery evidence only; no browser test was run.
- `git diff --check` — **exit 0**.

The full browser suite and build remain deferred to Task 4. No application server, port, database, push, or deployment was used in this fix round.
