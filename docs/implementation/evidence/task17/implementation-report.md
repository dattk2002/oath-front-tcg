# Task 17 report — DONE_WITH_CONCERNS

## Outcome and disposition

Implemented a pure, deterministic runner using the actual game-engine and bot exports. Executed the required **900 baseline + 400 stress games once each**. All 1,300 completed with zero faults, rejected bot choices, illegal accepted setup probes, and observed private projection violations. Recorded immutable input identities, exact version/source/catalog/deck/seed pins, aggregate metrics and per-match initial/final state hashes without raw private states or logs.

**Balance is not accepted.** GOOD won 720/900 (80%), EVIL 158/900 (17.56%); every matchup and all six hero rates trigger the 40–60% investigation criterion. Controller reviewed concrete diagnosis and explicitly decided to retain prescribed immutable bot_v1/core_v1 for Task 17, with **BALANCE-CORE-01, BALANCE-UTILITY-01 and BALANCE-PHASE-01 OPEN**. This is not a threshold waiver, proof of balance, or full M5 acceptance. A bounded proposed bot_v2 follow-up is documented; no replacement policy was implemented or validated.

Human five-person × two-match gate remains **awaiting_external_input**, with Vietnamese instructions and an anonymous blank form prepared. No human results, durations, or feedback were invented. Existing **PERF-P95-01 FAILED/OPEN** is retained; no performance rerun occurred. No Google login recheck, API, DB, browser, server, or port operation was needed.

## Commits and changed scope

- `90abee3 feat(simulation): add deterministic engine-backed balance evidence`
- `eee7589 docs(balance): record open findings and human playtest protocol`

Base: `24121388982db3d3994f0fad8d936280f40deb25`, main. Native git only; no push/deploy/PR/external messages. No branch was created and no subagent was dispatched. Parent-owned `docs/implementation/milestones.md` and `docs/implementation/controller-decisions.md` are excluded from both commits.

Files:

- `tools/simulation/run.ts`: simulateMatch/runMatrix, real engine/bot orchestration, projected observation memory, legal selection/application checks, finite deterministic guards, synthetic stress setup, release/source pinning, immutable CLI reports.
- `tools/simulation/metrics.ts`: sample/outcome/turn/hero/matchup/location/card draw/use/legal opportunity/block/power/fatigue/poison/phase/action/fault/privacy accounting, descriptive Wilson intervals.
- `tools/simulation/seed-list.ts`: deterministic namespace and fixed first 20 regression seeds.
- `tools/simulation/tsconfig.json`: focused strict static check.
- `tools/simulation/tests/determinism.test.ts`: seven focused tests, including actual archived 900/400 artifact audit without rerunning matrices.
- `tools/simulation/tests/diagnose.ts`: bounded offline diagnostic script, separately hashed, excluded from production runner source identity. Nine replays plus five controlled utility probes; no production policy changes.
- `vitest.config.ts`: discovers focused simulation tests.
- `docs/implementation/balance/core-v1/core-v1-2e49b453a7ff87701841bbc212018a9607ed1d9af7ade56ddb078e6709d9515a.json`: actual 900-game baseline.
- `docs/implementation/balance/core-v1/stress-55e946eaad26f31290756750cc8e4af78865512754c8b8981a445952fba2e72f.json`: actual 400-game stress evidence.
- `docs/implementation/balance/core-v1/diagnostic-subset-v1.json`: nine baseline-identical replays, phase energy/own-budget observations and controlled utility differentials.
- `docs/implementation/balance/core-v1/README.md`: complete findings, coverage, uncertainty, open decisions and reproducible commands.
- `docs/implementation/balance/core-v1/playtest-vi.md`: Vietnamese instructions, blank participant form and blank organizer summary.

No engine, bot, content, contract, runtime/API/UI, dependency manifest or lockfile was changed. Node24.20.0, pnpm11.25.0 and locked tsx4.23.15 were already available. No dependency was added just to match the original tsx command.

## TDD evidence

Before runner/metrics/seed implementation:

```sh
pnpm exec vitest run tools/simulation/tests/determinism.test.ts
```

