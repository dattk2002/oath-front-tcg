# CI guest-bootstrap quota follow-up — 2026-10-21

## Observed failure

Automatic Verify run `39589791430` on `164c4f534d4e2b7a30367530e187cf38656e76d0` passed contracts, typecheck, lint, build, and 80 Vitest files / 655 tests. Its production browser stage ran 88 cases with **76 passed, 10 failed, 2 skipped**. All 10 failures were the same `Expected: 201 / Received: 429` at `tests/e2e/recovery-fixtures.ts:29`, before gameplay, in the five `full-match.spec.ts` and five `input-parity.spec.ts` cases. The original CI log is retained in the ignored SDD workspace; this record does not relabel that run as passing.

## Cause and change

`GUEST_BOOTSTRAP` is a persistent 20-request / 60-second bucket keyed by the trusted ingress IP hash. Production browser tests use one worker and one loopback ingress, so independent match fixtures accumulate in that same bucket. The fixture generated a fresh guest identity on each call, but identity does not partition the guest quota.

The guarded browser fixture now deletes only `rate_limit_windows` rows with `scope='GUEST_BOOTSTRAP'` before it creates a match. `ownerPool()` rejects any target except an explicitly enabled loopback `*_test` database. The browser harness runs serially against `oathfront_verification_test`; no production API limiter, proxy boundary, security setting, or gameplay source changed.

The later bounded 20-match CI load starts a separate API process with a fresh `SESSION_SECRET`, so its HMAC rate-limit key cannot collide with the browser process's key. It sends exactly 20 guest requests, the allowed bound. Its separate `COMMAND` and `MATCH_CREATE` scopes are untouched by the browser fixture reset. This was checked from the load source without rerunning the load gate.

## Reproduction and checks

Using the existing production standalone build (API port 3121), the new browser regression created a match, cleared its cookie, set the persisted guest bucket count to 20, then attempted another match. **RED:** `create(page)` returned 429 at the same assertion as CI. After the fixture change, the test first confirmed a raw guest request still returns **429** at saturation, then confirmed the next fixture-created match returns **201**: **GREEN, 1/1**.

- Covering production browser run: `full-match.spec.ts` and `input-parity.spec.ts`, **10/10 passed** (1.1 minutes).
- API quota/security test: `apps/api/tests/proxy-ip.test.ts`, **2/2 passed**; it verifies spoofed forwarded headers do not partition the guest bound and two API instances allow 20 requests then reject two with 429.
- Focused ESLint on the two changed test files: passed. `pnpm exec tsc --noEmit`: passed. `git diff --check`: passed.

No full 88-case browser rerun, unit suite, build, manual CI dispatch, push, deployment, or interactive database operation was performed for this test-only change. The final automatic CI outcome requires the controller's reviewed push.
