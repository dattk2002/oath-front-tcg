# OathFront — elements, distinct heroes and live events

Implementation scope: the approved [specification](../superpowers/specs/2026-10-22-events-affinities-design.md) and [sequential plan](../superpowers/plans/2026-10-22-events-affinities.md). Local and Neon development are authorized; production deployment is excluded. The original Pen document stays byte-for-byte unchanged.

## Delivered behavior

`elements_v1` supplies 20 heroes with unique pairs of eight systems, 36 powers, 20 free presets and 72 cards. All 60 base cards remain available at two copies; 12 new E units unlock through weekly tickets. Decks require 30 cards, at most two copies per ID, at most 12 Neutral cards and at least six cards from each hero system. Card origin faction does not restrict this catalog. Ownership is validated by the API. Existing decks, matches, checkpoints and uncertain receipts keep their own catalog.

The whole-roster [visual audit](../design/hero-distinction-audit.md) redrew Briar, Cairn, Rowan, Solenne, Meridian, Halcyon, Sable and Brimstone. Twelve distinct heroes remain from v4. Eight new hero masters, twelve event units, four arenas, four Features panels and one updated Home ensemble have provenance and bounded exports. Rarity uses code, shape and color: U silver, R gold, SR purple, SL rainbow, E orange-red. Cards retain readable cost/attack/health and exact effect text.

The four Features panels have manual tabs/previous/next navigation. Reduced motion exposes all four panels without animated transitions. Arena art stays behind readable lane plates and never changes hit targets or mechanics. Explicit challenge arena wins over ordinary public-location/hash selection. GSAP contexts/tweens clean up on navigation, interruption and reduced-motion changes; rewards are persisted independently of visual playback.

`LiveNews` reads published posts and categories, with real article dates and HTTP 404 for missing articles. `EventHub` reads twelve weekly publications, seven prepared challenges per week, server-clock countdowns, account/practice eligibility and durable progress. Future featured cards remain sealed in the UI. Six historical concept-event URLs explain their archived status. Empty/error states never substitute invented news or rewards.

## Season and rewards

First Light runs **26 October 2026 07:00 → 18 January 2027 07:00, Asia/Ho_Chi_Minh**. Each Monday starts a new week; daily reset is 07:00 Vietnam time (00:00 UTC). Before launch, the schedule is a dated preview; normal PvE remains playable.

| Rule | Server behavior |
| --- | --- |
| Daily completion | One rewarded win per account/day; 100 tickets |
| Three / five distinct daily wins | Additional 200 / 300 tickets |
| All seven days | Permanent weekly cosmetic |
| PvE wins | 50 + 50 per featured-system match; capped at 200 tickets/day |
| First / second featured card | 1,200 / 2,400 weekly tickets; maximum two permanent copies |
| Defeat / surrender | One-hour retry cooldown, survives reload |
| Draw / administrative fault | No defeat cooldown |
| Disconnect | Resume the same active match, no new attempt |
| Guest or explicit practice | No account tickets/cards; independent practice cooldown |
| Match crossing reset | Bound original day/week, completion grace of 24 hours after bound day end |

Tickets belong to their original week and cannot fund the next week's card. Earned cards/cosmetics persist. Eligibility is fixed at creation: signing in after starting a guest match does not create rewards retroactively. Terminal result, ledger entries, ticket balance and collection unlocks settle atomically with unique source keys. Exact uncertain requests replay their original receipt before availability gates.

The DB contains owner-authored **18 posts, 12 weekly events and 84 deterministic scenarios** (114 records). Six general articles are dated 22 October 2026 19:30 Vietnam time; twelve reveal announcements follow the season. Runtime roles cannot publish or rewrite these records. [Administrative tooling](live-content-admin.md) validates, previews, imports and exports the canonical bundle with target checks and idempotency. Published/scheduled immutable records require a new corrective post/version instead of silent rewriting.

## Contract and compatibility

The [Pen contract](../design/pen/DESIGN-CONTRACT.md) preserves real source-node mappings, brand tokens, typography and original image provenance. New systems/rarities/events/arenas are approved derived surfaces with null Pen bindings. `LiveNews` and `EventHub` replace obsolete runtime editorial mappings. The English-presentation input hash was deliberately reconciled for new hero identities and version-specific text; this does not alter the Pen bytes.

| Frozen artifact | SHA-256 |
| --- | --- |
| `core_v1` catalog | `37ec966ce1e734e8e5f85310e384ea0d1c4a126eea4618471ea874d60546cdcc` |
| `heroes_v1` catalog | `cb086648a206ca6e289d743a5158db8592e1b1f2733c615199d5ebc1bddb09d7` |
| Supplied Pen | `a696b32daf6e03d4bfe30b825a56cfc4fdd622cc1a3c3ff8b018c70bc20903b3` |

## Verification and review

Task checks already covered real API deck save/start, legacy resume, ownership zero/one/two-copy limits, simultaneous daily requests, receipt replay, guest claim, retry cooldown, account/practice isolation, migration from real legacy rows, prepared-scenario replay and reward deduplication. A real engine-played daily victory awarded tickets and one permanent E card; reload and another tab preserved the single unlock. Browser coverage includes 375px, 1024px, 1440px, dense ten-card hands/five lanes and compact 1024×640 battle controls.

The independent whole-branch review returned **With fixes**, with no Critical finding. The creation timestamp could cross a reset between persistence and reward binding; three injected-clock regressions reproduced daily, weekly and season-end failures before the fix. Initialization and binding now share one instant. A merged guest practice draw could mask an account's unexpired practice cooldown; this was regraded Important because account recovery repeatedly offered a rejected action. A regression reproduced the mismatch; progress now uses the same maximum cooldown as creation while keeping active-attempt selection.