Exit **1**. First run: 5/5 assertion failures; after adding the fault/privacy case, 6/6 assertion failures. Representative expected failure:

```text
AssertionError: expected undefined to be type of 'function'
Expected: "function"
Received: "undefined"
```

Tests initially loaded absent modules defensively so the missing implementation produced explicit failed assertions. Final tests use static imports. The failures were expected because no runner/metrics/seed implementation existed. Tests exercise the real engine and bot, not simulated/mocked transitions.

After implementation, intermediate focused run: 4 passed, 2 failed. One helper import incorrectly assumed a workspace alias available from the root tools directory; corrected to a direct source export import. Three injected stress states faulted. Root cause: first fixture draft injected five copies of one card (violating two-copy discard contracts), and an extra power without matching block/power cap accounting. Corrected fixture construction to consume diverse real deck card instances and account for received powers/block use. No engine workaround or card number change was made. Next run: **6/6 passed**, 8.78s.

After exact event-order occupancy accounting, source/schema pins, scoped tsconfig and final source formatting: **6/6 passed**, 8.59s. After real workloads, added artifact verification assertions, then improved the privacy negative test to supply a genuinely valid opponent-owned CardDrawn event instead of merely malformed event data. Final run:

```sh
pnpm exec vitest run tools/simulation/tests/determinism.test.ts
```

Exit **0**, **7/7 passing**, duration **8.57s**, pristine output. Coverage:

1. Nine real matchups with terminal/outcome accounting and zero faults/leaks/illegal accepted probes.
2. All 20 fixed seeds replayed twice with identical metrics, match rows/final hashes, and input identity.
3. Rejection of unsupported/mixed versions/source hashes and duplicate seeds/matchups before running.
4. All four real-engine stress paths: full board, fatigue, response movement/S_E_FS, poison+armor.
5. Independently hand-derived metric totals/rates/draw denominator/uncertainty bounds.
6. Rejection of extra private fields and a valid opponent-owned event; deterministic exhaustion reported as a fault.
7. Audit real 900+400 artifacts: correct counts/seeds/unique identities, exact recomputed aggregate metrics and canonical input hashes, zero faulty/illegal/leaking rows. No expensive 900-game rerun to assert array length.

## Verification commands and exits

Final focused static checks (each exit **0**, no diagnostics):

```sh
pnpm exec tsc -p tools/simulation/tsconfig.json
pnpm exec eslint tools/simulation vitest.config.ts
git diff --check
git diff --cached --check
```

Initial compiler invocation with file arguments and an existing TS6 root config exited1 with TS5112; adding --ignoreConfig then revealed missing explicit node types and a mistaken damage event name (exit2). Switched to the committed scoped config with node/vitest types, and collected real DamageBatchResolved packets rather than nonexistent DamageApplied events. These were implementation/tooling corrections, not additional TDD RED claims.

Required full runs, both exit **0**:

```sh
/usr/bin/time -p pnpm exec tsx tools/simulation/run.ts --matrix core-v1 --seeds-per-matchup 100 > /tmp/oathfront-t17-baseline.log
/usr/bin/time -p pnpm exec tsx tools/simulation/run.ts --matrix stress --seeds-per-matchup 100 > /tmp/oathfront-t17-stress.log
```

These independent jobs ran concurrently. Baseline: `real150.69 user153.62 sys0.36`; stress: `real46.39 user47.69 sys0.25`. These are local CPU execution observations, not human game durations. Each workload was executed once on the frozen production runner source.

Final diagnostic command, exit **0**, nine initial/final hashes matching baseline:

```sh
pnpm exec tsx tools/simulation/tests/diagnose.ts docs/implementation/balance/core-v1/core-v1-2e49b453a7ff87701841bbc212018a9607ed1d9af7ade56ddb078e6709d9515a.json docs/implementation/balance/core-v1/diagnostic-subset-v1.json > /tmp/oathfront-t17-diagnostics-final.log
```

