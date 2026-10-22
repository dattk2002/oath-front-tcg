# OathFront Elements and Weekly Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline. No implementation subagents. One fresh whole-branch reviewer after all implementation tasks. Preserve the existing user-approved main workspace and unrelated audio edits.

**Goal:** Ship eight gameplay systems, differentiated heroes, rarity/arena/feature presentation, persistent news and a twelve-week collectible-card challenge season.
**Architecture:** Add immutable elements_v1 alongside core_v1/heroes_v1; use version-bound engine data and separate account-owned card validation. PostgreSQL owns publication, schedules, exact-once rewards and scenario attempts. UI reads actual APIs, using source-tracked artwork and GSAP.
**Tech Stack:** Existing Next16 App Router, Fastify, TypeScript, pnpm, Drizzle/pg, Neon development, GSAP/Pixi, built-in image_gen.
**Spec:** docs/superpowers/specs/2026-10-22-events-affinities-design.md

## Global constraints

- Preserve core_v1 canonical hash37ec966ce1e734e8e5f85310e384ea0d1c4a126eea4618471ea874d60546cdcc and the already-shipped heroes_v1 hash; old content/state/receipts never rewritten.
- Eight systems;20heroes with2systems/4powers each;36powers;72cards (60free+12E);30-card decks/max2copies/max12Neutral/min6eachsystem.
- Daily reward100; three-day bonus200; five-day bonus300; seven-day cosmetic. Card copies at1200/2400. PvE50/100/150 by featured-system match, dailyPvEcap200. Loss/surrender retry cooldown3600000ms.
- Server reset00:00UTC =07:00Vietnam; Monday weeks; first start2026-10-26T00:00:00Z;12weeks. Account-only rewards; guests practice.24h completion grace for an already-started bound day, no missed-day starts.
- Player DB oathfront_interactive must be preserved. VerificationDB must be isolated *_test. Own API3121/UI3200 and isolated.next-e2e build. Port3101 is reserved/unrelated.
- No production deployment. No unrelated audio/settings/App/layout changes staged. No new dependencies unless required; reuse existing code.
- User-selected scope includes CLI administration, local+Neon development DB updates, focused commits/push. English visible content. Frozen Pen source preserved.

## Review focus

- A new catalog must not reinterpret a pending/active legacy match, old receipt or old saved deck. Test legacy and new catalog boundaries in Tasks1/2/5/8.
- A result arriving across midnight/week end, two tabs or a response loss must award once to its original eligible account/week/day. Test concurrency and grace in Task5.
- A guest game claimed into an account after starting must never become reward eligible. Test in Task5.
- Publishing/importing/retrying a season must not replace already-started scenario bytes or leak scheduled news. Test hashes/import readback in Tasks3/4/6.
- Redesign/rarity/ambient motion must not hide hit targets, names, cost or phases at375px and1024×640. Cover asset failure, reduced motion and current/legacy hero inspect in Tasks8/9/10.

## M1 — New systems and versioned gameplay

### Task 1: Catalog, deck law and closed contracts

**Files:** create packages/game-content/src/elements-v1.ts and systems.ts; modify registry.ts,index.ts,validate.ts; packages/contracts/src/catalog.ts,deck.ts and docs/contracts/api-v1.schema.json/generated outputs. Tests packages/game-content/tests/elements.test.ts, packages/contracts/tests/elements.test.ts.
**Interfaces:** `elementsCatalog`, `systemDefinitions`, `catalogForVersion("elements_v1")`, `validateDeck(deck,catalog)`, `eligibleCards(hero,catalog)`; new SystemId/Rarity and CardIds E01–E12. New shared powers use neutral content ownership and OWNER_PLAY phase; battle Side stays GOOD|EVIL.
- [x] RED: validate exact8systems/20heroes/36powers/72cards/20presets; each hero has distinct pair and correct4ownedpowers; all free presets structurally legal; invalid neutral13, third-system card, fewer6one-system, copy3 rejected; both legacy hashes unchanged.
- [x] Implement immutable cloned new card/system metadata, twelve explicit event units and sixteen shared powers from spec addendum; preserve numeric baseline until measured tuning. Rebuild20presets with at most4cards costing6+ and at least8units costing<=3. Assign rarity24U/18R/12SR/6SL/12E via explicit IDs.
- [x] Extend generated schemas/types per-version counts/IDs/system legality; old public payloads remain valid and unchanged. Neutral content ownership is distinct from combat Side. Save new balance/content manifest in docs/design/elements-v1.md.
- [x] GREEN: `pnpm contracts:generate`; `pnpm exec vitest run packages/game-content/tests packages/contracts/tests`; roottsc. Commit coherent catalog/contracts.

