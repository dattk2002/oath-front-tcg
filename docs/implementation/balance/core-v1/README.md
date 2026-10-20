# core_v1 — simulation evidence and open balance investigation

**Status: balance investigation OPEN; M5 is not accepted.** The baseline strongly favors GOOD. These are NORMAL bot versus NORMAL bot games, not human observations. No card, rule, preset, or bot version was changed to obtain these results.

## Reproduce and identify a run

From the repository root, with the pinned Node 24.20.0 / pnpm 11.25.0 toolchain:

```sh
pnpm exec vitest run tools/simulation/tests/determinism.test.ts
pnpm exec tsc -p tools/simulation/tsconfig.json
pnpm exec eslint tools/simulation vitest.config.ts
pnpm exec tsx tools/simulation/run.ts --matrix core-v1 --seeds-per-matchup 100
pnpm exec tsx tools/simulation/run.ts --matrix stress --seeds-per-matchup 100
```

`tsx` 4.23.15 already exists in the locked toolchain; no package was added. No server, browser, database, user instance, or port is used. Reports are named by SHA-256 of their canonical input. Existing output is accepted only when the bytes match; a differing report is never overwritten.

- Baseline: [900 matches / nine matchups](core-v1-2e49b453a7ff87701841bbc212018a9607ed1d9af7ade56ddb078e6709d9515a.json), input `2e49b453a7ff87701841bbc212018a9607ed1d9af7ade56ddb078e6709d9515a`.
- Stress: [400 matches / four fixtures](stress-55e946eaad26f31290756750cc8e4af78865512754c8b8981a445952fba2e72f.json), input `55e946eaad26f31290756750cc8e4af78865512754c8b8981a445952fba2e72f`.
- Fixed regression seeds: the first 20 seeds of the immutable `oathfront-balance-core-v1-seed-NNNN` namespace. Both full workloads include all 20; focused tests replay the 20 twice on one matchup, plus one seed across all nine matchups. The tests audit the stored 900/400 results without running those matrices again.

Both reports pin `rules_v1 / core_v1 / locations_v1 / bot_v1`, RNG algorithm, Node version, exact decks, ordered seed list, catalog checksum, engine/bot/contracts/runner source hashes, and lockfile hash. `contentHash` uses the same canonical catalog algorithm as persistence. Seeds and state hashes here are offline evidence; no raw state, live match seed, or private event log is added to browser DTOs. Engine `humanSide` is an administrative role required by its existing interface; both decision makers are explicitly labeled NORMAL_BOT in report inputs.

## Baseline findings

900 completed games: **GOOD 720 (80.00%), EVIL 158 (17.56%), draws 22 (2.44%)**. Average 10.943 turns. Turn-limit outcomes: 22/900 (2.44%, below the >5% investigation trigger). Before turn 5: 0/900 (below >40%). All 900 games reached the lane-5 reveal; no game ended before turn 6.

Every matchup exceeds 60% GOOD wins, and all six hero win rates lie outside 40–60%. Draws remain in the denominator; they are not reassigned as wins. Each matchup has 100 games, each hero has 300 appearances.

| GOOD hero | H_E_FX: GOOD / EVIL / draw | H_E_FS: GOOD / EVIL / draw | H_E_XS: GOOD / EVIL / draw |
|---|---|---|---|
| H_G_BV | 77 / 21 / 2 | 82 / 18 / 0 | 62 / 28 / 10 |
| H_G_BP | 87 / 13 / 0 | 89 / 11 / 0 | 95 / 4 / 1 |
| H_G_VP | 81 / 17 / 2 | 83 / 16 / 1 | 64 / 30 / 6 |

| Hero | Win rate | Wins / losses / draws | Wilson 95% interval, illustrative |
|---|---|---|---|
| H_G_BV | 73.67% | 221 / 67 / 12 | 68.41–78.33% |
| H_G_BP | 90.33% | 271 / 28 / 1 | 86.46–93.19% |
| H_G_VP | 76.00% | 228 / 63 / 9 | 70.86–80.48% |
| H_E_FX | 17.00% | 51 / 245 / 4 | 13.17–21.66% |
| H_E_FS | 15.00% | 45 / 254 / 1 | 11.40–19.48% |
| H_E_XS | 20.67% | 62 / 221 / 17 | 16.47–25.61% |

The fixed seeds are reused across matchups to control variation. They are not nine independent random seed samples, and the intervals are descriptive binomial approximations, not guarantees about human play, new decks, or a balanced release.

## Safety, blocks, powers, and coverage