Diagnostic iteration disclosure: the first successful bounded diagnostic exposed misleading negative MULLIGAN “spent” values from energy refill, and the initial shield control had no incoming attack. Changed this test-only diagnostic to sum CardPlayed/PowerUsed energy events and use a contested shield case/known-lethal movement cases. An attempt to archive the initial output to /tmp failed with EXDEV, then the following diagnostic safely failed with EEXIST rather than overwrite evidence. The initial output was moved into ignored `.superpowers/sdd/2026-10-20-oathfront-implementation/task-17-diagnostic-initial.json`, and the final corrected diagnostic command above passed. No baseline/stress rerun or output replacement occurred. Diagnostic source is outside the pinned production runner hash and has its own recorded hash.

Current-source readback check, exit **0**:

```sh
pnpm exec tsx -e 'import { currentVersions } from "./tools/simulation/run.ts"; import { readFileSync } from "node:fs"; import assert from "node:assert/strict"; for (const file of ["docs/implementation/balance/core-v1/core-v1-2e49b453a7ff87701841bbc212018a9607ed1d9af7ade56ddb078e6709d9515a.json", "docs/implementation/balance/core-v1/stress-55e946eaad26f31290756750cc8e4af78865512754c8b8981a445952fba2e72f.json"]) assert.deepEqual(JSON.parse(readFileSync(file,"utf8")).inputs.versions,currentVersions()); console.log("Both report source/version identities match current source");'
```

Output: `Both report source/version identities match current source`.

Whole-workspace/build/browser/DB/performance gates intentionally not rerun: the task's explicit verification discipline assigns final integration to Task18, requires pure simulation here and preserves the Task16 sealed runtime. Human testing cannot be performed by bots. No unperformed gate is claimed passing.

## Exact input identities

Shared version pins:

```text
rules       rules_v1
content     core_v1
locations   locations_v1
bot         bot_v1
rng         hmac-sha256-xoshiro128ss-v1
node        v24.20.0
contentHash 37ec966ce1e734e8e5f85310e384ea0d1c4a126eea4618471ea874d60546cdcc
engineHash  f8dc1c6ba9ed3fcd300f4b5306fc3950340dec131cc24e9874969e680eae1ae1
botHash     7629956b10d3b855818b4863676e65eb50df6b898e5284a47ee78fadd5d6d7ab
contractsHash e6a1f7cf84564e629ec010e976924e4b1db9aee94e06ebb625f06b57645f2e6f
runnerHash  42a0a2dfa96ed8a7d8a974ebccc2fd7a3ffa36f2e790127870773a43381df56b
lockfileHash 8f5591c5d678b3728376f82d856cb101112ba2f5bf72879f4f59781d5820dd04
```

Input hashes:

- Baseline: `2e49b453a7ff87701841bbc212018a9607ed1d9af7ade56ddb078e6709d9515a`
- Stress: `55e946eaad26f31290756750cc8e4af78865512754c8b8981a445952fba2e72f`
- Both ordered 100-seed lists, canonical SHA-256: `29fa32880a85be0683d68b5e5893324131d6c3acc975806b4248efe2d9c4e9f8`
- Diagnostic source: `143146980928f069ae95d68497e2cb462ac29f157ead48806b7b7619a0a7e7a9`

Artifact file SHA-256, checked with `sha256sum` (exit0):

- Baseline JSON: `a57a7060eb4ccc6f81cc9186ad4c52a5d5e8107c7c6f29a79602f0c4d1a51280`
- Stress JSON: `3a6416af9a6e44f2d1d51098a3b578df5972598c7beec130acc90b71c8112754`
- Diagnostic JSON: `68cc68e7499043e17dd180227ee54c23b429472561c6b98e1e42a078a7349dad`

## Baseline output

```text
matches900 matchupCount9 faultCount0
GOOD720 EVIL158 DRAW22 FAULT0
meanTurns10.943333333333333
turnLimitRate0.024444444444444446
beforeTurn5Rate0
illegalAccepted0 rejectedBotActions0 privateLeaks0
illegalProbes2700 projectionChecks61576
phaseActions MULLIGAN1800 EVIL_DEPLOY19260 GOOD_PLAY24221 EVIL_TRICKS13615 COMBAT2680
blockUsage matches900 GOOD774 EVIL1906 allThreeBeforeTurn6=0
unusedPowers GOOD15 EVIL523
```

