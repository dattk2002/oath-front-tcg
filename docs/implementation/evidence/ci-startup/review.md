# CI startup correction review

Reviewed baseline `e47b33f73ffcb027071a7cf0ab38a17aec12ecba` → HEAD `5cc848d551eda63621aed5a0811e65c36baebf16` against `ci-startup-brief.md`, `ci-startup-report.md`, the supplied review diff, retained reproduction/smoke evidence, and relevant existing fixture/workflow configuration. Scope is solely the newly observed startup correction.

## Verdict

**Spec compliance: PASS. Quality: APPROVE.** No critical, high, medium, or low severity findings in this change. No revision required before the controller's authorized push.

The actual commit diff matches the supplied two-file/four-line change: root devDependency `tsx: 4.23.15` and its root lock importer. Existing package resolution, integrity, dependency snapshot, runtime code, workflow and fixture remain unchanged. Root ownership fits both the API fixture invocation and root load command. No broader dependency upgrade or architecture change was introduced.

## Evidence checked

- Git HEAD matches the requested commit; initial `git status --short` was empty. Actual commit diff and `git diff --check BASE HEAD` were inspected; the latter exited 0.
- Original `ci-browser-failure.log` establishes early webServer exit 1, not the missing-bin cause by itself. The isolated baseline clean frozen install exited 0; root version probe and exact API fixture command each exited 1 with `Command "tsx" not found`, before source loading. The corrected second clean install exited 0 and both root/API version probes exited 0 with tsx 4.23.15 / Node 24.20.0. This provides a focused regression reproduction without an artificial manifest unit test.
- Independently compared all 10 retained isolated manifests/config files in each temporary workspace byte-for-byte with their respective baseline/HEAD Git versions: zero mismatches. Reproducer code creates fresh temporary directories, copies manifests, restricts PATH, and removes NODE_PATH/PNPM_HOME. Inspected dependency symlinks in both trees: none resolve into the shared checkout. Baseline root tsx executable is absent; fixed executable exists. Reusing package store bytes does not invalidate clean executable-link generation.
- Retained npm metadata identifies version 4.23.15, MIT, Node >=18, and publication `2026-09-20T07:22:17.792Z`; retained smoke timestamp places it 30 days 17:58 after publication. Integrity matches the unchanged lock package entry. This checks the retained metadata claim; no new registry request was performed.
- Production smoke log starts the exact configured API fixture through tsx, records fixture readiness and HTTP 200, then Next standalone/UI readiness 200. One selected browser case passes in 9.7s; both fixture processes terminate. Network artifact records revision 5 / COMBAT, expected unauthenticated responses separately, and zero unexpected console errors. Early ECONNREFUSED/502 entries are startup probes before readiness, consistent with the report.
- Recomputed all 18 retained evidence SHA256 values: zero mismatches. Independently matched original and isolated-copy API app and standalone server hashes with smoke identity; original Next BUILD_ID also matches. The smoke runner copies existing artifacts and invokes Playwright directly, without rebuilding. Copying prepared standalone runtime content is appropriate for this startup check; clean installed tooling supplies the previously absent executable.

## Boundaries

Review used read-only Git/filesystem inspection and digest comparisons. No install, test, browser, build, load, DB or cloud operation was repeated; no checkout/index/HEAD change, helper agent, push, or external mutation occurred. Only this review report was written.

The retained evidence supports the local clean-startup correction. It does not establish that remote GitHub Verify has passed after this commit. Controller must observe the automatic post-push run; broader acceptance/performance/cloud holds remain outside this review.
