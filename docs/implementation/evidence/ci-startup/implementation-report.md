# CI startup correction

Status: DONE. Commit `5cc848d551eda63621aed5a0811e65c36baebf16` — `fix(ci): declare tsx for clean workspace startup`.
Baseline `e47b33f73ffcb027071a7cf0ab38a17aec12ecba`. Main/tree were clean at start. Only package.json and pnpm-lock.yaml changed, four added lines. No push performed; controller owns scoped review/push and automatic GitHub Verify observation.

## Root cause

GitHub run39525499520 passed frozen install, setup, contracts/typecheck/lint, full unit/integration/restore and production build, but Browser integration exited before any test. The retained original ci-browser-failure.log contains only the Playwright webServer exit1; it does not itself identify a missing binary.

A fresh isolated workspace reproduced the missing binary using the exact checked-in manifests and frozen lock. Neither root nor API declared tsx directly. A transitive tsx4.23.15 lock entry does not create root node_modules/.bin/tsx on a clean install. This checkout retained such a bin from prior development and therefore hid the omission. The API fixture command and subsequent root load command both rely on that undeclared tool.

The reproduction excludes shared checkout node_modules: manifests copied into new /tmp directories, no source or dependency symlinks to this checkout, PATH restricted to the Node24 bin plus system bins, NODE_PATH/PNPM_HOME removed. Installer reused package store bytes normally; node_modules and executable links were new. No shared node_modules was renamed, deleted or reinstalled. The exact API startup command failed on command resolution before attempting to load its source, proving the bin issue independently of DB/app behavior.

## RED evidence before edit

Workspace `/tmp/oathfront-ci-startup-K4OY7u`. Script `ci-startup-evidence/reproduce.mjs` captures actual output/exits:

| Command | Exit | Evidence/result |
| --- | --- | --- |
| pnpm install --frozen-lockfile | 0 | clean-install.log;16.6s, no root tsx bin |
| pnpm exec tsx --version | 1 | clean-root-tsx.log; Command "tsx" not found |
| pnpm --filter @oathfront/api exec tsx tests/browser-server.mjs | 1 | clean-api-start.log; ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL, Command "tsx" not found |

This is the focused failing integration reproduction; no implementation-mirroring unit test was added for a manifest declaration.

## Smallest fix and GREEN

Root devDependencies now pins tsx4.23.15, and the root lock importer references its existing4.23.15 package/snapshot. No package versions, resolutions, app code, CI routing, security settings or production dependencies changed. Root is the correct owner because both workspace API fixture and root load/simulation tools use tsx. Its availability to the API workspace is verified rather than assumed. The existing lock entry was reused directly; fresh frozen install validates manifest/lock consistency.

Primary npm registry metadata in tsx-metadata.json: published2026-09-20T07:22:17.792Z, Node>=18.0.0, MIT; compatible with Node24.20.0 and over30days old on2026-10-21. Existing locked integrity matched metadata; no broad upgrade or new release-age exception.

A second **new** workspace `/tmp/oathfront-ci-startup-FsdGwh` with corrected manifests/lock passed:

| Command | Exit | Evidence/result |
| --- | --- | --- |
| pnpm install --frozen-lockfile | 0 | fixed-install.log;4.4s, root tsx bin exists |
| pnpm exec tsx --version | 0 | fixed-root-tsx.log;tsx4.23.15/Node24.20.0 |
| pnpm --filter @oathfront/api exec tsx --version | 0 | fixed-api-tsx.log;same versions |

`verify-clean.mjs`, fixed.json and the logs preserve this exact clean-tree verification. There are no new peer-version upgrades; prior SDK compatibility exceptions remain historical.

## One covering production startup/browser smoke

Used the second clean dependency tree. Copied only required tracked app/package/test source plus existing API dist and prepared Next standalone tree, preserving relative artifact symlinks. No secret env file copied: existing ignored local test env loaded into the runner process and passed in memory. Database target validated as oathfront_verification_test. The normal fixture prepares/resets only that disposable test DB; interactive database untouched.

Command from the clean workspace:

```sh
OATHFRONT_E2E_PRODUCTION=1 OATHFRONT_E2E_PORT=3200 DEBUG=pw:webserver pnpm exec playwright test tests/e2e/match-foundation.spec.ts --grep 'guest preset mulligan UNIT and pass as GOOD'
```

Exit0,1/1passed in9.7s. Actual configured `pnpm --filter @oathfront/api exec tsx tests/browser-server.mjs` emitted Browser API fixture ready and readiness200; UI wrapper started existing Next on3201 and UI3200became200. Guest preset→mulligan→UNIT→pass→reload reached revision5/COMBAT through real cookie/CSRF/API/PostgreSQL. `browser/task9/good-network.json` records unexpectedConsoleErrors[] and expected unauthenticated401responses separately. Playwright's debug output includes expected pre-start ECONNREFUSED and a transient UI502 while Next starts, then200; these are availability probes, not failed browser assertions. Both fixture servers terminated normally afterward.

Exact log production-smoke.log; command/time/exit/source identity production-smoke.json; reproducer smoke.mjs. No full local suite, production build, load matrix,900/400simulation or hardware benchmark rerun.

Reused artifact identity (not rebuilt):

- Next BUILD_ID `V0isFAUtbXD_Bsuxb73A6`.
- API app.mjs SHA256 `dc643f488ccf6a8d52bdc780020d45bc814aea05ba7e197f5d2cfdeab7a076bf`.
- Standalone server.js SHA256 `0b1c9b22e13d1e1b76e3592fe0748b98b093af94be9252f7e9c896a33163bdcc`.

The smoke captures desktop/tablet/mobile evidence under this new ci-startup-evidence/browser path, leaving all prior Task18/final reports/evidence untouched. No UI/runtime change or fresh performance claim.

## Self-review and boundaries

Inspected exact two-file diff and staged diff; git diff --check passed. Clean frozen install is the relevant manifest/lock validation, and the one clean-tree production browser case verifies the previously failing process startup. No reason to repeat unrelated tests or builds. Root and API commands both work from a fresh dependency tree. Shared source artifacts, user3000/3001, unrelated3100, existing Docker3300/55432 and hosted DBs were not altered or stopped. Final listener inspection showed test3101/3200/3201closed and original3300/55432still present.

Actual GitHub rerun remains pending controller review/push; this report does not claim hosted CI has passed. Existing product acceptance holds and SDK peer warnings remain unchanged. No subagents, PR, deploy, registry publication, remote DB operation or destructive cleanup. Final tree clean after the authorized native commit.
