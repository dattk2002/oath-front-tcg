- **Diagnostic utility fixture dependencies are not covered by its recorded hashes** — **ADDRESSED**. `tools/simulation/tests/diagnose.ts:335` includes the diagnostic source, new guard source, `packages/game-engine/tests/helpers.ts`, and its transitive `tests/fixtures/match-fixture.ts` in a sorted per-file SHA-256 manifest; `:347` additionally hashes the evaluated fixture config and seed. `:360` hashes that complete diagnostic manifest alongside retained shared production identities and baseline input identity (`:363`). The helper/fixture import graph introduces no remaining unpinned runtime source outside those shared identities. `tools/simulation/tests/diagnostic-guards.ts:11` hashes file contents, and `tools/simulation/tests/diagnostic-guards.test.ts:53` checks sensitivity to both helper and transitive fixture edits. V2 records these identities at `docs/implementation/balance/core-v1/diagnostic-subset-v2.json:4`.
- **The bounded utility combat loop does not assert successful completion** — **ADDRESSED**. `tools/simulation/tests/diagnose.ts:266` now calls `advanceProbeToBoundary` before serializing results. `tools/simulation/tests/diagnostic-guards.ts:29` validates the root budget; `:40` rejects FAULTED; `:42` accepts only ACTIVE/TURN_START with null outcome; `:48` accepts only COMPLETED/HERO_DEFEATED; `:53` rejects exhausted ACTIVE states and `:55` rejects other lifecycle/terminal exits. The focused tests cover real-engine exhaustion, FAULTED, normal TURN_START, lethal HERO_DEFEATED completion, and unexpected PAUSED exit (`tools/simulation/tests/diagnostic-guards.test.ts:22`, `:28`, `:34`, `:47`).

### New Breakage in the Fix Diff

- **None found.** The fix package changes only diagnostic/test code, the new v2 artifact, and its README explanation. The original three reports and production runner/engine/bot/content remain outside the fix. `docs/implementation/balance/core-v1/README.md:72` retains the original v1 link and discloses its narrower provenance.

### Checks

- Read the supplied `eee75892006bc82bbffc4d0e08283f1321b15a2c..f78e647d78977b856ef6953f588c274630cc8f16` package once; inspected the generated artifact with bounded structural output. Reviewed only the two findings, touched source, helper/fixture dependencies needed to resolve provenance, and retained evidence.
- Inspected actual command/stdout/EXIT_CODE transcripts in `artifacts/task17-fix-round1/`: RED exit1 (five assertion failures for absent functions), GREEN exit0 (5/5, 274ms), scoped typecheck/lint exit0 without diagnostics, and diagnostic exit0 with nine matching final hashes and five utility probes. Historical original 7/7 stdout remains unavailable and was neither reconstructed nor regenerated.
- Ran read-only Python assertions, exit0: every original v1 field except the intentionally renewed sourceHash equals v2, including all nine traces, phase summary, five utility differentials, baseline identity and shared versions; exactly three new provenance fields were added. The actual diagnostic stdout payload equals the corresponding v2 fields.
- Inspected `task-17-fix1-controller-verification.json`: controller verified four artifact hashes, four dependency file hashes, all three original artifacts unchanged, and unchanged traces/phase metrics/utility outcomes. Inspected the matching artifact-readback transcript, exit0; did not duplicate the controller's hash audit.
- No tests, simulations, matrices, build, servers, DB actions, Git operations or subagents were run. Only this requested re-review report was written; parent-owned dirty files and evidence publication were excluded.

### Out-of-Scope Observations

- **None newly identified.** Existing BALANCE-CORE-01, BALANCE-UTILITY-01 and BALANCE-PHASE-01 remain OPEN; real human 5×2 playtests remain awaiting external input; PERF-P95-01 remains FAILED/OPEN. This scoped hardening review supplies no new balance, human or performance acceptance evidence.

### Verdict

- **Fix round: All findings addressed, no new Critical/Important breakage.** Approved for these two diagnostic hardenings within the amended technical runner/report scope. Full Task17/M5, whole-branch and production acceptance remain open.
