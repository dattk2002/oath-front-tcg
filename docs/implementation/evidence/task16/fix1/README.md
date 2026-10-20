# Task 16 review fix 1

Base: `f9272640f042d0bea2ec7771cc3b12e1d3743a5d`. Fix build: `mPRxwzNVtnRYVPLtxR3DM`.

- Restore hand-control gaps to8px; ten cards retain44×44px minimum targets and fit all five viewport sizes.
- Keep each unit status exactly once in its complete accessible name. The redundant visible, abbreviated status fragment is aria-hidden; visible content stays unchanged.
- Assert collected browser errors in normal responsive/accessibility cases. Only the exact `Failed to load resource: net::ERR_FAILED` console message at an intentionally aborted atlas.webp URL is allowed in the renderer-failure case. Page exceptions are never filtered. A sentinel regression verifies unexpected console and page errors remain collected.

The first status fixture incorrectly used armor2 (schema maximum1); that fixture failure is retained separately from the valid duplicate-name RED. The corrected fixture includes four statuses, so the exact accessible-name assertion also proves statuses beyond the visible three-item summary remain available.

## Verification

- Development covering:9/9 passed,35.6s. Five sizes:1440×900,1366×768,1280×720,1024×768,1024×640. Assertions cover adjacent-card gaps≥8px, targets≥44×44px, viewport bounds, status name, settings keyboard focus, axe battle/settings/reflow, collector sentinels, empty/failure/pending states.
- One production web build, API_ORIGIN=http://127.0.0.1:3101, exit0. No API rebuild.
- First production covering:9passed/1failed,25.8s. Real tutorial transitions/layout passed, but its new error assertion found two expected401s from unauthenticated homepage bootstrap.
- Test-only correction creates a real guest through the public guest endpoint before collecting errors in tutorial/contrast cases. No401 whitelist. Targeted tutorial+contrast rerun:2/2 passed,13.0s, same build. This is **not** a fresh10/10 run.
- Root/web typecheck, final focused root tsc/lint and whitespace checks passed. Development and production1024×640 screenshots inspected. No Firefox, performance or full engine/API suite repeated.

## Performance and artifact boundary

**PERF-P95-01 stays FAILED/OPEN.** The three60-second measurements in the parent task16 directory belong to preceding artifact `ZipcVWCZHw8l3sc-rmia3`, with p95=21.4/21.7/22.5ms against20ms. This fix artifact was not benchmarked. Original performance data, BuildID, artifact/evidence manifests and screenshots were preserved. This directory records only the review-fix build and covering checks.

Runtime changes are one CSS gap value and one ARIA attribute. Guest setup, error assertions and evidence routing are test-only. The later guest setup does not require rebuilding unchanged runtime. Minor4 NO_COLOR/FORCE_COLOR warnings remain assigned to Task18; manual/device/browser acceptance remains pending.

See `manifest.json` for source/build hashes and exact commands, and `logs/` for retained outputs. The complete fix report is appended to the ignored task-16-report.md in the SDD workspace.

Committed log copies normalize trailing whitespace/CR progress output; original raw logs remain in the ignored task-16-evidence/fix1 directory.
