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
