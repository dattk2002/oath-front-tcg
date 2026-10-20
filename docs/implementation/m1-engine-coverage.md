# M1 engine coverage and integration boundary

This map identifies executable coverage for the engine/content milestone. It does not certify balance, HTTP durability, database persistence, bot policy, or the browser game flow. Public DTOs remain the canonical schema in `docs/contracts/api-v1.schema.json`.

| Acceptance | Executable coverage                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC01       | `packages/game-content/tests/catalog.test.ts`: complete catalog IDs/counts and exact definitions                                                                                                 |
| AC02       | `packages/game-content/tests/catalog.test.ts`: all six 30-card presets, class/faction/copy/type validation                                                                                       |
| AC03       | `game-engine/tests/rng.test.ts`, `setup.test.ts`: golden vectors, stream isolation and fixed-seed setup                                                                                          |
| AC04       | `locations.test.ts`: eligible triples/permutations and lane assignment                                                                                                                           |
| AC05       | `locations.test.ts`, `end-turn.test.ts`: scheduled reveal and no hidden effects                                                                                                                  |
| AC06       | `mulligan.test.ts`:0/1/4 replacements, no removed instance redraw, exactly once, initial powers, zero-card deck/RNG preservation                                                                 |
| AC07       | `phases.test.ts`, `core-abilities.test.ts`: phase ownership, unit/trick/held-power permissions                                                                                                   |
| AC08       | `phases.test.ts`, `end-turn.test.ts`: energy1/10/11, Desert scope, refill/no carry                                                                                                               |
| AC09       | `phases.test.ts`, `locations.test.ts`, `preview-parity.test.ts`: Forest/Frozen entry, move/summon exclusions                                                                                     |
| AC10       | `combat.test.ts`: atomic pair deaths and EVIL display order                                                                                                                                      |
| AC11       | `combat.test.ts`, `end-turn.test.ts`: attack suppression/blocking and full-turn Stun/Exhaust expiry                                                                                              |
| AC12       | `block-response.test.ts`: Pierce packet blocked separately from opposing-unit damage                                                                                                             |
| AC13       | `effects.test.ts`: Armor-before-Shield and zero damage                                                                                                                                           |
| AC14       | `combat.test.ts`, `block-response.test.ts`: positive regular attack charge, damage-type exclusions, three-block cap                                                                              |
| AC15       | `block-response.test.ts`: four distinct powers, exact free-response power, Keep then normal-phase use costing1                                                                                   |
| AC16       | Pure JSON continuation regression in `block-response.test.ts`; durable DB/reload/browser acceptance remains M2/M3                                                                                |
| AC17       | `effects.test.ts`, `combat.test.ts`, `end-turn.test.ts`: stable cascades, simultaneous lethal, no resurrection, terminal checkpoint stops later roots                                            |
| AC18       | `block-response.test.ts`, `combat.test.ts`: movement and attack-instance marker, no pair replay, stale queued-source reload                                                                      |
| AC19       | `end-turn.test.ts`: global Poison batch, separate scheduled hooks/location roots, Spring order, turn20 and lethal precedence                                                                     |
| AC20       | `effects.test.ts`, `end-turn.test.ts`, `preview.test.ts`: sequential draw2, cap10 public overdraw, fatigue1/2/3 and atomic mandatory dual fatigue                                                |
| AC21       | `invariants.test.ts`: 1000 seeds × up to100 legal transitions, finite stats, unique IDs, capacity, input purity and illegal state/RNG/sequence purity; canonical hash checks in `replay.test.ts` |
| AC22       | `projection.test.ts`, `preview.test.ts`, `preview-browser.test.ts`: exact schema whitelist, hidden-variant independence, private owner events, response ID privacy, no private runtime imports   |
| AC23       | `replay.test.ts`: canonical hash, ordered HUMAN/BOT/AUTO rows, recorded bot RNG restoration, root cursor/event bounds, complete seeded 20-turn replay including pause/resume                     |

Paths abbreviated as `game-engine/tests/*` are under `packages/`.

## Catalog ability mapping

