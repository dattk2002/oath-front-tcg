### Spec Compliance

- ❌ Issues found. The main T12 feature set is implemented, but UX03 draft preservation fails after a saved revision advances, and create-error recovery can post a different deck from the newly displayed hero/preset. See Important 1–2.
- ✅ The planned hero/deck components, API service/routes, API tests and browser tests are present. Native hero radios and four inspectable powers are implemented in `apps/web/src/features/hero/HeroSelect.tsx:43` and `HeroInspect.tsx:57`; independent card/quantity controls in `features/deck/CardCollection.tsx:17`; copy-counted statistics in `features/deck/model.ts:44` and `apps/web/tests/deck.test.ts:8`.
- ✅ Draft-versus-playable validation, owner scoping, immutable version insertion, exact historical reads, stale rejection and idempotency are implemented in `apps/api/src/decks/service.ts:13`, `:41`, `:71`, `:101`; API regressions cover draft creation, immutable match snapshots, receipts, ownership, pagination and concurrent updates in `apps/api/tests/decks.test.ts:19`, `:129`, `:170`, `:225`.
- ✅ Exact-source rematch review resolves retained PRESET IDs or SAVED IDs/revisions in `apps/web/src/features/deck/DeckScreen.tsx:92`, displays original/current versions and requires explicit acceptance in `DeckBuilder.tsx:477` and `:559`. `tests/e2e/deck-builder.spec.ts:334` exercises PRESET and historical SAVED review without an inferred/latest source or pre-acceptance match creation.
- ✅ The carried malformed-authoring issue is fixed by the guarded shared validator in `packages/contracts/src/deck.ts:23`, with its regression in `packages/game-content/tests/catalog.test.ts:276`. The carried ResultDialog durability warning is preserved by `apps/web/src/features/match/ResultDialog.tsx:116` and `:155`.
- ⚠️ Whole-M4 integration and identity/claim isolation remain T14/T13 gates. Safari/real-device behavior and the older-browser traversal fallback were not independently exercised in this review. Tutorial entry remains a later task as explicitly disclosed; the current hero-screen “Học cách chơi” goes home (`HeroSelect.tsx:83`).

### Strengths

- The persistence boundary reuses principal-before-resource locking and the existing receipt mechanism. `apps/api/src/decks/service.ts:47` enters `withPrincipalTransaction` before the deck row lock at `:79`; receipt replay at `:54` precedes stale checks. The extracted `insertResourceReceipt` does not bypass the existing match-response validation (`apps/api/src/matches/receipts.ts:35`).
- Shared semantic deck validation is browser-safe and still separate from closed public request-schema validation (`packages/contracts/src/deck.ts:9`, `apps/api/src/decks/routes.ts:37`). Canonical schema, copied schema, generated DTO and generated browser validator all include the exact revision query.
- The UI retains semantic child buttons for item-surface inspection, independently labeled quantity controls, error-summary focus, native dialogs and scoped GSAP cleanup. The curve has a text-table alternative (`CardCollection.tsx:17`, `DeckBuilder.tsx:47`, `:259`, `:498`, `ManaCurve.tsx:26`).
- The retained final screenshots reviewed—hero desktop/tablet, builder desktop/tablet/mobile drawer, saved-source review and empty mobile/reduced-motion—show readable Vietnamese text, clear count/disabled states and the established game visual language. The final mobile drawer regression verifies editing, Escape and focus restoration (`tests/e2e/deck-builder.spec.ts:176`). This is a ui-ux-pro-max review of retained screenshots and code, not a new live-device verification.
- Verification accounting clearly distinguishes the functional artifact from the final three-file UI amendment. Retained logs report API 26/26, web/catalog 79/79, functional standalone 11/11 and final amended-UI 3/3, with type/lint/build evidence. The controller independently verified the final 236-source/184-artifact hashes; the final delta lists only `DeckBuilder.tsx`, `deck.css` and the browser test.

### Issues

#### Critical (Must Fix)

- None found.

#### Important (Should Fix)

