# Observed CI browser correction

Status: DONE. Commit `d43516ac965aa98d54cd5f39649e9fe139cabba8` — `test: scope injected network faults and await match readiness`.
Baseline `f06b10cf4cf8c87536be367381cf633ff39ec5ba`. Five test files changed; application/runtime/build/dependencies unchanged. Controller owns push, public documentation and GitHub follow-up. No push performed.

## Observed failure and root causes

GitHub run39527305880 started successfully after the tsx declaration. Its actual browser result remains74passed/4failed/2skipped in6.5minutes; no local focused result is presented as a replacement full CI pass. Original logs ci-second-run-failed.log and ci-second-run-full.log remain separate. Selected browser-evidence artifact downloaded read-only with `gh run download 39527305880 --name browser-evidence --dir .../ci-browser-evidence/remote`; exit0. The full artifact pack remains ignored and is not proposed for publication.

1. **Paused session expiry is injected before initial match recovery finishes.** The modal becomes visible after the first match GET, but useMatchStore immediately performs a second recovery GET. Expiring the account session at modal visibility can make that recovery return401. Its recoveryFailed state correctly disables Resume. The old test then waited for Resume rather than exercising its intended command-time session expiry. Controlled RED held the second GET, observed the modal, expired the session, then released the GET: exact request sequence200, events200, recovery401, poll401; Resume remained disabled. It also exposed an unconfigured-provider503 because the test's token interception had not yet been installed. No force click or timeout increase resolves this setup error.

   The corrected test keeps the controlled delayed initial recovery, releases it and explicitly waits for Resume to be enabled **before** expiring the session. It then performs the original401/login/renewal/exact-identical-RESUME-retry assertions. No runtime auth behavior changed.

2. **KEEP/USE deliberate offline transition was omitted by a title-based error heuristic.** The first four-case local diagnostic run reproduced USE with9ERR_INTERNET_DISCONNECTED errors. Detailed events identify the pending cutouts atlas,7terrain strips, and the current match's `/events?afterSeq=0&throughSeq=9` request; each actual requestfailed event corresponds to a same-URL console error during the deliberate context.setOffline window. The remote artifact records the same error text but no URLs and incorrectly labels expectedNetworkInjection=false. KEEP has the same injection but timing determines whether any resource is still loading (zero errors in the local GREEN; both variants failed on CI).

   Both tests now declare an explicit same-origin ERR_INTERNET_DISCONNECTED scope immediately before going offline and close it after successful reconnect/snapshot. Same-origin coverage is intentional because context offline disconnects all in-flight page resources, including artwork. Only actually observed matching request failures authorize matching console records; unrelated page/console errors remain failures. No resource/network error is ignored merely because the title says offline.

3. **The expiry collector allowed only the snapshot endpoint, while an in-flight event-log GET can also return410.** The remote artifact contains2raw410errors but did not retain URLs; the initial local run only produced the expected snapshot410. Controlled reproduction held a real terminal match log request across the deliberate checkpoint deletion: `/api/v1/matches/3a780f19-7bf9-4879-a3e1-2f01b4b537c6/events?afterSeq=0&throughSeq=131` returned410, then the snapshot endpoint returned410. This reproduced the old exact-snapshot-only collector failure. The endpoint is proven by the controlled local trace; the original CI URL was not captured, so it is not retroactively claimed as directly observed there.

   The full-match test now retains this deterministic in-flight request scenario, asserts its real410response, and declares410only for that match's exact snapshot and event-log paths during deliberate expiry. It closes both scopes before rematch. The duplicate local string collector was removed in favor of the shared evidence collector; all raw errors are still saved.

## Collector design and self-review

Recovery evidence now records every console/page error with URL/time and every failed request/HTTP error with URL/status/error/time. Explicit scope rules match resource plus exact status/error. A browser-generated console message is expected only when it matches an actual expected network failure; each observed failure permits at most one matching console record. Page errors never qualify. Delayed console delivery remains attributable after scope close because the network failure was already observed inside the scope. Scope timing uses observed events, not arbitrary sleeps or broad status suppression.

Removed title guessing from recovery-fixtures entirely. Existing deliberate lost-response, failed-snapshot and log-expiry tests received explicit declarations at their injection sites so their established behavior remains supported. Route abort/503 injections are one-shot: after the actual matching network failure the rule removes itself. The current-match expiry scopes are bounded by the test's expiry phase. No new production helper or application logging was introduced.

The new browser negative-control test uses real routed responses/console events: accepts a declared410, rejects503on the same URL,410on another URL,410outside the scope, an uncorrelated fake network console string, and an unrelated page exception. It also accepts exactly one failure from a one-shot scope and rejects a subsequent identical failure. Final evidence:8raw errors,2expected,6unexpected asserted as the correct negative result; no errors disappear from the record.

## Verification and exact commands