### Task 2: Version-bound cards, powers, bot and balance

**Files:** engine catalog helper, actions/modifiers/combat/end-turn/effects/preview/setup; packages/bot source callsites; tests engine elements/replay, bot legality; tools/simulation elements run/report.
**Interfaces:** matchCatalog(state) resolves every card/power lookup; pure engine accepts new systems and neutral-origin units; new shared power OWNER_PLAY resolves from actor side. Legacy rules remain identical.
- [x] RED: all12E literal outcomes and preview parity, all16sharedpowers, opposite-origin unit in new legal deck, illegalclass rejected, both sides setup/mulligan/block, legacyjournal replay.
- [x] Remove runtime core-only card lookup where state determines catalog; preserve core-only tutorial/location/token fixtures deliberately. Ensure summons adopt player ownership, not token's historical faction.
- [x] GREEN: engine/bot focused suites. Run bounded100seeded matchup simulations across all20heroes with currentfreepresets; inspect legality, faults, turns and side results. Record limited bot benchmark; make only justified new-catalog balance changes and rerun affected checks. Commit.

## M2 — Persistence, content and scenarios

### Task 3: Forward schema and catalog/collection access

**Files:** db schema/migration0004 and journal/grants; API content registry, decks service, maintenance versions, new progression collection module; API/db tests.
**Interfaces:** account collection counts0..2; `validateOwnedDeck(tx,principal,deck)` supplements structural validation; versioned catalog endpoints remain supported. Public news/event entities stored independently from user ledger.
- [x] RED: clean and existing-schema migration; role grants; legacy rows/checkpoints unchanged; account vsguest ownership, card0/1/2 constraints and forgedquantity denied; oldcatalogstillreadable.
- [x] Add normalized editorial_posts,weekly_events,event_scenarios,daily_attempts,weekly_progress,reward_ledger,collection_items,cosmetic_unlocks with unique source/copy/milestone keys and foreign keys. Runtime can read published schedule/editorial; admin owns publication. Add24hbound timestamps and eligibility owner to attempts/match bindings.
- [x] Implement current elements catalog reads and deck ownership enforcement on save/create, with original-command receipt checks first. Legacy versions retain prior no-collection behavior.
- [x] GREEN: isolated migration/ownership/version tests, typecheck. Commit.

### Task 4: Real editorial, twelve-week schedule and immutable daily manifests

**Files:** new packages/game-content/src/events/season-one.ts, scenarios.ts; API editorial/events read modules; scripts/editorial/seed bundle; docs/design/events-season-one.md; API/scenario tests.
**Interfaces:** twelve E01–E12 events from2026-10-26, seven scenario bindings each, `scenarioForId(id)` and canonical manifest hashes; public news list/detail, weekly roadmap/current detail filter server now.
- [x] RED:12consecutive nonoverlappingweeks,84scenario identities/hashes, alternatehumanfactions, nofuture published/revealcopy, unknownslugs404, end-of-seasonarchive.
- [x] Author six substantive OathFront news articles and twelve event entries, actual future publication dates, oldsample slug migration/redirect policy. Author seven scenario templates with concrete prebuilt board/hand/deck/seed and featured-card showcase, expand all84 bindings. Everyscenario must use legal borroweddeck and deterministic initialstate.
- [x] Implement pure scene bootstrap in versioned engine path separate from tutorial_v1; replay binds exact scenario hash. Store/serve published data fromDB. Never seed fake historical community activity.
- [x] GREEN: generate eachscenario, validateinitialstate and deterministicreplay; APIpublication/timefiltertests. Commit.

## M3 — Tickets, daily play and administration

### Task 5: Daily attempts and atomic rewards

