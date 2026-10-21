# Final fix report

Status: DONE. Base `e0f9f31474440a8979f25a1f5a605dc43fe58c69`; native commit on existing `main`: `8be9466a00f683d86b28ad16e07e4c7cea4e1397` (`fix(load): default omitted concurrency and reject invalid values`). No push. Tracked working tree is clean after commit.

## Exact change and cause

M1: absent `--concurrency` previously evaluated `argv[indexOf(flag) + 1]` as `argv[0]`, converting the executable path to NaN. Added the small side-effect-free `tools/load/concurrency.ts` boundary; absence returns 20, while an explicitly supplied option must yield an integer from 1 through 20 or throw `--concurrency requires an integer from 1 to 20`. `tools/load/pve.ts` now calls it before database URL handling. No dependency or general CLI framework was added. Existing numeric conversion semantics are retained for accepted integer values.

Added `tools/load/tests/concurrency.test.ts` and one test-discovery include in `vitest.config.ts`, so the regression remains discoverable in the normal suite. The commit contains these four parser/integration/test files only; public docs and published evidence were not modified.

## Actual focused verification

Commands ran from the repository root with Node v24.20.0 and pnpm 11.25.0. Log paths below are relative to this report's directory and contain actual captured stdout/stderr.

| Stage | Command | Exit | Result | Log |
| --- | --- | --- | --- | --- |
| RED | `pnpm exec vitest run tools/load/tests/concurrency.test.ts` | 1 | 15 tests: 12 failed, 3 passed; 1 file failed | `final-fix-evidence/red.log` |
| GREEN | `pnpm exec vitest run tools/load/tests/concurrency.test.ts` | 0 | 15 tests passed; 1 file passed | `final-fix-evidence/green.log` |
| Scoped TypeScript | `pnpm exec tsc -p tools/load/tsconfig.json` | 0 | No diagnostics | `final-fix-evidence/typecheck.log` |
| Changed-file lint | `pnpm exec eslint tools/load/pve.ts tools/load/concurrency.ts tools/load/tests/concurrency.test.ts vitest.config.ts` | 0 | No diagnostics | `final-fix-evidence/lint.log` |

The RED run used the existing parser expression extracted unchanged into the isolated boundary, before changing its behavior. Its omitted-option assertion received NaN instead of 20, and explicit missing/invalid cases failed because the old expression did not throw. Valid explicit 1, 7 and 20 already passed. GREEN covers omission, those valid integers, explicit missing value, empty/whitespace, text, next option, NaN, Infinity, fraction, zero, negative and over-limit values. Tests import only the pure parser, with no runner, server or DB import. The invalid-value validation moved into this boundary; the existing runner guard remains intact.

`git diff --check` and `git diff --cached --check` also exited 0 during precommit review. Empty static log files accurately reflect successful tools with no output.

## Unchanged runtime/artifact boundary

The database isolation predicate, child process configuration, number of commands per match, game inputs, result fields and performance targets are unchanged. The explicit `--concurrency 20` path still returns 20. No apps, packages, dependencies, lockfiles, compiled artifacts, historical evidence or public documentation changed. No load run, server, DB, browser, build, full suite, cloud operation or reauthentication was launched. Historical 603-test, corrected 14/14-browser, Docker and load evidence remain historical for their exact prior source/artifacts; none is claimed as rerun evidence for this commit.

M2 and M3 remain the controller's approved scoped SDK peer exception and nonblocking Vercel entrypoint warning debt respectively. No packages were upgraded and no shared factory/hosting topology was changed.

## Concerns

No new concern identified within this parser-only scope. Full runtime and product/release acceptance remain outside this fix's verification boundary. Controller owns the one scoped re-review and publication of documentation/evidence.