All Playwright commands below use the same existing production artifact with `OATHFRONT_E2E_PRODUCTION=1 OATHFRONT_E2E_PORT=3200`, `NO_COLOR` removed, and a distinct `OATHFRONT_EVIDENCE_ROOT` inside ci-browser-evidence. No builds or simultaneous DB-resetting/browser suites. Test fixture uses only oathfront_verification_test and API3101/UI3200/internal3201.

| Command | Exit | Result/evidence |
| --- | --- | --- |
| pnpm exec playwright test --grep 'expired paused session\|block reload and reconnect\|complete GOOD match' | 1 | baseline.log:3passed/1failed30.8s; diagnostic-only collector instrumentation, no fix |
| pnpm exec playwright test --grep 'expired paused session\|complete GOOD match' | 1 | controlled-red.log:2failed; controlled initial-recovery and delayed-event-log proofs before correction |
| pnpm exec playwright test --grep 'expired paused session\|block reload and reconnect\|complete GOOD match\|explicit network evidence' | 0 | green.log:5/5passed28.7s; all4original failures plus initial negative controls |
| pnpm exec playwright test --grep 'explicit network evidence\|lost block receipt\|failed snapshot recovery' | 0 | collector-green.log:4/4passed10.9s; final one-shot tightening, lost receipt, normal/paused503recovery and strengthened negative controls |
| pnpm exec tsc --noEmit | 2 then0 | typecheck.log found exactOptionalPropertyTypes mismatch for raw request.failure()?.errorText; type annotation corrected, typecheck-corrected.log exit0 |
| pnpm exec eslint tests/e2e/auth-claim.spec.ts tests/e2e/block-recovery.spec.ts tests/e2e/full-match.spec.ts tests/e2e/recovery-fixtures.ts tests/e2e/network-evidence.spec.ts | 0 | lint.log and final lint-final.log |
| git diff --check / git diff --cached --check | 0 | exact test-only staged diff inspected before commit |

Final one-shot/type-only changes occurred after the5-case GREEN. The4additional focused cases cover the one-shot paths; no need to repeat unchanged auth/offline/expiry journeys. These are focused checks, not a full local suite. Initial and controlled RED outputs remain retained and are not overwritten with GREEN.

## Artifact boundary

Unchanged Next BUILD_ID `V0isFAUtbXD_Bsuxb73A6`.
API app.mjs SHA256 `dc643f488ccf6a8d52bdc780020d45bc814aea05ba7e197f5d2cfdeab7a076bf`.
Standalone server.js SHA256 `0b1c9b22e13d1e1b76e3592fe0748b98b093af94be9252f7e9c896a33163bdcc`.
All final changed test hashes are in [source identity](evidence/source-identity.json). No new frame-time, physical-device, cloud or provider acceptance claim. Existing release holds remain untouched.

## Selected publication set

Publish these small records with paths preserved/adapted; do not duplicate remote/ or the full generated evidence trees:

- [Baseline3pass/1fail](evidence/baseline.log), [controlled RED](evidence/controlled-red.log), [five-case GREEN](evidence/green.log), [final collector GREEN](evidence/collector-green.log).
- [Offline request/console RED](evidence/captures/baseline-offline-use-red.json), [controlled log-expiry RED](evidence/captures/controlled-log-expiry-red.json), [auth RED console](evidence/captures/auth-red-console.json).
- [Offline GREEN](evidence/captures/green-offline-use.json):9actual failures/9expected/0unexpected. [Expiry GREEN](evidence/captures/green-log-expiry.json):2actual410/2expected/0unexpected. [Auth GREEN](evidence/captures/auth-green-console.json).
- [Negative controls](evidence/captures/negative-controls.json): all8raw messages retained, correct2expected/6rejected. [Source/artifact identity](evidence/source-identity.json).
- [Block desktop](evidence/captures/block-desktop.png), [successful rematch](evidence/captures/good-rematch.png).
- [Corrected typecheck](evidence/typecheck-corrected.log), [final lint](evidence/lint-final.log). Original typecheck failure remains available locally as typecheck.log.

No secrets, cookies, JWTs, raw DB credentials or private checkpoints are included in the selected logs; resource URLs contain only ephemeral local test match IDs and event cursors.

## Files, scope and remaining boundaries

Changed tests/e2e/auth-claim.spec.ts, block-recovery.spec.ts, full-match.spec.ts, recovery-fixtures.ts; added network-evidence.spec.ts. No dependency, workflow, application, asset, public documentation or previous report edits by this worker. Parent-owned controller-decisions and public ci-browser evidence files were preserved unstaged. Native commit authorized; no push/PR/deploy, subagents, cloud queries/migrations or destructive cleanup. User3000/3001/interactiveDB, unrelated3100 and existing3300Docker stack untouched.

Actual next GitHub result remains pending controller review/push. Local focused GREEN does not waive the prior full CI failure or product acceptance holds.
