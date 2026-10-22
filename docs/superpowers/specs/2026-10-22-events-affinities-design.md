# OathFront — elemental decks, living events and visual identity

## Authority and intent

The user requests implementation, not just a mockup: distinctive heroes, decorated environments and rarity frames, a cinematic Features page, two new gameplay systems per hero replacing the old classes, database-backed real OathFront news, weekly ticket cards and seven daily challenges. The user explicitly chose twelve new event units while retaining sixty free base cards; one rewarded daily completion with a one-hour cooldown after defeat; Google-account rewards; 07:00 Asia/Ho_Chi_Minh reset, Monday weeks; weekly tickets expire, earned cards persist. Review all twenty heroes and redesign any visually redundant identities, beginning with Briar, Cairn and Rowan. Local and Neon development changes are authorized; production deployment is outside this task. CLI editorial/event administration is sufficient.

Retain Next App Router, Fastify, PostgreSQL/Neon, GSAP and PixiJS. Preserve unrelated audio work. Existing core_v1, heroes_v1, locations_v1 and tutorial_v1 bytes, saved revisions, checkpoints and uncertain command bodies must remain unchanged. The new gameplay catalog is `elements_v1`. Work proceeds inline through completed milestones with one fresh final code reviewer.

## Research and design direction

- [Marvel Rivals hero/team-up reference](https://www.marvelrivals.com/heroes/teamup.html): differentiate silhouette, anatomy, proportions, material, equipment, motion and character motif. A different color alone is insufficient.
- [Marvel Rivals Features reference](https://www.marvelrivals.com/?part=feature): wide illustrated panels, assertive headline, angled framing, clear manual previous/next navigation and progress markers. Observed feature section screenshot is retained under `.superpowers/sdd/2026-10-22-events-affinities/references/`. Its remote video did not finish rendering in the capture; composition/navigation were inspectable.
- [PvZ Heroes rarities](https://pvzheroes.fandom.com/wiki/Category:Rarities) inspires collectible framing. OathFront uses the user's five explicit categories and colors below, not that game's pack probabilities.
- [Weekly Event reference](https://plantsvszombies.fandom.com/wiki/Weekly_Event) describes a rotating event card, weekly tickets, repeat-copy thresholds and daily completion bonuses. OathFront adapts the loop to two-copy decks and browser PvE. Its published historical baseline awards a card at 1,200 tickets, daily wins at 100, with 200/300-ticket milestones at three/five completions; source behavior may change. The implementation values below are OathFront decisions.

Pen paper/slate/lilac/acid tokens, Barlow typography, logo and route hierarchy remain. Approved new compositions are explicit derived contract extensions, with null Pen node bindings where no real source node exists. Do not invent IDs or modify frozen Pen bytes.

## New systems and deck rules (implementation decisions)

Eight systems replace the six legacy deck classes only in elements_v1. There is no extra damage multiplier matrix. Each system has a distinct symbol, color, rules vocabulary and two shared powers:

| ID | Name | Identity |
| --- | --- | --- |
| GROVE | Grove | Growth, healing, replacement units |
| TERRA | Terra | Armor, Shield, persistent defense |
| TIDE | Tide | Repositioning, protection, recovery |
| TEMPEST | Tempest | Tempo, movement, attack pressure |
| SOLAR | Solar | Radiance, heat, direct damage |
| FORGE | Forge | Construct support, repair, resilient units |
| ARCANE | Arcane | Draw, timing, stun and spell control |
| UMBRAL | Umbral | Poison, weakening, drain and attrition |

Phe/faction remains GOOD or EVIL and governs phases and opponent identity. New-system cards may serve either faction: legal deck membership depends on hero systems, not the historical faction painted on a card. This is a deliberate new-rule decision; original content versions retain faction restrictions.

A deck must have exactly30 cards, at most2 copies per ID, only either hero system or NEUTRAL, at most12 Neutral cards and at least6 cards from each chosen system. Owned-card validation is separate from structural validation. Sixty base cards remain universally available at two copies; E cards need actual account ownership. No pack/shop/crafting/currency purchase is introduced.

The twelve original common IDs GC01–GC06/EC01–EC06 become NEUTRAL in elements_v1. The remaining48 cards are six per system:

| System | Base card IDs |
| --- | --- |
| GROVE | V01,V02,V04,V05,V06,V08 |
| TERRA | B01,B02,B05,S04,B07,B06 |
| TIDE | V03,P02,S02,V07,S07,S08 |
| TEMPEST | P01,S01,P05,S05,P06,F07 |
| SOLAR | F01,F02,F03,F05,F06,F08 |
| FORGE | B03,B04,P03,F04,X03,B08 |
| ARCANE | P04,X04,X05,P07,P08,S06 |
| UMBRAL | X01,X02,S03,X06,X07,X08 |

Initial numeric card mechanics remain the established baseline; simulations may justify explicit elements_v1-only tuning. The implementer must record every changed numeric rule and its evidence. Never change rules in old catalogs. All hero IDs/names remain stable. New titles/lore may be updated for redesigned appearances.

| Hero | First system | Second system | Visual distinction |
| --- | --- | --- | --- |
| Briar | GROVE | TERRA | Human living-wood shield knight; grounded compact defensive pose |
| Aster | FORGE | SOLAR | Faceted flight armor, prism jets, clean aerodynamic lines |
| Lumen | TEMPEST | SOLAR | Weather controller, white braids, flowing storm ribbons |
| Cinder | FORGE | TERRA | Human industrial brawler, exposed face, furnace forearms |
| Vesper | TEMPEST | UMBRAL | Slim kinetic duelist, shards and asymmetric long coat |
| Morrow | ARCANE | UMBRAL | Architectural portals, glasses, rigid geometric panels |
| Solenne | SOLAR | TERRA | Spear-and-ward champion, sun vanes, upright guardian silhouette |
| Cairn | TERRA | ARCANE | Floating nonhuman segmented stone sentinel, blue gravity seams; no leaves or wood armor |
| Zephyr | TEMPEST | TIDE | Low runner stance, wind scarf, light aerodynamic suit |
| Meridian | ARCANE | SOLAR | Time archivist with armillary and folio; separate from weather/wing silhouettes |
| Mossweld | FORGE | GROVE | Small original creature engineer, large repair gauntlet and drone |
| Halcyon | TEMPEST | GROVE | Avian anatomy/feather fan and conductor gesture, distinct from Lumen's cloth ribbons |
| Rowan | GROVE | TIDE | Amphibious wanderer with gill fins, tidal staff and cobalt/teal materials; no leafy knight armor |
| Rook | FORGE | TEMPEST | Rail-bow marksman, aiming asymmetry and compact jetpack |
| Nyxara | UMBRAL | GROVE | Thread mage with six deliberate silk strands and web geometry |
| Brimstone | SOLAR | UMBRAL | Inhuman molten mass with heavy vents; no human brawler armor duplication |
| Sable | TERRA | UMBRAL | Judicial authority, suspended verdict seals, austere planes |
| Vanta | TIDE | UMBRAL | Fluid predator stance, dark glass and blade hoops |
| Gravemarch | FORGE | UMBRAL | Hollow bell-cage machine, mechanical anatomy and resonance |
| Scoria | SOLAR | TIDE | Alchemist, floating kiln vessels and fluid/fire contrast |

All20 pairs are unique. Heroes get three shared powers (two from first system, first from second) plus their own existing signature, totaling36 power definitions. Shared power IDs must be new; legacy powers remain intact. Exact sixteen effects, names, targets and twenty presets must be locked in the content milestone, tested and documented. Powers cost1 and starting HP stays20. Keep the four-phase and simultaneous-per-lane combat rules.

The implementer must audit every hero against its nearest visual neighbor on six axes: silhouette, anatomy, equipment, material, motif, pose. At least three axes must differ clearly. Redraw all failing identities, not only the named three. Preserve the admired Home banner composition; update changed featured identities so banner/profile/battle remain consistent. Preserve all source masters/prompts and export reviewed thumb/HUD/inspect/full-body variants.

## Rarity and new cards

| Code | Display name | Color family | Shape/motion |
| --- | --- | --- | --- |
| U | Uncommon | Silver | Single beveled edge, diamond badge |
| R | Rare | Gold | Double corner accents, two-point crest |
| SR | Super Rare | Purple | Faceted border, star crest |
| SL | Super Legendary | Rainbow | Prismatic border, crown crest, restrained inspect/reveal sheen |
| E | Event | Red-orange | Event crest and schedule identity |

Every collectible card has a rarity in the new catalog. Rarity must appear as text/code and a shape, never color alone. Keep attack, health, cost and target availability visually separate. Use semantic CSS tokens and accessible solid badge text; rainbow belongs on the frame, not body text. Collection, deck rows, hand and inspect must agree. Powers and generated tokens are not collectible and must not claim a rarity.

Base60 distribution: all12Neutral plus class low-cost basics = U; each system has a coherent R/SR/SL progression. The exact ID mapping is content metadata, independent of cost or attack at runtime, and must cover all60 once. None of these free cards becomes locked. Twelve new cards are UNIT/creep definitions with E rarity, original English names/art, legal target-free on-play/trigger behavior supported by existing primitives and a fair cost/stat budget. At least one new unit per system; remaining four cover Grove/Terra/Solar/Umbral. Add six cards useful to each faction's hero roster, without restoring faction deck restrictions. Event cards are optional additions; free presets contain none.

## Event season and economic rules

Season01, working title `First Light, Long Shadows`, contains12 weekly events and12 new E cards. First start: Monday2026-10-26 07:00 Asia/Ho_Chi_Minh (2026-10-26T00:00:00Z), then exact7-day intervals. This future start avoids fabricating an already-running launch. News announces this actual schedule; before launch the hub displays Upcoming and practice challenge previews. Tests use an injected server clock; production clients cannot set time. Week/day clocks are server authoritative.

One card is spotlighted/revealed each week. Roadmap displays dates and completed/current/upcoming states; future event detail copy/art is not revealed in the event UI until revealAt. Card definitions are not a secrecy/security boundary; data-mining resistance is not promised. Ownership and reward availability must still be enforced server-side. After week12 show the completed season/archive, never silently repeat rewards or invent future events.

Tickets are an append-only per-account/per-week earned total. At1200 automatically award the first copy of the week's card; at2400 award the second. No spending race or manual claim is necessary. Reward records remain after the week ends; next week's progress starts in a different row. Card ownership persists and never exceeds2. If a future season repeats an already-owned card, its schedule must explicitly define a cosmetic alternative; this initial season has no duplicate reward cards.

Daily win:100tickets, once per account/event/day. Third distinct day completed:200bonus; fifth:300bonus; seventh:one deterministic season completion cosmetic badge (no randomized pack). Seven wins therefore yield1200tickets and one card. Normal PvE wins after event start earn50tickets; one matching featured system earns100 and both150, capped at200PvE tickets per account/server day. Daily tickets/milestones do not consume that cap. No cooldown boost, ads or payment. Featured system pair rotates with the event card's associated hero. Each source must be visible in reward history.

Eligible PvE rewards require an ACCOUNT at match creation, a genuine server-resolved WIN, SKIRMISH mode, and a start time inside the active week. Tutorial, practice, guest-origin games, draws, losses, abandoned/faulted games never earn tickets. Daily games use their daily reward path only. A match starting before a boundary may finish within24h after its bound day closes, but never later than24h after week end; it rewards its originally bound week/day. The next weekly wallet is untouched. Replay/reload/repeated requests cannot award twice.

## Seven daily challenges and retries

Each event publishes seven deterministic prebuilt scenarios, one unlocked per server day, in this sequence: opening lane puzzle; defensive rescue; featured-card showcase; trick timing; location lesson; two-system synergy; boss finale. There are84 immutable scenario bindings for12 weeks; authored templates may generate them, but each concrete hero/deck/board/seed/setup hash must be persisted and reviewable. At least two different human factions occur each week; rewards do not depend on owning the borrowed scenario deck. Include a genuine prearranged board/hand in puzzle scenarios rather than relabeling normal random skirmishes.

ACCOUNT daily action: choose today's scenario → server checks event/day/cooldown and active match → create or resume exact scenario → play using normal authoritative engine → win awards once. A defeat or surrender sets `retryAvailableAt = endedAt + 1 hour`. Lost connectivity keeps the existing active attempt and never creates a cooldown or replacement. Faulted/expired infrastructure outcomes allow a no-penalty retry. A completed day's Play becomes Completed; do not consume tickets or add another award. Normal challenges close to new starts at next07:00; no missed-day catch-up in this season. The24h completion grace only covers already-started attempts. Guests may practice unlocked/current scenarios without rewards or persistence promises; practice must be labeled and must not leak account eligibility through later login.

Only one active match per principal remains. Starting a challenge while another match exists offers Resume; it never silently abandons it. A new day must not overwrite a pending create or active previous-day attempt. The same command ID/body must replay the same initialization receipt before rechecking current event time. Daily result screen links to event progress and shows cooldown/earned rewards without issuing another generic rematch.

## Database, APIs and ownership

Add forward migrations and explicit restricted-role grants. Do not reset player data. Required entities: versioned editorial posts/publication state; weekly events with immutable schedule/card/reward config; immutable challenge scenarios; per-account daily attempts; append-only ticket/reward ledger; per-account per-week progression; persistent card collection and cosmetic unlocks. Unique keys must enforce one reward per source/milestone/copy. Published event/scenario definitions cannot mutate after attempts exist. Admin updates create revisions for later publication.

Use existing principal transaction locks, match locks, authenticated Origin/CSRF, durable command receipts and server clock. Match-result persistence and reward grant must commit in the same transaction or a durable idempotent outbox that is processed before progress read; preferred direct transaction. Never trust client-reported wins, ticket amounts, rarity, card unlock counts or local clocks. Stable award source keys survive ordinary command receipt expiry. Guest-to-account claims must not convert a guest-origin match into a rewarded attempt.

New endpoints under `/api/v1`: public news list/detail and event list/detail/schedule; authenticated own collection/progress/history; daily create/resume with commandId/scenario identity. Account mutation endpoints remain closed schemas. Future news and event reveal content must be filtered on the server. Public read failure gets explicit retry states, never fabricated sample news. Preserve old create/deck/summary requests and receipts exactly; ordinary new games use elements_v1. Old decks must be reviewed against new rules and saved as a new copy/revision after explicit user action, never silently remapped. Ongoing old games keep the old catalog and artwork may use latest presentation.

Structural deck validation and owned-card validation must run on save and create, on the server. Public previews and bot lookup must use the match catalog for cards as well as powers. All `coreCatalog.cards` runtime lookups must be audited; old tutorial fixtures remain bound to core_v1. Bots and daily borrowed decks are not restricted by a human collection.

CLI administration imports a versioned seed bundle idempotently, validates links/dates/content hashes, supports draft→scheduled→published and dry-run, and rejects edits to live immutable scenario/event definitions. User-requested initial seed: six substantive OathFront articles plus12event announcements/entries, with real authored copy and genuine publication timestamps. Preserve old sample slugs through real replacements where honest or clearly archived redirects; never fabricate external endorsements, player metrics or past community events. Runtime DB role can read editorial/schedules and mutate only gameplay progression; owner/admin execution performs publication imports.

Local migration/seed is applied to the preserved interactive DB after isolated verification; Neon development target is inspected live and updated through the available Neon integration. Exact project/branch identity must be recorded; no production migration/deploy or new paid service.

## Visual surfaces

1. Features: four original wide banners and a manually controlled cinematic feature stage, large two-line heading, angled panel, accessible previous/next and tab labels. Topics: five-lane tactics; two-system heroes; collectible cards; weekly expeditions. Follow with a real rules explanation, arena gallery and playable CTA. No autoplay, hidden-only instructions or fake video controls. Keep all content visible statically under reduced motion.
2. Battlefield: four original environment backgrounds (Moonroot Conservatory, Cinder Foundry, Glasswater Sanctum, Astral Causeway), edge props, lane foundation, faction ornaments and ambient particles. Decoration stays outside hit targets and behind bounded readable surfaces. Deterministic environment mapping from public location/scenario data; no gameplay stat modifier from cosmetic choice. Preserve five equal lanes, mobile fallback and pointer/keyboard targeting. GSAP manages ambient/reveal motion with pause/visibility/reduced-motion cleanup; no CSS keyframe choreography.
3. Hero profiles/selection: two actual system emblems and system strategy text, consistent revised art, four current powers. Legacy match hero inspect must use its legacy class/power context. Profile copy must not advertise discarded classes.
4. Collection: rarity and system filters, owned count0/1/2 for E, locked/reveal/available states, live validation of quantity and deck legality. Whole cards retain inspect behavior and independent quantity controls. No paid acquisition CTA.
5. Events: current spotlight card, earned ticket milestones, seven-day rail, today's challenge/cooldown/resume, weekly roadmap, archived records and a clearly labeled Google sign-in action for account rewards. Event E card reveal uses a short interruptible GSAP sequence and a static reduced-motion state; successful reward is durable even if the animation is interrupted.
6. News: database list/category/detail pages with dates, real content and artwork. Home stories use published DB entries. Loading/empty/error/offline states are explicit.

All new components must document default, hover, focus-visible, active/selected, disabled, loading and error behavior or explicit non-applicability. Keyboard, pointer and touch must reach equivalent actions. At375px,1024×640 and1440×900 there must be no overflow, obscured focus, clipping or illegible copy;44pxtargets and tested contrast remain required. Asset hashes/paths/source prompts must be recorded and original packs preserved.

## Sequential milestones and acceptance

M1: Lock new systems, deck law, powers, rarity mapping and72-card catalog; version-aware engine/bot resolution and legacy compatibility. Verify every preset, every hero power set and both-version deterministic fixtures; run a bounded balance simulation and record results/limits.

M2: Forward DB migrations, editorial/season/scenario seed and read APIs, collection and ownership enforcement. Verify duplicate imports, unauthorized access, ownership0/1/2, old revisions and unpublished content filtering on isolated DB.

M3: Authoritative daily challenge initialization, cooldown, weekly tickets, milestone/card grants and receipt/replay recovery. Verify all7days, weekly boundary/grace, one-hour cooldown, two-tab races, duplicate/uncertain requests, guest claim eligibility and exact borrowed-deck scenario replay. Test real endpoint→DB→match result→collection flows.

M4: Whole-roster differentiation audit and redraws, updated ensemble where needed, four feature banners, four arenas, twelve E-card images, eight system emblems and rarity frames. Inspect every crop, alpha/contrast and manifest hash before integration.

M5: Integrate Features/board/hero/card/event/news surfaces and state/motion contracts; update Pen contract without source drift. Verify responsive, keyboard, reduced motion, artwork failure, network failure, and route/deck/event resume flows.

M6: Full integration checks once, targeted fixes, fresh independent whole-app/code review, local and Neon development migration/seed readback, scoped commits/push and CI status. Leave local running with player data preserved. Report balance/device limits and any external gate honestly.

## Explicit boundaries

No PvP, cash economy, loot boxes, crafting, new paid hosting, production deploy, fabricated results or silent rewriting of existing game history. Human balance playtesting and physical-device frame-time measurements remain separate from technical correctness. No default endless rerun of already-green suites; broaden only for new changes or unresolved risks.

## Locked content addendum for M1

NEUTRAL cards use `classId:null`, preserving wire conventions. New shared powers use `faction:NEUTRAL` and internal `validPhase:OWNER_PLAY`; combat Side is never widened. The actor's side selects GOOD_PLAY or EVIL_TRICKS. Legacy power faction/phase values remain exact.

All shared powers cost1. Their IDs are `P_<SYSTEM>1` and `P_<SYSTEM>2`:

| System | First power | Second power |
| --- | --- | --- |
| GROVE | Verdant Pulse: heal own hero3 and all allied units1 | Rootguard: allied unit +0/+2 permanently; draw1 |
| TERRA | Oathshield: grant allied unit Shield; draw1 | Stone Skin: grant allied unit Armor and +0/+1 permanently |
| TIDE | Undertow: move enemy unit to an empty lane on its side | Stillwater: stun enemy unit this turn; heal own hero1 |
| TEMPEST | Slipstream: move allied unit to empty allied lane; +2ATK this turn | Stormspark: deal2damage to enemy unit or hero |
| SOLAR | Radiant Surge: allied unit +2ATK this turn; draw1 | Sunwell: heal own hero4 |
| FORGE | Field Repair: heal allied unit4; draw1 | Overclock: allied unit +1/+1 permanently |
| ARCANE | Second Sight: draw2 | Suspension: stun enemy unit this turn; draw1 |
| UMBRAL | Venom Thread: poison enemy unit | Fading Hex: enemy unit -2ATK this turn; draw1 |

The initial E-unit table is below. Effects run in listed order, using existing hooks and damage batches. Owner/allied always refers to the player controlling the unit, regardless of origin faction. All non-Pierce/Shield/Armor starting keyword arrays are empty. Once-per-turn hooks use FIRST_TIME_THIS_TURN and a unique counter; damage hooks require SELF_ALIVE and SELF_DAMAGED.

| ID | System | Name | Cost | ATK/HP | Rules |
| --- | --- | --- | --- | --- | --- |
| E01 | TERRA | Oathglass Sentinel |3|2/3|Shield. When destroyed: heal own hero2.|
| E02 | GROVE | Moonpetal Keeper |3|2/3|On play: heal own hero2. End turn: heal self1.|
| E03 | SOLAR | Sunflare Lynx |3|3/2|On play: deal1 to enemy unit here. When destroyed: deal1 to enemy hero.|
| E04 | UMBRAL | Veilfin Stalker |3|2/3|Before combat here, once per turn: self +1ATK this turn. When destroyed: poison enemy unit here.|
| E05 | FORGE | Cobalt Repairbot |2|1/4|End turn: heal self1.|
| E06 | TIDE | Rimewake Courier |4|2/5|On play: stun enemy unit here this turn; heal own hero1.|
| E07 | TEMPEST | Stormcrest Glider |4|3/3|Pierce. On play: self +1ATK this turn.|
| E08 | ARCANE | Chronicle Wisp |3|1/3|On play: draw1. When destroyed: draw1.|
| E09 | GROVE | Reedheart Guardian |4|3/3|On play: heal own hero1. When destroyed: summon TK_G_SEED here if empty on own side.|
| E10 | TERRA | Cragbound Ram |4|3/4|Armor. When damaged, once per turn while alive: self +1ATK this turn.|
| E11 | SOLAR | Dawncomet Phoenix |6|5/4|Pierce. When destroyed: heal own hero3.|
| E12 | UMBRAL | Hollowmask Oracle |5|3/4|On play: poison enemy unit here. When destroyed: draw1.|

Origins alternate GOOD/EVIL only as art/lore metadata, with six of each; origin does not restrict elements_v1 deck legality. Event order follows E01–E12. Rarity SL IDs: B05,V05,P05,F05,X05,S05. SR IDs: B03,B04,V04,P04,F04,X04,F08,P08,X08,S08,V06,B08. R IDs: B02,V02,V03,P02,P03,F02,F03,X02,X03,S02,S03,B07,P07,X07,V07,V08,S07,F06. Remaining24base IDs are U. AllE01–E12 are E. Classification is fixed metadata, never inferred from current modified stats.

Builder check completed: no important unanswered questions; remaining implementation/art/scenario choices are delegated. User answers above replace the provisional options originally offered.