Matchups (GOOD wins/EVIL wins/draws, n100 each):

```text
H_G_BV/H_E_FX 77/21/2
H_G_BV/H_E_FS 82/18/0
H_G_BV/H_E_XS 62/28/10
H_G_BP/H_E_FX 87/13/0
H_G_BP/H_E_FS 89/11/0
H_G_BP/H_E_XS 95/4/1
H_G_VP/H_E_FX 81/17/2
H_G_VP/H_E_FS 83/16/1
H_G_VP/H_E_XS 64/30/6
```

All hero rates outside40–60: H_G_BV73.67%, H_G_BP90.33%, H_G_VP76.00%, H_E_FX17.00%, H_E_FS15.00%, H_E_XS20.67%. Draws remain in denominators. Descriptive Wilson intervals and full distributions are in README/JSON. Fixed paired seed reuse and preset-only bots limit generalization; no claim of independent human trials.

All2700 locations reveal. Lane3 occupied at reveal91/900 (104units), lane5=112/900 (113units); lane1 reveals before deployment. Location exposure outcome rates are correlations with seed/deck/board, not causal outcome-change estimates. Per-match lanes/turns/pre-reveal occupancy permit stratification; no hidden location forecast or counterfactual location replacement is claimed.

## Stress output

```text
matches400 matchupCount4 faultCount0
illegalAccepted0 rejectedBotActions0 privateLeaks0
illegalProbes1200 projectionChecks16851
fatigueDamage1765 poisonPackets1981 responseMoves229
```

All scenarios n100, H_G_VP/H_E_FS, synthetic post-mulligan fixture states:

```text
full-board: GOOD85 EVIL15 DRAW0; initialBoardUnits10/10 in every game
late-draw: GOOD37 EVIL58 DRAW5; total fatigueDamage1765
block-response-move: GOOD81 EVIL19 DRAW0; movement100/100, S_E_FS100/100, responseMoves133
mass-poison-armor: GOOD79 EVIL21 DRAW0; initialPoisonArmorUnits10/10, poisonPackets1981
```

Stress outcomes are not merged into faction balance. They test actual engine/bot paths under explicit injections, not naturally sampled board states. Location normalization, skipped turns and empty decks are documented. Fatigue damage sums final packets, poison packet counts include mitigated packets. Other existing BALANCE special interactions are not falsely claimed as additional100-seed runs.

## Diagnosis, decisions, and limits

Presets cover48/60 cards. Twelve absent everywhere: B08, EC04, EC06, F05, GC04, GC06, P04, P07, S05, V08, X04, X07. Cannot infer weak cards or >80% mandatory human deck inclusion from this selection.

Five legal-but-unused preset cards (draws/legal decision opportunities/plays):

```text
B06 839/6772/0
P06 748/6137/0
X06 707/3394/0
S06 663/2353/0
S07 417/1458/0
```

A legal opportunity counts a definition once per bot decision, not each target, unique copy, or independent trial.

Nine fixed baseline-identical diagnostic games contain96 turns per normal phase:

```text
EVIL_DEPLOY energy557, spent176, exit381
GOOD_PLAY energy557, spent343, exit214
EVIL_TRICKS energy381, spent73, exit308
EVIL_TRICKS zero-energy29/96 (27/45 turns1–5)
positive own tricks blocked by spent budget19/96
positive own powers blocked by spent budget16/96
union28/96, all in turns1–5
```

Counterfactual restores only own pre-deploy energy against the actual current public board; it does not prove an earlier alternative line would win. Large EVIL unused energy308 means starvation is not the sole explanation. Current DECKS does not prescribe budget reservation. Source audit found no unconditional GOOD score bonus or incorrect phase actor. Power-versus-card hand-cost accounting is symmetric by actor; intentionally different card definitions and phase order remain relevant.

