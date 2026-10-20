# Task 17 review

## Spec Compliance

- ✅ **The amended technical runner/report scope is compliant.** Reviewed base `24121388982db3d3994f0fad8d936280f40deb25` through head `eee75892006bc82bbffc4d0e08283f1321b15a2c`. The three requested production modules, determinism tests, and balance evidence exist; `vitest.config.ts` adds discovery. No engine, bot, content, runtime, dependency, or browser implementation changes occur in the package.
- ⚠️ **The original full Task 17/M5 acceptance gate is not satisfied.** GOOD wins 720/900, all matchups favor GOOD beyond 60%, five legal utility cards remain unused, human 5×2 observations are absent, and PERF-P95-01 remains FAILED/OPEN. These are explicitly open at `docs/implementation/balance/core-v1/README.md:126`–132. Technical approval below does not accept balance, waive these findings, establish production readiness, or approve a whole branch. Independent Task 18 packaging follows the execution amendment only.
- ✅ Actual engine/bot exports drive both actors, including mulligan, automatic phases, block responses, and fresh projected legal actions (`tools/simulation/run.ts:312`, `:472`, `:492`, `:507`, `:519`). NORMAL policy avoids the easy random branch; both agents are explicitly labeled in inputs (`:578`). Inspection of the unchanged evaluator/policy for the named diagnosis risk confirmed the DECKS formula and positive-only gate.
- ✅ Independent structural inspection confirms exactly 900 baseline and 400 stress rows, every expected matrix×seed pair exactly once, 100 unique seeds per run, and no faulty/illegal/leaking rows. Fixed 20-seed replay is implemented twice in the focused test (`tools/simulation/tests/determinism.test.ts:29`); archived full workloads are audited without another matrix execution (`:167`).
- ✅ Versions, source/catalog/deck/seed inputs and deterministic initial/final hashes are recorded (`tools/simulation/run.ts:68`, `:317`, `:542`, `:549`); mixed identities and baseline/stress aggregation are rejected. CLI publication is exclusive and only tolerates identical existing bytes (`:618`). The controller separately verified current source identities and artifact SHA-256s; this review did not repeat those checks.
- ✅ Four synthetic stress scenarios exercise full board, late fatigue, response movement/S_E_FS, and poison/armor (`tools/simulation/run.ts:209`; `tools/simulation/tests/determinism.test.ts:64`). Their deliberate state injections and non-baseline interpretation are disclosed (`docs/implementation/balance/core-v1/README.md:111`).
- ✅ Human instructions and forms remain blank, anonymous, and explicitly awaiting external input (`docs/implementation/balance/core-v1/playtest-vi.md:3`, `:17`, `:47`). CPU time is not presented as measured human duration (`README.md:132`).
- ⚠️ The zero-safety numbers are bounded observations. The three invalid probes all run at setup and primarily demonstrate wrong-phase rejection (`tools/simulation/run.ts:429`). Projection checks validate schema/audience, side, versions, and hidden-location field shape (`:255`, `:357`, `:492`); they do not establish noninterference against secret-dependent legal actions or all possible semantic leaks. `README.md:50` states this accurately. Broader unchanged engine/security suites are outside this review and were not revalidated.

## Strengths

- Outcome denominators retain draws, faulty matches are separated from completed outcome rates, hero samples are explicit, and descriptive uncertainty is not sold as independent human evidence (`tools/simulation/metrics.ts:39`, `:62`, `:97`; `README.md:29`, `:46`).
- Event-order occupancy tracking accounts for movement, creation, destruction and turn changes before recording location reveal occupancy (`tools/simulation/run.ts:368`). Independent row aggregation confirms lane-3 occupancy 91/900 with 104 units and lane-5 occupancy 112/900 with 113 units. Location outcome associations are clearly not counterfactual causal estimates (`README.md:109`).
- Diagnostic replay validates original initial and final state hashes before publishing (`tools/simulation/tests/diagnose.ts:72`, `:194`). Independent artifact comparison confirms nine final hashes match baseline and all diagnostic phase summaries equal their trace aggregates. The energy counterfactual changes only own energy and evaluates through player projection (`:134`). Its inability to prove an improved line is disclosed (`README.md:86`).
- The negative utility scores and real-engine combat differentials substantiate a prescribed-policy limitation; they do not prove that a replacement bot will meet balance targets (`tools/simulation/tests/diagnose.ts:204`; `README.md:90`, `:132`). The controller decision to preserve immutable v1 is supported as a bounded task disposition, not as acceptance of the resulting gameplay balance.
- Focused tests use real engine/bot behavior, explicit hand-derived aggregate expectations, malformed private fields, an opponent-owned event, and deterministic exhaustion (`tools/simulation/tests/determinism.test.ts:83`, `:134`).