**Files:** API events service/routes,rewards, match results/initialization/repository bindings; contracts newEvent/Collection/DailyCreate/Reward DTOs; engine mode metadata ifneeded; end-to-end API tests.
**Interfaces:** `startDaily(principal,{commandId,scenarioId})`; `settleMatchRewards(tx,match,result,now)`; own progress/collection/ledger DTOs; exact original receipt beforetimegate.
- [ ] RED: all7days,100/200/300 milestone arithmetic,1200/2400copies, PvEcap200, featured50/100/150, account-only eligibility, guestclaimnoaward, onehourloss/surrender, disconnectresume, faultretry, day/weekgrace24h, expiredstarts, duplicate/twotab/lostresponse+reload.
- [ ] Bind eligibility andweek/dayatcreation withprincipal lock andexistingactive-match rule. Immutable dailyattempt references scenario hash andnormalengine match. Serveroutcome grantsledger+progress+collection inresulttransaction exactlyonce. Cardownershipcapped2; cosmeticmilestoneunique; no client amount/win inputs.
- [ ] Expose progress/history and active/cooldown/complete statuses; challenge result actions returntoevent, notgenericrematch. Ensure recap/reload doesnotgrantagain.
- [ ] GREEN: integratedAPI→DB→match→result→collection tests inclserverrestart/replay. Commit.

### Task 6: Idempotent content administration

**Files:** scripts/manage-live-content.mjs or equivalent TSCLI; public DBseedversion bundle; adminvalidation module; docs runbook; integrationtests.
**Interfaces:** CLI `validate`, `dry-run`, `import`, `publish`, targetexplicitlocal/development, revision/checksum guards. Same normalized bundle used bybrowserfixtures.
- [ ] RED: duplicateimportnoextraevents, scheduledpublication clock, changedlive definitionrejected, draftsrevisionallowed, restrictedruntimecannotpublish, outputredactssecrets.
- [ ] Implement parameterizedtransactionalwrites through existingpg/Drizzle conventions. Seedisolatedtests, noappstartupautomaticeditorialoverwrite. Explain publication/calendar/cooldown/timezone operations androllbackbyfutureversion, no destructive reset.
- [ ] GREEN: adminintegrationchecks anddry-runexistinginteractiveDB withoutmutationuntilM6. Commit.

## M4 — Artwork and visual contracts

### Task 7: Distinct roster, event cards and environment assets

**Files:** docs/design/hero-distinction-audit.md; assets/source/heroes-v5,world-v1,features-v2,event-cards-v1; publicderivatives/manifests; sourceprompts; exporttools; docs/design/elements-visual-contract.md.
**Interfaces:** overridesbyheroID, Ecard artKeys, fourarenaKeys, fourfeature banners, eight systemSVGsymbols and5raritytokens. Pencontractnewextensionsnullbindings.
- [ ] Auditall20nearestneighbors on6axes; recordkeep/redraw andredraweveryfailure. Generate/inspectusingimagegen. UpdateHomeensemblechangedfeaturedheroeswhilepreservingcomposition. Generate12distinctEunits,4arenas,4featurepanels; respectalphaandreadablecentralboardspace.
- [ ] Exportbounds/facecrops/WebPvariants viaexistingpipeline; validatepath/hash/dimensions/alpha/bytebudgets andvisuallyinspectmontage,Hudcrops andarenaoverlays. No newrasterUItext.
- [ ] Produce exact visual/interactionstatecontract, semantictokens, loading/error/locked/cooldown/reducedmotion treatment. UIreviewmustpreservePentype/brand. Commitassets/docsaudits.

## M5 — Product integration

### Task 8: Systems, rarity and owned deck building

**Files:** webEnglish/presentationmodel, HeroSelect/HeroInspect/profile, cardcollection/deckrows/hand/inspect, artmanifest; version-awarematchcatalogfetch; ownedcollectionqueries; styles andfocusedtests.
**Interfaces:** newpubliccurrentmetadata; `catalog(version)` andcacheboundview.versions.content; cardraritybadge, systememblem, ownedquantity0/1/2. Legacycurrentmatch showslegacyclass/power context.
- [ ] RED:20newprofilesexactsystem/powers; legacyinspectoldpowers; neutral/mintwo-systemvalidation; ownedE0/1/2quantities; oldsaveddeckreviewpreserveshistory; pendinglegacyrequestexactretry.
- [ ] Addaccessibleemblems/rarityframes/filterstates andrealownershipfeedback. Keepindependentquantitycontrolsandnamedinspectlinks. Migrateonlyexplicitreviewcopy; failedsavepreservesdraft. Do nothardcodecurrentcatalogintoactiveoldmatch.
- [ ] GREEN: frontendtests+APIflow and375/1024/1440browserchecks, keyboard/assetfailure/reducedmotion. Commit.