Baseline: **0 faults, 0 rejected bot choices, 0 illegal accepted probes, 0 private projection violations** across 61,576 bot decisions/views and 2,700 deliberately invalid setup probes. Every selected action is checked against the current legal list and then submitted to the real engine. Negative probes cover three wrong-phase actions at setup (PASS, an unavailable-card play payload, and an unavailable-power use payload); they do not constitute exhaustive illegal cost/target fuzzing. Strict public schemas and owner visibility are checked before data enters bot memory; this is bounded projection evidence, not a claim of an exhaustive security audit.

All 900 games used at least one block: 774 GOOD blocks and 1,906 EVIL blocks. Of 2,680 block responses, bots used the free power 2,071 times and kept it 609 times. No side used its third block before turn 6. End-of-match unused reserve powers: GOOD 15, EVIL 523. These are counts, not human impressions of block usefulness.

Phase actions: MULLIGAN 1,800; EVIL_DEPLOY 19,260; GOOD_PLAY 24,221; EVIL_TRICKS 13,615; COMBAT responses 2,680. Detailed card draws, plays, legal decision opportunities, power use, turn distributions, and per-match final hashes are in the report.

The six fixed presets contain **48/60 card IDs**. Missing from every preset: B08, EC04, EC06, F05, GC04, GC06, P04, P07, S05, V08, X04, X07. Their absence gives no evidence that they are weak or illegal. Preset-only simulations also cannot establish the >80% mandatory-card criterion in diverse human decks.

Five cards were drawn and legal but never played:

| Card | Draw events | Legal decision opportunities | Plays |
|---|---:|---:|---:|
| B06 | 839 | 6,772 | 0 |
| P06 | 748 | 6,137 | 0 |
| X06 | 707 | 3,394 | 0 |
| S06 | 663 | 2,353 | 0 |
| S07 | 417 | 1,458 | 0 |

An opportunity counts one card definition at one bot decision, regardless of how many legal lanes/targets exist. It is not a unique card copy, game, or independent trial. Draw events may include replacement draws; plays are engine CardPlayed events.

## Bounded causal diagnosis

[Diagnostic subset](diagnostic-subset-v1.json) is separate from baseline and stress. It replays three matchups (matrix indices 0, 5, 7) × the first three fixed seeds, nine games total. All nine initial and final hashes exactly match their original baseline rows. The diagnostic script is under `tools/simulation/tests/diagnose.ts`, outside production runner hashing, and pins its own source hash. It uses only the actual visible board and each actor's known cards for counterfactual evaluation.

```sh
pnpm exec tsx tools/simulation/tests/diagnose.ts docs/implementation/balance/core-v1/core-v1-2e49b453a7ff87701841bbc212018a9607ed1d9af7ade56ddb078e6709d9515a.json /tmp/oathfront-diagnostic-replay.json
```

Across 96 turns in that subset:

| Phase | Entry energy total | Energy spent | Unspent at pass |
|---|---:|---:|---:|
| EVIL_DEPLOY | 557 | 176 | 381 |
| GOOD_PLAY | 557 | 343 | 214 |
| EVIL_TRICKS | 381 | 73 | 308 |

EVIL_TRICKS began at zero energy in 29/96 phases, including 27/45 phases in turns 1–5. Restoring only EVIL's own pre-deploy budget against the actual current public board exposes positive-score owned tricks blocked by insufficient energy in 19/96 phases, and powers in 16/96; the union is 28/96 phases, all during turns 1–5. This quantifies early budget competition. It does not prove those alternative lines would win: GOOD has already acted, the hypothetical earlier hand/board may differ, and future opponent actions are unknown. The 308 energy left unused at EVIL_TRICKS pass also shows budget starvation is not the whole explanation.

Source audit: current bot_v1 greedily ranks currently legal actions; EVIL_DEPLOY offers units only, and there is no phase-budget reservation. This matches the prescribed DECKS policy, which does not require reservation. The score coefficients and preview deltas are relative to `view.self.side`; no unconditional GOOD scoring bonus or wrong actor mapping was found. Powers spend reserve rather than a hand card, so their score omits the hand-card penalty by design; this difference applies to both factions. Different card/power definitions and the phase order are intentional asymmetries, not a reason to assume equal faction strength.

The specified immediate board weights explain the unused utility cards: spending a hand card costs 1.2 points and energy costs 0.35 per unit. B06's shield gives +1 board value, score −0.55. X06's poison gives +1.5, score −0.05. P06/S06 preserve immediate board value; even the +1.5 blocking bonus leaves −0.05. S07 has no ally landing bonus and costs two energy, score −1.9. The policy plays only positive scores. These are prescribed policy limitations, not evidence that legality or the formula was implemented incorrectly.