## Issues

### Critical (Must Fix)

- None found in the reviewed technical change. Open release gates remain as stated above.

### Important (Should Fix)

- No blocking implementation defect identified within Task 17. **Material unresolved acceptance findings remain:** BALANCE-CORE-01, BALANCE-UTILITY-01, BALANCE-PHASE-01, HUMAN-PLAYTEST-01 and PERF-P95-01 (`docs/implementation/balance/core-v1/README.md:126`). Their explicit retention is required; this review does not silently downgrade or close them.

### Minor (Nice to Have)

1. **Diagnostic utility fixture dependencies are not covered by its recorded hashes.** `tools/simulation/tests/diagnose.ts:27` imports `packages/game-engine/tests/helpers.js`, while its `sourceHash` at `:337` covers only the diagnostic file and `currentVersions()` hashes engine `src`, excluding tests (`tools/simulation/run.ts:58`, `:74`). A helper-only edit could change controlled utility outcomes without changing the diagnostic identities. Pin the helper source, or record a complete diagnostic dependency identity when creating a future diagnostic artifact. This does not invalidate the current committed artifact or the baseline/stress identities.
2. **The bounded utility combat loop does not assert successful completion.** `tools/simulation/tests/diagnose.ts:257` stops after 200 iterations or a lifecycle change and returns a result unconditionally at `:263`. A future engine stall/fault could therefore be serialized as a valid-looking utility differential instead of failing the diagnostic. Assert either an expected terminal outcome or the intended TURN_START boundary, and reject FAULTED/exhaustion. The five stored probes currently show the documented meaningful differentials; no such failure is present in this evidence.

## Verification and scope

- Read all code/documentation hunks once from `review-2412138..eee7589.diff`; parsed the three generated JSON artifacts structurally with bounded output rather than dumping per-match JSON. No changed-source reread or hunk-cut exception was needed.
- Named outside-diff risk: the report might misclassify an implementation scoring error as an immutable-policy limitation. Checked `packages/bot/src/evaluate.ts`, its public export and `packages/bot/src/policy.ts` against `docs/DECKS.md:18`. Coefficients, side-relative evaluation and positive gate support the stated limitation; no global GOOD bonus or reservation requirement was found in these checked sources. This was not a whole-engine audit.
- Ran read-only Python assertions, exit 0: exact matrix×seed coverage; all recorded fault/safety counters; per-row sums for fatigue/poison/response movement/projections/probes; all merged action/card/power/phase counts; hero/matchup wins and draw denominators; turn means/threshold rates; block/power totals; location exposure/occupancy counts. Results reproduce baseline 720 GOOD / 158 EVIL / 22 draws and stress 282 GOOD / 113 EVIL / 5 draws.
- Ran read-only diagnostic assertions, exit 0: nine trace final hashes match their baseline rows; phase summaries recompute exactly; 28 blocked-positive phases are all before turn 6; stored utility differentials agree with the README. EVIL_TRICKS spent 73 and retained 308 energy over 96 phases, supporting the caution that early budget pressure is not the sole explanation.
- Parsed `/tmp/oathfront-t17-baseline.log` and `/tmp/oathfront-t17-stress.log`, exit 0: their reported metrics exactly equal the committed artifacts. The implementer reports final 7/7 focused tests and clean type/lint checks; their original console transcripts were not among the available `/tmp/oathfront-t17-*.log` files, so those historical exits were not independently reconstructed. Assertions were inspected; no suite was rerun to regenerate missing historical logs.
- Did not run matrices, simulations, diagnostics, build, whole-workspace suites, servers, DB operations or native git commands. Parent-owned milestones, controller decisions and later evidence publication are outside the reviewed commit range. Only this requested review report was written.

## Assessment

**Task quality: Approved for the amended technical runner/report scope, with two minor hardening suggestions.**

The implementation produces coherent deterministic evidence, and independent artifact calculations support its central claims. Full Task 17/M5 acceptance remains open because the material balance findings, real human playtests and inherited performance gate are unresolved; no release or whole-branch approval is implied.