Every ability below has an individually named assertion in `game-engine/tests/core-abilities.test.ts`; the test also pins the exact set of all 23 IDs. All 60 ordinary cards and 18 powers additionally have individually named engine/public-preview parity cases in `preview-parity.test.ts`. Preview compares visible stats/statuses/hero/count/discard results; symbolic new token IDs and synthetic modifier event sequences are deliberately not compared to server IDs.

| Hook               | Ability IDs                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ON_PLAY            | `GC03:ON_PLAY`, `B03:ON_PLAY`, `V01:ON_PLAY`, `V03:ON_PLAY`, `P02:ON_PLAY`, `P04:ON_PLAY`, `EC03:ON_PLAY`, `F02:ON_PLAY`, `X02:ON_PLAY`, `S03:ON_PLAY` |
| ON_DAMAGED         | `B04:ON_DAMAGED`, `X03:ON_DAMAGED`                                                                                                                     |
| ON_DESTROYED       | `GC04:ON_DESTROYED`, `V04:ON_DESTROYED`, `EC04:ON_DESTROYED`, `F01:ON_DESTROYED`, `F05:ON_DESTROYED`, `X01:ON_DESTROYED`, `X04:ON_DESTROYED`           |
| BEFORE_COMBAT_HERE | `F03:BEFORE_COMBAT_HERE`                                                                                                                               |
| ON_TURN_END        | `V02:ON_TURN_END`, `V05:ON_TURN_END`, `X05:ON_TURN_END`                                                                                                |

The closed 11 primitives share `primitive.ts`; shared selectors use `RuleWorld<UnitView>` and shared arithmetic/unit initialization use `rule-math.ts`. The server adapter retains events, opaque IDs, RNG, root budgets, and private scheduling. `preview-resolution.ts` supplies public-only ports and FIFO cascades; `preview.ts` supplies the action entry and current-board combat estimate. No fake private MatchState is constructed.

## Downstream contracts and limitations

- Client components import `@oathfront/game-engine/preview`, never the server package root. Its runtime graph excludes private engine/RNG/Node imports. A Vite browser-library bundle was verified with zero external imports; Next client integration is still a later milestone.
- `PublicPreview` is a local library result, not a wire schema change: legal, forecast (ACTION/CURRENT_COMBAT/NONE), uncertainty/unknowns, immediateWin/Loss, hero-damage/heal metrics, deltaBoardValue, netCardsGained, energySpent, public board/players and per-side unknownDraws counts. New tokens use `preview:summon:*` handles, never server game IDs. Draw identities and hidden assignments are not fabricated.
- Forecast scope is separate from legality: ACTION covers card/power effects; CURRENT_COMBAT covers EVIL_TRICKS pass or COMBAT advance using the visible board. NONE returns the current snapshot without predicting lifecycle/setup/noncombat automatic actions. T08 must exclude those actions from scoring, and T09 must not show their zero metrics as predicted zero effects.
- Numeric metrics are known-only estimates when uncertain. Existing limited hooks have unknown historical counters (`TRIGGER_HISTORY`); they are skipped. Fresh source counters are locally known. Uncertain forecasts suppress immediateWin/Loss. T08/T09 must retain the uncertainty label and UI wording “Dự kiến theo bàn hiện tại”. Future public-observation enrichment may improve estimates without exposing private state.
- `advanceAutomatic` now handles COMBAT/TURN_END/TURN_START, still at most 8 complete roots. Service journal rows call it with maxRoots:1 and persist `describeAutomaticOperation(preState)` for every root, including empty roots. HTTP CPU budgets remain outside engine state and replay.
- `JournalEntry` and `AutomaticOperation` are private server records. BOT rows require a valid recorded nextBotRandomState, restored before post-hash comparison. Tutorial scene AUTO operations are a later closed-union extension.
- PAUSE/RESUME/SURRENDER belong only to the trusted human actor. Surrender confirmation belongs to the later UI. A paused legal list is RESUME/SURRENDER; normal human legal lists additionally contain PAUSE/SURRENDER. Bots must not treat controls as game-policy candidates.
- Projection returns tutorial:null until T14 introduces tutorial state. AC22 HTTP errors/logs/ownership and AC16 persistence remain API/database/browser gates; no private server snapshot should enter those surfaces.
