# Playable heroes and expanded Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline, task by task. One fresh final reviewer. Existing implementation approval applies.

**Goal:** Ship twenty playable original heroes and a complete Home with unified new artwork.
**Architecture:** Immutable versioned catalog alongside core_v1; state-specific hero/power lookup; shared existing card primitives; presentation manifests for twenty new illustrations and banner.
**Tech Stack:** Existing TypeScript/Next/Fastify/PostgreSQL/GSAP, built-in image_gen, existing image export tooling.
**Spec:** `docs/superpowers/specs/2026-10-22-playable-heroes-home-design.md`

## Global constraints

Preserve core_v1 canonical hash37ec966ce1e734e8e5f85310e384ea0d1c4a126eea4618471ea874d60546cdcc, all60cards, tutorial_v1, locations_v1, old matches/deck revisions. New versionheroes_v1 includes20heroes/32powers/20presets. English throughout. No manual production deployment. Preserve unrelated audio changes. Use isolated test3121/3200 and testDB; retain interactive3000/3001 until final refresh.

## Review focus

- Cross-version new hero IDs cannot be smuggled into old matches/catalogs.
- Legacy saved/pending/rematch commands keep body/version and cannot be replayed as a new match accidentally.
- Movement signatures preserve selected identity after cascades and cannot create extra attacks.
- Twenty hero tiles/profiles/long names remain usable at375px/1024×640; new banner does not obscure copy.
- Missing artwork/API outages/reduced motion keep navigation, rules and actions available.

## M1 — Content and public contracts

Files: `packages/game-content/src/{heroes-v1.ts,registry.ts,index.ts,validate.ts}`, `packages/contracts/src/{catalog.ts,deck.ts}`, `docs/contracts/api-v1.schema.json` and generated outputs.
Interface: heroesCatalog/currentCatalog/catalogForVersion; Catalog versionunion; new IDs from design roster.
- [x] RED: new catalog validation/presets, old canonical hash, directional old-deck compatibility (version-specific wire counts exercised with the public projection in M3).
- [x] Add14heroes/signatures/presets from design; preserve core data; regenerate closed contracts.
- [x] GREEN: content/contracts focused suites.

## M2 — Version-aware engine and bot

Files: engine `{setup,actions,preview,powers,mulligan,block}.ts` and catalog helper; relevant tests.
Interface: lookup hero/power definitions from state.versions.content; shared card mechanics unchanged.
- [x] RED: setup/mulligan all20, deterministic replaycore_v1; table of14signature literal outcomes and invalid/full-lane cases.
- [x] Implement catalog lookup in every hero/power path including block and previews.
- [x] GREEN: engine/bot suites, legal actions for all20 and no duplicate power grants.

## M3 — API and persistence

Files: API content registry/app, decks service, matches initialization/repository/service, maintenance versions; integration tests.
Interface: both immutable catalog endpoints; exact requested version binding; register both manifests; old saved deck compatibility.
- [x] RED: new hero match/deck save, core/new catalog boundaries, persisted reload/replay/rematch and old revision preservation.
- [x] Implement version selection/guards, supported releases and compatible deck handling without row migrations.
- [x] GREEN: focused DB/API tests on isolatedDB, old fixtures still readable.

## M4 — Unified art

Files: source `heroes-v4/` and `home-v2/`, runtime public derivatives/manifests; prompt/art identity document.
- [ ] Create20original hero images and1ensemble banner using built-in tool; preserve previous source assets.
- [ ] Inspect framing/alpha/style/identity; export contain,thumb,hud variants using existing export conventions.
- [ ] Verify every manifest hash/path and crop; document per-hero inspiration and original identity.

## M5 — Roster, profiles and full Home

Files: campaign model/components/motion/styles, Englishcontent, hero selector, APIclient and asset resolver; tests.
Interface: current20metadata and existing preserved oldID mappings; actualnewruntime art; multi-section Home.
- [ ] RED: public20andprofile four-powers parity, API current catalog, newasset resolution and all hero deck-intent routes.
- [ ] Update metadata, dynamiccounts, native roster responsiveflow, opponentchoices and power labels.
- [ ] Build six-section Home using new banner, phase/lanes explanation, featured heroes, cardshowcase, editorial and closingCTA.
- [ ] Scope GSAP reveals/reducedmotion; run ui-ux-pro-max/React review.
- [ ] GREEN: frontend/model focused checks and browserdesktop/tablet/mobile, no overflow/consoleerror.

## M6 — Integration and delivery

- [ ] Typecheck,lint,contractcheck,productionbuild, one complete unit/integration run and relevant browser flow sweep.
- [ ] Independent final review; fix objective important findings with regression evidence.
- [ ] Update Pen contract with truthful derived scope and active design status; preserve frozen sourcehash.
- [ ] Scoped commits/push, verify remote and CI; refresh local3000/3001 without clearing playerdata.
- [ ] Final report links artwork/docs and actualverification; distinguish balance/deviceholds.