Controlled real-engine public-board counterexamples (both block caps exhausted to remove unknown grants; no hidden hand/location prediction): B06 score−0.55 preserves2HP GC01; X06−0.05 kills1HP enemy at endturn; P06/S06−0.05 and S07−1.9 prevent known combat lethal that occurs without the move. The current immediate board weights/hand-energy penalty/positive-only gate cause these omissions exactly as DECKS specifies. This establishes a policy limitation, not a proven implementation violation.

Controller disposition: retain v1; OPEN BALANCE-CORE-01, BALANCE-UTILITY-01, BALANCE-PHASE-01. Proposed bounded bot_v2 follow-up: known public combat survival/utility, independently evaluated own phase-budget policy, fixed counterexample tests, preserve old v1 for active matches/replay, new identified baseline only after approved policy change. No card/rule numbers changed. No claim these interventions will achieve40–60 without testing.

Human minimum5×2 actual games after tutorial and beta30-feedback target remain awaiting_external_input. Vietnamese form records anonymous code, tutorial completion, phase/cost/target misunderstanding, pause-excluded duration, thinking/animation observations when actually measured, motion/audio impressions. All fields are blank.

## Self-review

Reviewed the full runner/metrics/tests/diagnostic source, exact staged file list and whitespace, all threshold deviations, and preserved input/hash contracts. Verified current source identities equal both full reports after source settled. Artifacts are deterministic JSON and intentionally verbose (~4MB combined) for individual result inspection; no raw states/private logs are committed. Runtime runner remains in the three planned source modules; the additional test-only diagnostic exists to satisfy the controller's bounded causal request. No implementation reviewer was spawned.

Known limits: reports describe only normal-bot preset games; source audit/utility counterexamples do not establish causal balance decomposition; negative setup probes are wrong-phase tests, not exhaustive cost/target fuzzing; projection checks are bounded, not an exhaustive security claim; synthetic stress win rates are not baseline; simulation CPU time cannot establish human duration. The open material balance, human and performance gates prevent full M5 acceptance. Task18 integration is controller-owned and remains independent per execution amendment.

Final git status after commits: only parent-owned milestones modification and untracked controller-decisions document remain. No task-owned uncommitted source/artifact changes remain.

## Review fix round 1 — two minor diagnostic hardenings

Base `eee75892006bc82bbffc4d0e08283f1321b15a2c`; commit **`f78e647 test(simulation): pin diagnostic fixtures and reject incomplete probes`**. Read and verified both findings in task-17-review.md. This round changes only test-side diagnostics, its new artifact, and the balance README. No engine/bot/content/production runner/version change, no unchanged 20-seed test execution, and no 900/400 matrix rerun occurred.

### Changes

1. Added `tools/simulation/tests/diagnostic-guards.ts`, imported by the diagnostic. Explicit provenance now covers diagnostic source, the new guard source, `packages/game-engine/tests/helpers.ts`, its transitive `tests/fixtures/match-fixture.ts`, and the evaluated fixture config/seed input hash. Shared production dependency pins remain in the unchanged baseline version identity. This closes the helper-only-change provenance gap.
2. Combat probing now explicitly requires either ACTIVE at the intended TURN_START boundary with no outcome, or COMPLETED with the expected HERO_DEFEATED outcome. FAULTED, other lifecycle exits, invalid budgets and exhausted root budgets throw instead of producing a valid-looking utility result.
3. Added `tools/simulation/tests/diagnostic-guards.test.ts`: real engine exhaustion with budget1, fault rejection, valid engine boundary/lethal completion, unexpected PAUSED exit rejection, and dependency fingerprint changes for helper and transitive fixture edits.
4. Wrote NEW `docs/implementation/balance/core-v1/diagnostic-subset-v2.json`. Original diagnostic v1, baseline900 and stress400 remain byte-for-byte unchanged. Updated the balance README link/provenance explanation, preserved the historical v1 link and its more limited provenance, and retained all open gates.

### Exact retained command transcripts and exits

The following files contain this round's actual command, combined stdout/stderr, and child EXIT_CODE. They are stored under ignored `artifacts/task17-fix-round1/` for the controller's evidence publication; no file in parent-owned `docs/implementation/evidence/task17/` was modified. **Historical first-round 7/7 stdout was not retained and was not reconstructed or regenerated.** This round's actual focused output is newly captured.