### Task 9: Cinematic Features and decorated battlefields

**Files:** GameFeatures, feature-stage component/motion, BattleScene/rendererpublicthememapping, campaign/game styles; visualcontractPenextension.
**Interfaces:**4manualfeature panels withnativebuttons/tabs; deterministicarenaForView(publicview/scenario); decorativeframes never alterengine/hitboxes.
- [ ] ImplementprovidedvisualplanwithscopedGSAP, visibility/pause/reduced-motioncleanup. Environmentartdecoratesedgesandlaneplates;stats/phase/targetoutlinesremainaboveart. Keepmobilelistfallback.
- [ ] Verifymanualcarouselpointer/touch/keyboard, rapidroutechange, visibleallstaticreducedmode; boardtargetparityat5supporteddesktop/tabletsizes and375fallback; screenshots/consoleerrors/contrast. Commit.

### Task 10: DB-backed news and event/collection experience

**Files:** EditorialPage/dataaccess, campaignroutes/Home stories, EventHub/WeeklyDetail/DailyRail/RewardSummary, api-client/hooks; accountgate; metadata/routes; styles; tests.
**Interfaces:** publishedAPIcontent; eventstatus/cooldown/activeattempt/ticketprogress/owncardcounts; explicitauthentry; dailycreate/resumeexactrequest.
- [ ] RED:publishednews/category/detail/404/retry; realcurrent/upcoming/archiveevents; accountgate/guestpractice; today's challenge, countdowncomputedfromserverNow, winaward/loss1h/reconnect; interruptedrevealstillowned; copiedURL/Back/refresh andtwotabs.
- [ ] Buildactualpageswithlabeled dates/schedules andfuturecardsilhouettes; borrowdeckexplanation, previous-dayactiveattemptresume, emptyseasonstate. Replacefake mockrecords inruntime; retainhistoricaldocs only. Eventratingframesandnewbannerassetsreused.
- [ ] GREEN: completebrowserflows atdesktop/tablet/mobile inclAPIoutage, reducedmotion, keyboardfocus, imagefallback andno unexpectedconsoleerrors. Commit.

## M6 — Verification and delivery

### Task 11: Whole-app verification and independent review

**Files:** regressiontests asrequired; docs/implementation/elements-events.md; contractPenjson/md, Englishdocs, README, ledger.
- [ ] Runroot typecheck/lint/contractscheck, productionbuild, allrelevantunit/integrationonce thenfocusfixes; runbrowserfullstorysweep (avoidopt-inheavybenchmarks withoutreason). KeepisolatedDB/ports. VerifyfrozenPen/core/heroes hashes andallnewassetmanifesthashes.
- [ ] Freshwholebranchreview againstspec withfocus onversion/ownership/rewardraces, livepublishing, secretsscope, visualuniqueness andaccessibility. FixCritical/Important withmeaningfulregressions; reviewerfindingsmustbeclassifiedhonestly.
- [ ] Updatecontract/docsexactactualscope, contentrules, servereconomyandvisualexamples; recordboundedbalance/human/deviceacceptancelimits. Commit.

### Task 12: Local and Neon development data, scoped push

**Files:** admin/migrationrunbookevidence; completionreport/plan.
- [ ] Inspectrunninglocalservices/playerDB; applyforwardmigrationandseedpreservingdata, restartownlocal3000/3001withmanagedauth, browserreadbackactualnews/events/cardcatalog. Noreset.
- [ ] UseNeonskill+existingMCP connection: identifyexistingOathFrontdevelopmentproject/branch fromrepo/live, verifytarget, applyversionedmigration/import, readbackcounts/hashes/dates andrestrictedgrants. Neverproductionorschemapush; neverprintcredentials.
- [ ] Inspectexactscopeddiff/status/remotes,commitremainingauthorizedfiles,pushmainandverifyremote/CIstatus. Preserveuseraudiochanges. Reportactualchecks, links, startdateandcooldown; leaveappropriatelocalservicesrunning.