1. **Move local drafts to the current saved revision when the base changes.** `apps/web/src/features/deck/DeckBuilder.tsx:113` derives the storage key from the original `saved` prop, but successful saves update only `base` (`:303`) and “Tải bản mới” also updates only `base` (`:642`). Subsequent draft persistence continues under the original revision key (`:158`). Concrete path: open revision 1, receive a stale conflict after another tab saves revision 2, choose “Tải bản mới”, make another edit, then reload. The reload fetches revision 2 and looks for key `.2`, while the new unsaved edit was written under `.1`; the edit is silently absent. Normal same-route saves also leave this mismatch unless the component remounts. This violates UX03's draft preservation. Advance/migrate the draft identity and baseline together with the confirmed/current revision, carefully retaining uncertain receipt payloads. Add a focused regression for stale → load latest → edit → reload, and saved edit → save → edit → reload.

2. **Keep selected deck source and displayed selection aligned after a definite create rejection.** `apps/web/src/features/setup/PresetSetup.tsx:120` clears `pending` and changes its internal stage to HERO, but the new `selectedSource` prop remains set. That fallback lets the player select another hero and view its preset (`:191`, `:241`), while `create()` still sends the old `selectedSource` at `:82`. For example, select an An Nhiên saved deck, receive a definite recoverable 4xx such as rate limiting, then choose Lam Vệ and confirm the displayed preset: the request still creates from the original An Nhiên deck. Switching faction can instead cause repeated invalid-opponent failures. This is incorrect source selection, not merely stale copy. Return through the owning `DeckScreen` selection/builder flow on a definite rejection, or maintain one authoritative selection state that updates both UI and outgoing source. Add a focused 4xx → choose another hero/deck → create regression asserting that the POST source equals the visible selection.

#### Minor (Nice to Have)

1. **Carry storage durability warnings through the new save/setup uncertain-result paths.** `apps/web/src/features/deck/DeckBuilder.tsx:295` warns that the save request could not be persisted, then `:327` replaces it with a generic unknown-result message. The new storage catch in `apps/web/src/features/setup/PresetSetup.tsx:91` is similarly overwritten at `:127`. The exact in-memory retries remain intact, but a reload can lose the command/body when storage is unavailable. Apply the durability flag already used correctly in ResultDialog and review-create, and retain “keep this page / do not reload” in the uncertain-result message.

2. **Runner output contains the disclosed conflicting color-environment warning.** `task-12-evidence/final/drawer-browser.log:1` records `NO_COLOR` ignored because `FORCE_COLOR` is set. This is runner noise, not an application-console defect or a reason to repeat acceptance runs. Remove the conflicting environment setting when maintaining the runner. The deliberate offline/409 browser errors are separately classified in `final/integrity-summary.json`; those expected fault-injection records are not findings.

### Review Checks and Scope

- Reviewed base `9b5351f523c916aa0f4852d4872c3c9aa68c5d48` through head `3a7b16684ef2574224c46dda3c3a0ee2300156f6`, using the provided full diff package in bounded chunks. No Git commands, source/index/branch/remote changes, broad crawl or suite reruns.
- Named cross-cutting risk: lock ordering and receipt extraction. Inspected the existing `apps/api/src/matches/repository.ts:43`, `:117`, `:169` to confirm principal locking and receipt lookup behavior.
- Named cross-cutting risk: generated browser-validator drift/private runtime leakage. Inspected the canonical-schema generator and its `--check` path (`scripts/generate-contracts.mjs:10`, `:33`, `:89`), existing parity/compiler-exclusion tests (`packages/contracts/tests/browser-wire.test.ts:8`, `:46`) and bounded generated `DeckVersionQuery` excerpts. The large generated artifact remained in review scope without dumping its machine-generated line.
- Named integration risk: restored pending create identity. Inspected `apps/web/src/features/setup/pending-create.ts:11` and the changed `DeckScreen`/`PresetSetup` call sites.
- Hunk context required for the two recovery findings: inspected the omitted continuation of `PresetSetup.tsx:125–350` and the App loading-effect dependencies at `apps/web/src/app/App.tsx:48–86`; these establish that the old HERO/DECK fallback remains reachable and that a same-screen route replacement does not itself refresh catalog/session dependencies.
- Consumed the retained test/build logs, final integrity summary and functional-to-final source delta. No existing acceptance evidence was rerun or replaced. The two Important findings follow directly from the state transitions and storage keys; neither is covered by the existing stale-load or successful-create assertions.

### Assessment

**Task quality:** Needs fixes

**Reasoning:** The server persistence and exact-source review boundaries are well structured, and the retained verification supports the main flows. The two recovery transitions can lose unsaved work or create a match from a source different from the player's visible choice, so T12 should not pass its task gate until those paths are corrected and covered by focused regressions.