Actual-engine controlled public-board differentials demonstrate lost combat utility: B06 preserves a two-HP GC01 that otherwise dies; X06 kills a one-HP enemy at turn end; P06/S06/S07 can prevent an otherwise lethal visible combat while still receiving the negative scores above. These probes exhaust both block caps to exclude unknown power grants, pass intervening phases, and compare the same known combat/end-turn path. They are not extra baseline matches and make no forecast about hidden hands or locations.

## Locations

All 2,700 scheduled locations revealed (900 in each lane 1/3/5). Before reveal, lane 3 was occupied in 91/900 games (104 units), lane 5 in 112/900 (113 units); lane 1 revealed before deployment. This indicates little early deployment into the future reveal lanes under these bots, not that locations cannot matter later.

| Location | Reveals | GOOD wins among exposed games | Pre-reveal units |
|---|---:|---:|---:|
| quiet_meadow | 405 | 330 (81.48%) | 41 |
| volcano | 351 | 275 (78.35%) | 28 |
| storm_peak | 396 | 324 (81.82%) | 46 |
| desert | 279 | 227 (81.36%) | 10 |
| ruined_arena | 378 | 314 (83.07%) | 29 |
| frozen_lake | 315 | 245 (77.78%) | 5 |
| healing_spring | 315 | 258 (81.90%) | 43 |
| ancient_forest | 261 | 187 (71.65%) | 15 |

Per-match rows retain matchup, reveal lane/turn and exact pre-reveal occupancy for stratification. Each matchup has 29–45 exposures per location, reflecting the same seed schedule. The strongest matchup H_G_BP/H_E_XS remains GOOD-favored under every location (26/29 through 44/45 wins); the closest H_G_BV/H_E_XS varies from 21/39 to 33/42. These are overlapping, seed-confounded associations. No counterfactual location replacement was run, so no number is labeled “location changed the outcome.”

## Stress fixtures

Each scenario has 100 fixed seeds, H_G_VP versus H_E_FS, NORMAL bots. They begin after deterministic setup/mulligan, with explicitly synthetic states. Locations are normalized, turn is set to 5 (late draw: 15), and energy follows that turn. Initial setup events remain in the report; this is not a naturally sampled match distribution.

| Fixture | GOOD / EVIL / draw | Intended path |
|---|---|---|
| full-board | 85 / 15 / 0 | 10 diverse real deck instances occupy the board; cards are removed from hand/deck, preserving the copy limit |
| late-draw | 37 / 58 / 5 | Both decks emptied at turn 15; 1,765 final fatigue damage across the run |
| block-response-move | 81 / 19 / 0 | Controlled early lane-1 response queue; movement in 100/100 games, S_E_FS used in 100/100; 133 response moves total |
| mass-poison-armor | 79 / 21 / 0 | 10 units start poisoned with armor; 1,981 poison packets, including mitigated packets |

All 400 stress games completed with **zero faults, rejected bot choices, illegal accepted probes, and private projection violations** (16,851 checked views; 1,200 invalid setup probes). These outcomes are not added to the faction balance estimate. Stress is coverage evidence; other listed special interactions remain covered by the existing focused engine suites rather than being falsely claimed as novel 100-seed scenarios here.

## Decisions still open

- **BALANCE-CORE-01 OPEN:** GOOD 80%; every matchup and every hero triggers investigation. Do not declare core_v1 balanced.
- **BALANCE-UTILITY-01 OPEN:** quantify/evaluate a separately versioned public combat/turn-end utility policy, with fixed shield/poison/move regressions before changing card numbers. Retain bot_v1 for active matches and replay.
- **BALANCE-PHASE-01 OPEN:** test a separately versioned policy for known own energy competition across EVIL_DEPLOY and EVIL_TRICKS. The nine-game diagnostic is hypothesis evidence, not a measured win-rate improvement.
- **HUMAN-PLAYTEST-01 awaiting_external_input:** [Vietnamese instructions and blank anonymous form](playtest-vi.md). No confirmed five-person/two-match data, no 30-match beta data, no measured human duration or phase/cost/target comprehension data.
- **PERF-P95-01 FAILED/OPEN:** inherited from Task 16; not rerun or resolved by this task.

No rule/UX violation or implementation scoring asymmetry was established by these probes. The controller decided to retain prescribed bot_v1/core_v1 for this task: the probes establish limitations, not an implementation violation or a validated replacement. A bounded proposed bot_v2 next step would test known public combat survival/utility and own phase-budget decisions separately, retain v1 for active matches/replay, add fixed counterexamples, and rerun impacted regressions and a new identified baseline only after an approved policy change. This is not a threshold waiver; changing card numbers first would not follow the agreed investigation order. Until the material balance findings, human gate, and existing performance gate are resolved, this evidence does not close M5. CPU execution time (baseline 150.69s, stress 46.39s, concurrent local runs) is not human game duration and cannot verify the 5–10 minute experience target.