Final integration verified the 836-test workspace unit/integration set: 835 passed in the full sweep; one five-second migration I/O timeout passed in the focused two-test rerun with a 30-second bound. All four review regressions passed. Root types/lint/contracts, production Next build, 13 Pen tests and 126 new artwork hashes passed.

Browser verification covered 116 tracked flows plus the existing local-only audio scenario across the full sweep and focused reruns. Old fixtures were updated for new names, icon images, deck curves and explicit legacy review; no gameplay assertions were disabled. The new past-day action regression brought real publishing/event coverage to six flows. Only the opt-in heavy hardware benchmark and browser-without-Navigation-API variant were not run in this Chromium sweep. A screenshot review found completed/closed days mislabeled “Not open yet”; two regressions failed first, then all six event flows passed after the label-priority fix and fresh production build.

Selected evidence: [desktop Features](evidence/elements-events/features-desktop.png), [mobile Features](evidence/elements-events/features-mobile.png), [compact battlefield](evidence/elements-events/arena-compact.png), [mobile collection](evidence/elements-events/collection-mobile.png), [weekly event](evidence/elements-events/weekly-mobile.png), [durable earned card](evidence/elements-events/earned-card.png), [event checks](evidence/elements-events/label-green.log), [frozen hashes](evidence/elements-events/frozen-hashes.json). Tests use isolated loopback databases. Actual local/Neon application is recorded below.

## Implementation rulings

1. Closed rarity projection moved into the initial catalog/contract task so downstream implementations share one type.
2. The early broad engine run exposed a fixture assumption; it was corrected and focused checks rerun, with the full sweep reserved for integration.
3. Umbral exists only on Ashen heroes. On Dawnward daily scenarios the opponent can borrow the featured Umbral card; the showcase uses Ashen perspective.
4. Challenge binding/read DTOs moved earlier with the publication interface to avoid divergent consumers.
5. Prelaunch schedules are read-only. Future practice does not unlock early.
6. Draws and faults have no defeat cooldown; only loss/surrender starts one hour.
7. Practice and rewarded histories/cooldowns remain separate.
8. Published/scheduled editorial records are immutable; corrections need a new record/version.
9. Arena contrast/hit-target review occurred with real battle overlays instead of artwork-only acceptance.
10. Explicit challenge arena mapping takes precedence over ordinary public location/hash mapping.
11. `practiceDaily` is an additive closed-contract projection so accounts can see practice recovery separately.
12. The complete immutable catalog stays public. UI seals unrevealed weekly cards; this is not secrecy against catalog inspection.
13. Migration/image verification uses explicit 30-second I/O bounds after the full run exceeded Vitest's five-second default under build load; assertions were preserved. Historical art assertions now include approved v5 overrides and the supplemental atlas.

## Remaining acceptance limits

The [100-game benchmark](elements-balance.md) completed without invalid actions/crashes/step-limit faults: Dawnward 56 wins, Ashen 40, four draws, median 11 turns. One game per pairing is not proof of balance; event-card economy and human strategy require longer playtesting. No new numerical nerf was inferred from this small sample.

Physical touch devices, Safari, screen-reader sessions, extended frame-time benchmarks and the existing human-playtest release gates remain open. Browser emulation and automated accessibility checks do not replace them. Production and public release are outside this task. Future-season duplicate compensation and multi-season administration are not implemented by this initial twelve-week season.


## Applied environments — 22 October 2026

Local interactive UI/API are running at **http://localhost:3000** / loopback 3001 with existing managed Google identity configuration. Delivery inspection found six migrations already installed; the forward migration/grant command completed safely. The import created 114 records, then preview reported all 114 unchanged. Exact existing-row checksums were preserved across accounts, sessions, decks, revisions, matches, checkpoints, initializations, results and receipts. No player reset occurred. [Local database evidence](evidence/elements-events/local-database.json).

Actual local browser readback returned HTTP200 on Home, Heroes, Features, News, Events and the first weekly detail, with no page/console errors or HTTP5xx. The event page fits 1440px, 768px and 375px; API reports 20 heroes/72 cards/36 powers and twelve sealed upcoming weeks. At the 17:13 Vietnam-time check, zero news articles were visible because the six initial articles are scheduled for **19:30 on 22 October**. This is publication timing, not missing seed data. [Readback](evidence/elements-events/local-browser.json), [tablet preview](evidence/elements-events/local-event-768.png).

Neon project `round-darkness-78734677`, **development** branch `br-odd-pine-a1pw77e9`, database `oathfront`: applied migrations 0004–0006 and their exact Drizzle ledger hashes/timestamps, then imported the canonical bundle. Readback confirms six migrations, 18 posts, 12 weeks, 84 scenarios and unchanged zero development principals/matches. The 114-record manifest digest matches local (`f74980de1dddd58d0cc1def5b9498101`); all three catalog SHA-256 values match. Runtime can read publication tables but cannot insert/update/delete them; reward bindings/ledger/cosmetics remain append-only. [Neon readback and grants](evidence/elements-events/neon-development.json).

The MCP transport rejects multiple commands in one prepared statement. The first migration attempt rolled back; the ledger and absent new tables were checked before retry. Exact versioned DDL was then grouped into prepared-compatible `DO` statements and verified locally before the guarded transaction. Content import used one atomic `DO` bootstrap with immutable-conflict guards. No production branch, deployment or registry was changed.

Source commits exclude the pre-existing audio implementation/assets. Its untracked browser test received only the compatibility locator update for Briar's renamed title and remains uncommitted with that work. No credentials or environment files are staged. Current Vercel read-only inspection found no OathFront/repository-linked project in the connected team; this task does not provision one.