- `red.log`: `pnpm exec vitest run tools/simulation/tests/diagnostic-guards.test.ts` — exit **1**, 5/5 assertion failures before implementation, expected undefined guard/dependency functions. No missing-module error was presented as a test result. Final tests use static imports.
- `green.log`: `pnpm exec vitest run tools/simulation/tests/diagnostic-guards.test.ts` — exit **0**, **5/5 passing**, duration **274ms**, pristine output.
- `typecheck.log`: `pnpm exec tsc -p tools/simulation/tsconfig.json` — exit **0**, no output/diagnostics.
- `lint.log`: `pnpm exec eslint tools/simulation/tests/diagnose.ts tools/simulation/tests/diagnostic-guards.ts tools/simulation/tests/diagnostic-guards.test.ts` — exit **0**, no output/diagnostics.
- `diagnostic.log`: `pnpm exec tsx tools/simulation/tests/diagnose.ts docs/implementation/balance/core-v1/core-v1-2e49b453a7ff87701841bbc212018a9607ed1d9af7ade56ddb078e6709d9515a.json docs/implementation/balance/core-v1/diagnostic-subset-v2.json` — exit **0**, matchingFinalHashes9, full actual phaseSummary and all five utility differentials retained. Only these nine bounded diagnostic matches and their utility paths were replayed for the new artifact.
- `artifact-readback.log`: read-only Python assertions — exit **0**. All nine traces/phase summaries and five utility differentials equal v1; all four dependency file hashes and both aggregate hashes recompute; original v1/baseline/stress file SHA-256s remain unchanged.

Also `git diff --check` and `git diff --cached --check` exited0 before commit. Parent-owned docs/README.md, milestones.md, controller-decisions.md and the task17 evidence directory were excluded from this commit. No push/deploy/PR/messages to external services, subagents, DB, server or port actions occurred.

### New diagnostic identities

```text
diagnosticVersion diagnostic_v2
sourceHash e418ed097381a168383e5995f060b9df21049deec1610e3e57318fda81f79d14
dependencyIdentityHash 626c4ea3c1e7346f6fd8bb827cb37af8fcf0265dca350901c5fdea1133478f03
diagnosticDependencies.sha256 7d20b071c0678a6b037300425e976fb43063d95c8673811c028cd35849b51ad8
fixtureInputsHash 9ac715c7708e7d92ccf88161dacd33220cb8e698131a270a751fd06d1f43df11
artifact SHA-256 0cd3adbafad3e70378882a8b6263b1cef21279dffa6874f6e8d2e123a7dd9a37
```

Dependency files and SHA-256:

```text
packages/game-engine/tests/helpers.ts 786eb977a01b6a8479c9d8b7c970af0f6aed465c05ae47c9ca572a126ba3dadc
tests/fixtures/match-fixture.ts 4922ea87c48643b5b9832486c9958610ad550f49a078947c35d663672f61130b
tools/simulation/tests/diagnose.ts e418ed097381a168383e5995f060b9df21049deec1610e3e57318fda81f79d14
tools/simulation/tests/diagnostic-guards.ts add579c884941bbad24bb50e241d951bd8f2bb51773e070398c81ce0de7b02a7
```

All shared baseline/stress version, source, catalog and input hashes listed above are unchanged. The dependency identity is combined with those shared pins and baselineInputHash in the diagnostic report; it does not imply that test-only helper files were added to the production runner's version hash.

### Self-review and disposition

Reviewed the full changed source/test/doc diff, new dependency manifest and artifact readback, and staged file scope. Five focused checks cover guard failure paths and helper/fixture identity changes; the bounded successful rerun validates unchanged utility outcomes. No new empirical balance or human evidence was created. BALANCE-CORE-01, BALANCE-UTILITY-01, BALANCE-PHASE-01 remain OPEN, HUMAN-PLAYTEST-01 remains awaiting_external_input and PERF-P95-01 remains FAILED/OPEN. M5 is not accepted. Ready for narrow re-review of these two hardenings.
