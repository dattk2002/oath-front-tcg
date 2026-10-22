# Twenty playable heroes and expanded Home

The user approved fourteen playable additions and a unified redesign of all twenty hero illustrations plus the Home banner. Implementation follows [the six-milestone plan](../superpowers/plans/2026-10-22-playable-heroes-home.md) and [approved scope](../superpowers/specs/2026-10-22-playable-heroes-home-design.md).

## Delivered behavior

- `heroes_v1`: twenty heroes, thirty-two powers, twenty legal thirty-card starter presets, unchanged sixty-card pool. Fourteen new signatures use the established engine primitives, including targeting, movement, stat duration, Shield, Armor, Poison, summons, damage batches and free Block responses.
- `/api/v1/catalog/core_v1` and `/api/v1/catalog/heroes_v1` are immutable supported catalogs. Setup, grants, legal actions, previews, bot decisions, persistence and replay resolve the match's own version. New hero IDs cannot enter a core-only request.
- Old saved deck revisions/checkpoints are preserved. Pending legacy rematch/review-create commands retry the exact accepted body and command ID after reload, even when the current UI catalog is newer.
- Public profiles, native selection, starter decks, opponent choices and battle art cover all twenty heroes. Each profile exposes its four actual powers; names and presentation are English.
- Home now contains ensemble/play actions, interactive five-lane/four-phase explanation, featured heroes, real cards/deck rules, existing Fivefold editorial routes and a closing play action. Sample editorial remains labeled. No fictional multiplayer, shop or ranked availability is advertised.
- GSAP entrance, scroll reveals and hover motion are scoped, reverted on unmount and disabled by reduced-motion preferences. Rules/actions remain usable when images fail.

## Artwork and Pen handoff

[Current art direction](../design/heroes-v4.md), [roster](../design/heroes-expansion/roster.json), [Pen contract](../design/pen/DESIGN-CONTRACT.md). Twenty original transparent PNGs and exact prompts are retained in `assets/source/heroes-v4`; eighty runtime WebP crops total 7,198,520 bytes. The eight-character banner has 1920/1200/768-wide exports; the largest is 427,286 bytes. The previous image packs remain historical sources.

The frozen Pen SHA-256 remains `a696b32daf6e03d4bfe30b825a56cfc4fdd622cc1a3c3ff8b018c70bc20903b3`. The new Home and fourteen added profiles are explicit derived extensions; no nonexistent node bindings were invented. The Pen logo, Barlow typography and paper/slate/lilac/acid UI palette remain authoritative.

## Verification

Completed milestone checks before final integration:

- Content/contracts: 70 assertions. Immutable core canonical SHA-256 remains `37ec966ce1e734e8e5f85310e384ea0d1c4a126eea4618471ea874d60546cdcc`.
- Engine/bot: 409 assertions across 21 files, including literal outcomes for all fourteen signatures, invalid targets/full lanes, initial and Block grants, preview parity and legacy determinism.
- API/database: 25 focused assertions across four files using the isolated verification database, including new hero saved decks, create/reload/replay and unchanged old revisions.
- Frontend: 91 assertions (concurrent unrelated audio work excluded from this focused run).
- Next production build, root typecheck and lint passed.
- Seven focused production-browser cases passed: desktop/tablet/mobile Home, twenty profiles, real Solenne-versus-Vanta create/reload, mobile long-name geometry, missing banner fallback and both legacy pending receipt recovery paths.
- Independent review found four important issues; fixes and regressions were checked. Focused re-review found no remaining important issue. Combat copy now correctly describes simultaneous strikes within each lane, mobile long names fit and Vanta's decorative background stays behind artwork.

Representative [mobile evidence](evidence/playable-heroes-home/README.md) is committed. Full browser evidence is local at `.superpowers/sdd/2026-10-22-playable-heroes-home/browser/`. At 375px, the initial-viewport banner renders correctly. A Chromium full-page capture after scrolling can omit that decoded image; the separate first-viewport and live-probe images verify rendering. This is recorded as a capture limitation, not a reproduced product defect.

Final integration run:

- Full unit/integration sweep: 86 files, 733 tests. The first run passed 731 and exposed two stale expectations (six current presets and the superseded portrait path). After updating those expectations, both affected suites passed all five tests. No implementation logic was changed to hide a failure.
- Pen reader/derivative tests: 13 passed; source-pinned design checker and generated contract check passed. All 104 hero/banner source and export hashes, sizes, dimensions and runtime URL mappings passed validation.
- Full production-browser sweep: 107 cases; 99 passed, two opt-in/browser-specific cases skipped. Six stale current-roster/version expectations were corrected; all six passed the targeted rerun (31.2s), including explicit review that migrates a copy while preserving both original saved revisions. The legacy core fixtures remain unchanged.
- Local Google-enabled service restarted at `http://localhost:3000`, API3001. `prepare-auth-db.mjs` reported `preserved-and-migrated` for `oathfront_interactive`; no reset was run. Both catalog endpoints return 200 (six old/twenty current heroes, sixty cards each). Home renders six sections; Gravemarch renders four powers; the local browser probe reported no page errors.

The skipped browser cases are the no-Navigation-API browser-specific test and the opt-in measured performance workload. Existing physical-device/frame-time acceptance remains open.

## Acceptance boundaries

Technical checks do not establish competitive balance, measured frame-time on physical devices or a human playtest result. The fourteen presets are legal class-compatible starting points; balance tuning still needs the existing simulation/playtest process. No manual production deployment is part of this change. Concurrent user audio changes are preserved and excluded from these commits.

## Delivery

Seven scoped commits through `9785bf0` were pushed to `main`; remote SHA was verified. [GitHub Verify](https://github.com/dattk2002/oath-front-tcg/actions/runs/39718483518) was running at handoff; local verification results above are complete, while CI success is not yet claimed. Local UI3000/API3001 remain running. The documentation-only follow-up records this delivery state. Unrelated audio work and generated Next environment typing remain outside these commits.
